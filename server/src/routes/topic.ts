import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export const topicRouter = Router()

/**
 * GET /api/topics
 * List all topics
 */
topicRouter.get('/', async (req, res) => {
  const { category, trending } = req.query

  let query = supabaseAdmin
    .from('topics')
    .select('*', { count: 'exact' })
    .order('interview_count', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }
  if (trending === 'true') {
    query = query.eq('trending', true)
  }

  const { data, error, count } = await query

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ topics: data, total: count })
})

/**
 * POST /api/topics
 * Create a new topic
 */
topicRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { title, description, category } = req.body

  if (!title) {
    res.status(400).json({ error: 'Title is required' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('topics')
    .insert({
      title,
      description: description || '',
      category: category || '自由话题',
      creator_id: req.userId,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json(data)
})

/**
 * GET /api/topics/:id
 * Get a specific topic with its interviews
 */
topicRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const { data: topic, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !topic) {
    res.status(404).json({ error: 'Topic not found' })
    return
  }

  // Get interviews for this topic
  const { data: interviews } = await supabaseAdmin
    .from('interviews')
    .select(`
      id, title, subtitle, summary, read_count, branch_count,
      created_at, published_at,
      profiles:creator_id (id, name, title, avatar_url)
    `)
    .eq('topic_id', id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  res.json({ ...topic, interviews: interviews || [] })
})
