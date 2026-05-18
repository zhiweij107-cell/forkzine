import { Router } from 'express'
import multer from 'multer'
import { submitImageTask, checkImageTask, submitImg2ImgTask } from '../lib/midjourney.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

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


/**
 * POST /api/images/upload
 * Upload an image to Supabase Storage
 */
imageRouter.post('/upload', requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'No image file provided' })
    return
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.mimetype)) {
    res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' })
    return
  }

  try {
    const ext = file.originalname.split('.').pop() || 'jpg'
    const fileName = `${req.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('article-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      })

    if (uploadError) {
      // If bucket doesn't exist, try to create it
      if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
        await supabaseAdmin.storage.createBucket('article-images', {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024,
        })
        // Retry upload
        const { error: retryError } = await supabaseAdmin.storage
          .from('article-images')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          })
        if (retryError) {
          res.status(500).json({ error: 'Upload failed: ' + retryError.message })
          return
        }
      } else {
        res.status(500).json({ error: 'Upload failed: ' + uploadError.message })
        return
      }
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('article-images')
      .getPublicUrl(fileName)

    res.json({ url: urlData.publicUrl })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    res.status(500).json({ error: message })
  }
})
