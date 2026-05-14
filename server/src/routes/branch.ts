import { Router, Response } from 'express'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { streamChat, getInterviewSystemPrompt, generateCompletion, type ChatMessage } from '../lib/openai.js'

export const branchRouter = Router()

/**
 * POST /api/branches/create
 * Create a new branch on a section
 */
branchRouter.post('/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sectionId, branchType, messages } = req.body

  if (!sectionId || !branchType || !messages?.length) {
    res.status(400).json({ error: 'sectionId, branchType, and messages are required' })
    return
  }

  const validTypes = ['refute', 'supplement', 'extend', 'example']
  if (!validTypes.includes(branchType)) {
    res.status(400).json({ error: 'Invalid branch type' })
    return
  }

  try {
    // Get the original section content for context
    const { data: section } = await supabaseAdmin
      .from('sections')
      .select('*, interviews(id, title, topic_title)')
      .eq('id', sectionId)
      .single()

    if (!section) {
      res.status(404).json({ error: 'Section not found' })
      return
    }

    // Generate a summary of the branch viewpoint
    const branchMessages: ChatMessage[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const summaryPrompt = `请用一句话（30字以内）概括以下对话中用户的核心观点：\n\n${
      branchMessages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n')
    }`

    const summary = await generateCompletion([
      { role: 'system', content: '你是一个擅长提炼观点的编辑。' },
      { role: 'user', content: summaryPrompt },
    ])

    // Generate branch content (magazine-style)
    const contentPrompt = `将以下对话整理成一段简洁的观点陈述（150-300字），保持杂志文章的可读性：\n\n${
      branchMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n\n')
    }`

    const content = await generateCompletion([
      { role: 'system', content: '你是一位杂志编辑，擅长将对话转化为精炼的观点文章。' },
      { role: 'user', content: contentPrompt },
    ])

    // Save branch to database
    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .insert({
        section_id: sectionId,
        creator_id: req.userId,
        branch_type: branchType,
        summary: summary.trim(),
        content: content.trim(),
      })
      .select(`*, profiles:creator_id (id, name, title, avatar_url)`)
      .single()

    if (error) {
      res.status(500).json({ error: 'Failed to create branch', details: error.message })
      return
    }

    // Increment branch count on the interview
    await supabaseAdmin.rpc('increment_branch_count', {
      section_id_input: sectionId,
    })

    res.json(branch)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create branch'
    res.status(500).json({ error: message })
  }
})

/**
 * POST /api/branches/chat
 * Chat within a branch context (streaming)
 */
branchRouter.post('/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sectionId, branchType, messages } = req.body

  // Get original section content for context
  const { data: section } = await supabaseAdmin
    .from('sections')
    .select('title, content, key_quote')
    .eq('id', sectionId)
    .single()

  const branchTypeLabels: Record<string, string> = {
    refute: '反驳',
    supplement: '补充',
    extend: '延伸',
    example: '提供案例',
  }

  const contextPrompt = `你正在进行一段分支对话。

原始文章章节「${section?.title}」的内容是：
"${section?.content}"

${section?.key_quote ? `核心观点: "${section.key_quote}"` : ''}

当前用户想要${branchTypeLabels[branchType] || '表达不同观点'}。请作为对话主持人，帮助用户深入表达他的观点。保持简洁（100-150字），引导用户说清楚自己的立场和论据。`

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: contextPrompt },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  // Stream response
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    let fullResponse = ''

    for await (const chunk of streamChat(fullMessages)) {
      fullResponse += chunk
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
    }

    res.write(`data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`)
    res.end()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream failed'
    res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
    res.end()
  }
})

/**
 * GET /api/branches/section/:sectionId
 * Get all branches for a section
 */
branchRouter.get('/section/:sectionId', async (req, res) => {
  const { sectionId } = req.params

  const { data, error } = await supabaseAdmin
    .from('branches')
    .select(`*, profiles:creator_id (id, name, title, avatar_url)`)
    .eq('section_id', sectionId)
    .order('likes', { ascending: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json(data)
})

/**
 * POST /api/branches/:id/like
 * Like a branch
 */
branchRouter.post('/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const { error } = await supabaseAdmin.rpc('toggle_branch_like', {
    branch_id_input: id,
    user_id_input: req.userId,
  })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true })
})
