import { Router, Response } from 'express'
import { generateArticleFromChat, type ChatMessage } from '../lib/openai.js'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { submitImageTask } from '../lib/midjourney.js'

export const articleRouter = Router()

/**
 * POST /api/articles/generate
 * Generate a magazine article from a conversation
 */
articleRouter.post('/generate', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { interviewId, messages, templateStyle } = req.body

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Messages array is required' })
    return
  }

  try {
    // Generate article using LLM
    const chatMessages: ChatMessage[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const article = await generateArticleFromChat(chatMessages, templateStyle || 'deep')

    // Generate images for each section (non-blocking)
    const imagePromises = article.sections.map(async (section) => {
      const result = await submitImageTask(section.imagePrompt)
      return { ...section, imageTaskId: result.taskId, imageUrl: result.imageUrl }
    })

    const sectionsWithImages = await Promise.all(imagePromises)

    // Save to database if interviewId provided and user is authenticated
    if (interviewId && req.userId) {
      // Update interview with generated article data
      await supabaseAdmin
        .from('interviews')
        .update({
          title: article.title,
          subtitle: article.subtitle,
          summary: article.summary,
          template_style: templateStyle || 'deep',
          status: 'generated',
        })
        .eq('id', interviewId)

      // Save sections
      for (let i = 0; i < sectionsWithImages.length; i++) {
        const section = sectionsWithImages[i]
        await supabaseAdmin.from('sections').insert({
          interview_id: interviewId,
          order_index: i,
          title: section.title,
          content: section.content,
          key_quote: section.keyQuote || null,
          image_prompt: section.imagePrompt,
          image_url: section.imageUrl || null,
          image_task_id: section.imageTaskId,
        })
      }
    }

    res.json({
      article: {
        title: article.title,
        subtitle: article.subtitle,
        summary: article.summary,
        sections: sectionsWithImages,
      }
    })
  } catch (error: any) {
    const status = error?.status || error?.response?.status
    if (status === 429) {
      res.status(429).json({ error: 'AI 服务暂时繁忙，请等待 30 秒后重试', retryable: true })
      return
    }
    const message = error instanceof Error ? error.message : 'Generation failed'
    res.status(500).json({ error: 'Article generation failed', details: message })
  }
})

/**
 * POST /api/articles/:id/publish
 * Publish a generated article
 */
articleRouter.post('/:id/publish', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('interviews')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('creator_id', req.userId)
    .select()
    .single()

  if (error) {
    res.status(404).json({ error: 'Article not found or not authorized' })
    return
  }

  res.json(data)
})

/**
 * PUT /api/articles/:id
 * Update an article's content (title, subtitle, summary, sections)
 */
articleRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { title, subtitle, summary, sections, tags, cover_gradient } = req.body

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('interviews')
    .select('id')
    .eq('id', id)
    .eq('creator_id', req.userId)
    .single()

  if (!existing) {
    res.status(404).json({ error: 'Article not found or not authorized' })
    return
  }

  // Update interview fields
  const updateFields: Record<string, unknown> = {}
  if (title !== undefined) updateFields.title = title
  if (subtitle !== undefined) updateFields.subtitle = subtitle
  if (summary !== undefined) updateFields.summary = summary
  if (tags !== undefined) updateFields.tags = tags
  if (cover_gradient !== undefined) updateFields.cover_gradient = cover_gradient

  if (Object.keys(updateFields).length > 0) {
    const { error } = await supabaseAdmin
      .from('interviews')
      .update(updateFields)
      .eq('id', id)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
  }

  // Update sections if provided
  if (sections && Array.isArray(sections)) {
    for (const section of sections) {
      if (section.id) {
        const sectionUpdate: Record<string, unknown> = {}
        if (section.title !== undefined) sectionUpdate.title = section.title
        if (section.content !== undefined) sectionUpdate.content = section.content
        if (section.key_quote !== undefined) sectionUpdate.key_quote = section.key_quote
        if (section.image_prompt !== undefined) sectionUpdate.image_prompt = section.image_prompt
        if (section.image_url !== undefined) sectionUpdate.image_url = section.image_url

        if (Object.keys(sectionUpdate).length > 0) {
          await supabaseAdmin
            .from('sections')
            .update(sectionUpdate)
            .eq('id', section.id)
            .eq('interview_id', id)
        }
      }
    }
  }

  res.json({ success: true })
})

