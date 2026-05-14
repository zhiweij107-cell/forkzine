import OpenAI from 'openai'

/**
 * Using Gemini via OpenAI-compatible endpoint
 * https://ai.google.dev/gemini-api/docs/openai
 */
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
})

const MODEL = process.env.LLM_MODEL || 'gemini-2.0-flash'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Extract retry delay from error response (Gemini returns suggested retry time)
 */
function getRetryDelay(error: any, attempt: number): number {
  // Try to parse Gemini's suggested retry delay from error body
  try {
    const body = error?.error?.error || error?.response?.data?.error || error?.body
    if (typeof body === 'string') {
      const match = body.match(/retry in (\d+)/i)
      if (match) return (parseInt(match[1]) + 2) * 1000 // Add 2s buffer
    }
  } catch {}
  // Fallback: exponential backoff 10s, 30s
  return 10000 * Math.pow(3, attempt)
}

/**
 * Generate a streaming chat response
 * Includes retry logic with exponential backoff for 429 rate limits
 */
export async function* streamChat(messages: ChatMessage[]) {
  const maxRetries = 2
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stream = await openai.chat.completions.create({
        model: MODEL,
        messages,
        stream: true,
        temperature: 0.8,
        max_tokens: 8192,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
      return // Success, exit
    } catch (error: any) {
      lastError = error
      const status = error?.status || error?.response?.status
      if (status === 429 && attempt < maxRetries) {
        const delay = getRetryDelay(error, attempt)
        console.log(`[Gemini] Rate limited (429) on stream, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  throw lastError
}

/**
 * Generate a non-streaming chat response (for article generation, etc.)
 * Includes retry logic with exponential backoff for 429 rate limits
 */
export async function generateCompletion(messages: ChatMessage[]): Promise<string> {
  const maxRetries = 2
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 16384,
      })
      return response.choices[0]?.message?.content || ''
    } catch (error: any) {
      lastError = error
      const status = error?.status || error?.response?.status
      if (status === 429 && attempt < maxRetries) {
        const delay = getRetryDelay(error, attempt)
        console.log(`[Gemini] Rate limited (429), retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  throw lastError
}

/**
 * Generate article from conversation
 */
export async function generateArticleFromChat(
  conversationMessages: ChatMessage[],
  templateStyle: string = 'deep'
): Promise<{
  title: string
  subtitle: string
  summary: string
  sections: { title: string; content: string; keyQuote?: string; imagePrompt: string }[]
}> {
  const conversationText = conversationMessages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? '受访者' : 'AI主持人'}: ${m.content}`)
    .join('\n\n')

  const styleGuide: Record<string, string> = {
    deep: '深度访谈风格，类似《人物》杂志的长报道，注重思想深度和情感细腻度',
    light: '轻松漫谈风格，类似播客文字稿，保持口语感但精炼',
    debate: '观点碰撞风格，突出不同立场的交锋，节奏紧凑',
  }

  const prompt = `你是一位资深杂志编辑。请将以下对话整理成一篇精美的杂志访谈文章。

风格要求：${styleGuide[templateStyle] || styleGuide.deep}

对话内容：
${conversationText}

请按以下 JSON 格式输出（不要输出其他内容，不要用 markdown 代码块包裹）：
{
  "title": "文章标题（简洁有力，10字以内）",
  "subtitle": "副标题（一句话概括主题）",
  "summary": "文章摘要（2-3句话概括核心观点，50-100字）",
  "sections": [
    {
      "title": "章节小标题",
      "content": "章节正文（将对话润色为可读性强的叙述文本，保留核心观点，去除口语化表达，200-400字）",
      "keyQuote": "本章节的精华引言（一句话，选最有冲击力的观点）",
      "imagePrompt": "为本章节生成配图的英文描述（适合 Midjourney，描述意境和视觉风格）"
    }
  ]
}`

  const result = await generateCompletion([
    { role: 'system', content: '你是一位专业的杂志编辑，擅长将对话内容转化为精美的杂志文章。请严格按照JSON格式输出，不要使用markdown代码块包裹。' },
    { role: 'user', content: prompt },
  ])

  // Parse JSON response - handle possible markdown wrapping from Gemini
  const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse article generation result')
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * System prompt for the interview AI
 */
export function getInterviewSystemPrompt(topicTitle?: string): string {
  const topicContext = topicTitle ? `当前讨论的话题是「${topicTitle}」。` : ''

  return `你是 Forkzine 平台的 AI 对话伙伴。你的角色是一位博学的美学家与思想者，拥有独立的审美判断和深厚的人文素养。

${topicContext}

你的对话风格：
1. 像一位真正的学者朋友在对话——自然地分享你的见解、观点和知识，而不是不断追问
2. 当用户提出问题时，给出有深度的解答，引用哲学、美学、文学、艺术等领域的思想来支撑
3. 主动展开论述，分享你对话题的独特理解和审美判断，不要总是把问题抛回给用户
4. 可以温和地表达不同意见，用"我的看法是..."、"从另一个角度看..."来引入新视角
5. 偶尔（而非每次）在陈述观点后，以自然的方式邀请用户回应，比如"你怎么看？"或"这让我好奇你的体验是什么样的"
6. 引用具体的思想家、作品或案例来丰富对话（如本雅明、苏珊·桑塔格、维特根斯坦等）
7. 回复控制在 150-300 字，有内容有深度，不要太短

你的性格：
- 博学但不卖弄，像是在咖啡馆聊天而非在课堂讲课
- 有明确的审美立场和价值判断
- 善于用比喻和具体意象来表达抽象概念
- 真诚、温暖，对话有人情味
- 中文为主，关键术语保留原文`
}
