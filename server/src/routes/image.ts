import { Router } from 'express'
import { submitImageTask, checkImageTask, submitImg2ImgTask } from '../lib/midjourney.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export const imageRouter = Router()

/**
 * POST /api/images/generate
 * Submit a text-to-image generation task (Midjourney)
 */
imageRouter.post('/generate', requireAuth, async (req, res) => {
  const { prompt, aspectRatio } = req.body

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' })
    return
  }

  try {
    const fullPrompt = aspectRatio ? `${prompt} --ar ${aspectRatio}` : prompt
    const result = await submitImageTask(fullPrompt)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed'
    res.status(500).json({ error: message })
  }
})

/**
 * POST /api/images/img2img
 * Submit an image-to-image generation task (image_gpt_2)
 */
imageRouter.post('/img2img', requireAuth, async (req, res) => {
  const { sourceImageUrl, prompt } = req.body

  if (!sourceImageUrl || !prompt) {
    res.status(400).json({ error: 'sourceImageUrl and prompt are required' })
    return
  }

  try {
    const result = await submitImg2ImgTask(sourceImageUrl, prompt)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/images/status/:taskId
 * Check the status of an image generation task
 */
imageRouter.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params

  try {
    const result = await checkImageTask(taskId)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Status check failed'
    res.status(500).json({ error: message })
  }
})
