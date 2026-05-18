/**
 * Midjourney proxy service
 * Uses third-party API (GoAPI / similar) to call Midjourney
 */

const MJ_API_URL = process.env.MIDJOURNEY_API_URL || 'https://api.goapi.ai/mj/v2/imagine'
const MJ_API_KEY = process.env.MIDJOURNEY_API_KEY || ''

export interface ImageGenerationResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  imageUrl?: string
  progress?: number
}

/**
 * Submit an image generation task to Midjourney proxy
 */
export async function submitImageTask(prompt: string): Promise<ImageGenerationResult> {
  if (!MJ_API_KEY) {
    // No API key configured - return without image URL so frontend shows the prompt
    return {
      taskId: `mock-${Date.now()}`,
      status: 'completed',
      imageUrl: undefined,
    }
  }

  const response = await fetch(MJ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': MJ_API_KEY,
    },
    body: JSON.stringify({
      prompt: `${prompt} --ar 16:9 --style raw --q 2`,
      process_mode: 'fast',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Midjourney API error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  return {
    taskId: data.task_id || data.id,
    status: 'pending',
  }
}

/**
 * Check the status of an image generation task
 */
export async function checkImageTask(taskId: string): Promise<ImageGenerationResult> {
  if (taskId.startsWith('mock-')) {
    return {
      taskId,
      status: 'completed',
      imageUrl: generatePlaceholderUrl('generated'),
    }
  }

  const statusUrl = MJ_API_URL.replace('/imagine', `/task/${taskId}`)

  const response = await fetch(statusUrl, {
    headers: {
      'x-api-key': MJ_API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to check task status: ${response.status}`)
  }

  const data = await response.json()

  return {
    taskId,
    status: data.status === 'finished' ? 'completed' : data.status === 'failed' ? 'failed' : 'processing',
    imageUrl: data.task_result?.image_url || data.image_url,
    progress: data.progress,
  }
}

/**
 * Generate image from existing image (img2img) - using image_gpt_2 proxy
 */
export async function submitImg2ImgTask(
  sourceImageUrl: string,
  prompt: string
): Promise<ImageGenerationResult> {
  if (!MJ_API_KEY) {
    return {
      taskId: `mock-img2img-${Date.now()}`,
      status: 'completed',
      imageUrl: generatePlaceholderUrl(prompt),
    }
  }

  const response = await fetch(MJ_API_URL.replace('/imagine', '/blend'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': MJ_API_KEY,
    },
    body: JSON.stringify({
      image_urls: [sourceImageUrl],
      prompt,
      process_mode: 'fast',
    }),
  })

  if (!response.ok) {
    throw new Error(`Img2Img API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    taskId: data.task_id || data.id,
    status: 'pending',
  }
}

function generatePlaceholderUrl(prompt: string): string {
  // Generate a deterministic gradient placeholder based on prompt
  const hash = prompt.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  const hue = Math.abs(hash) % 360
  return `https://placehold.co/1200x630/${hslToHex(hue, 40, 25)}/${hslToHex(hue, 60, 60)}?text=AI+Generated`
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `${f(0)}${f(8)}${f(4)}`
}
