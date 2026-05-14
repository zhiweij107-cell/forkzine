import { Router, Response } from 'express'
import { streamChat, getInterviewSystemPrompt, type ChatMessage } from '../lib/openai.js'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

export const chatRouter = Router()

/**
 * POST /api/chat/message
 * Send a message and receive a streaming AI response
 * Auth is optional - unauthenticated users can chat but messages won't be saved
 */
chatRouter.post('/message', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { messages, interviewId, topicTitle } = req.body

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Messages array is required' })
    return
  }

  // Build messages with system prompt
  const systemPrompt = getInterviewSystemPrompt(topicTitle)
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  // Set up SSE streaming response
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    let fullResponse = ''

    for await (const chunk of streamChat(fullMessages)) {
      fullResponse += chunk
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
    }

    // Save message to database if authenticated and part of an interview
    if (interviewId && req.userId) {
      const userMessage = messages[messages.length - 1]

      // Save user message
      await supabaseAdmin.from('messages').insert({
        interview_id: interviewId,
        role: 'user',
        content: userMessage.content,
        user_id: req.userId,
      })

      // Save AI response
      await supabaseAdmin.from('messages').insert({
        interview_id: interviewId,
        role: 'assistant',
        content: fullResponse,
      })
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
 * POST /api/chat/start
 * Start a new interview conversation
 */
chatRouter.post('/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { topicId, topicTitle } = req.body

  // Create a new interview record
  const { data: interview, error } = await supabaseAdmin
    .from('interviews')
    .insert({
      creator_id: req.userId,
      topic_id: topicId || null,
      topic_title: topicTitle || '自由对话',
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: 'Failed to create interview', details: error.message })
    return
  }

  res.json({ interviewId: interview.id, topicTitle: interview.topic_title })
})