/**
 * GET /api/articles/my-articles
 * Get current user's articles (drafts + published)
 */
articleRouter.get('/my-articles', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query

  let query = supabaseAdmin
    .from('interviews')
    .select(`
      id, title, subtitle, summary, template_style, tags,
      status, read_count, branch_count,
      created_at, published_at
    `)
    .eq('creator_id', req.userId)
    .order('created_at', { ascending: false })

  if (status && typeof status === 'string') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ articles: data || [] })
})

/**
 * GET /api/articles/:id
 * Get a published article with its sections and branches
 */
articleRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  // Fetch interview
  const { data: interview, error } = await supabaseAdmin
    .from('interviews')
    .select(`
      *,
      profiles:creator_id (id, name, title, avatar_url),
      sections (
        *,
        branches (
          *,
          profiles:creator_id (id, name, title, avatar_url)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !interview) {
    res.status(404).json({ error: 'Article not found' })
    return
  }

  // Increment read count
  await supabaseAdmin.rpc('increment_read_count', { interview_id: id })

  res.json(interview)
})

/**
 * GET /api/articles
 * List published articles (with pagination)
 */
articleRouter.get('/', async (req, res) => {
  const { page = '1', limit = '10', topic_id } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  let query = supabaseAdmin
    .from('interviews')
    .select(`
      id, title, subtitle, summary, template_style, tags,
      cover_gradient, read_count, branch_count,
      created_at, published_at,
      profiles:creator_id (id, name, title, avatar_url)
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1)

  if (topic_id) {
    query = query.eq('topic_id', topic_id)
  }

  const { data, error, count } = await query

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({
    articles: data,
    total: count,
    page: Number(page),
    limit: Number(limit),
  })
})

/**
 * POST /api/articles/publish-direct
 * Create and publish an article directly (one-step publish)
 * For cases where the article was generated without an interviewId
 */
articleRouter.post('/publish-direct', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { title, subtitle, summary, sections, templateStyle, topicTitle, tags } = req.body

  if (!title || !sections || !Array.isArray(sections)) {
    res.status(400).json({ error: 'title and sections are required' })
    return
  }

  try {
    // Ensure profile exists for this user
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', req.userId)
      .single()

    if (!existingProfile) {
      // Only create profile if it doesn't exist - use user metadata for name
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(
        req.headers.authorization!.slice(7)
      )
      await supabaseAdmin.from('profiles').insert({
        id: req.userId,
        name: authUser?.user_metadata?.name || req.userEmail?.split('@')[0] || '用户',
        email: req.userEmail,
      })
    }

    // Create interview record
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from('interviews')
      .insert({
        creator_id: req.userId,
        topic_title: topicTitle || '自由对话',
        title,
        subtitle: subtitle || '',
        summary: summary || '',
        template_style: templateStyle || 'deep',
        tags: tags || [],
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (interviewError || !interview) {
      res.status(500).json({ error: 'Failed to create article', details: interviewError?.message })
      return
    }

    // Save sections
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      await supabaseAdmin.from('sections').insert({
        interview_id: interview.id,
        order_index: i,
        title: section.title || `章节 ${i + 1}`,
        content: section.content || '',
        key_quote: section.keyQuote || null,
        image_prompt: section.imagePrompt || null,
        image_url: section.imageUrl || null,
      })
    }

    res.json({ id: interview.id, status: 'published' })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Publish failed'
    res.status(500).json({ error: message })
  }
})
