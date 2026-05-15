// API base URL - configured via environment variable
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'

/**
 * Base fetch wrapper with auth token
 */
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Handle 401 - token expired
  if (response.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`
      return fetch(`${API_BASE}${path}`, { ...options, headers })
    }
    // Redirect to login
    window.location.href = '/auth'
  }

  return response
}

// ========== Auth ==========

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '登录失败')
  saveSession(data)
  return data.user
}

export async function register(email: string, password: string, name: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '注册失败')
  saveSession(data)
  return data.user
}

export async function getMe() {
  const res = await apiFetch('/auth/me')
  if (!res.ok) return null
  return res.json()
}

export function logout() {
  localStorage.removeItem('forkzine_session')
  window.location.href = '/auth'
}

// ========== Chat (Streaming) ==========

export async function startInterview(topicId?: string, topicTitle?: string) {
  const res = await apiFetch('/chat/start', {
    method: 'POST',
    body: JSON.stringify({ topicId, topicTitle }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function sendMessage(
  messages: { role: string; content: string }[],
  interviewId?: string,
  topicTitle?: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const token = getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, interviewId, topicTitle }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Chat failed')
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  if (!reader) throw new Error('No response stream')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'chunk') {
            fullResponse += data.content
            onChunk?.(data.content)
          } else if (data.type === 'done') {
            return data.content
          } else if (data.type === 'error') {
            throw new Error(data.error)
          }
        } catch (e) {
          // Skip malformed SSE lines
        }
      }
    }
  }

  return fullResponse
}

// ========== Articles ==========

export async function generateArticle(
  messages: { role: string; content: string }[],
  interviewId?: string,
  templateStyle?: string,
) {
  const res = await apiFetch('/articles/generate', {
    method: 'POST',
    body: JSON.stringify({ messages, interviewId, templateStyle }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function publishArticle(articleId: string) {
  const res = await apiFetch(`/articles/${articleId}/publish`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function publishArticleDirect(article: {
  title: string
  subtitle: string
  summary: string
  sections: { title: string; content: string; keyQuote?: string; imagePrompt?: string; imageUrl?: string }[]
  templateStyle: string
  topicTitle: string
  tags: string[]
}) {
  const res = await apiFetch('/articles/publish-direct', {
    method: 'POST',
    body: JSON.stringify(article),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function getArticle(articleId: string) {
  const res = await apiFetch(`/articles/${articleId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function listArticles(page = 1, limit = 10) {
  const res = await apiFetch(`/articles?page=${page}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

// ========== Branches ==========

export async function createBranch(
  sectionId: string,
  branchType: string,
  messages: { role: string; content: string }[],
) {
  const res = await apiFetch('/branches/create', {
    method: 'POST',
    body: JSON.stringify({ sectionId, branchType, messages }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function sendBranchMessage(
  sectionId: string,
  branchType: string,
  messages: { role: string; content: string }[],
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const token = getAccessToken()

  const response = await fetch(`${API_BASE}/branches/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sectionId, branchType, messages }),
  })

  if (!response.ok) throw new Error('Branch chat failed')

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  if (!reader) throw new Error('No response stream')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'chunk') {
            fullResponse += data.content
            onChunk?.(data.content)
          } else if (data.type === 'done') {
            return data.content
          }
        } catch (e) {
          // Skip
        }
      }
    }
  }

  return fullResponse
}

export async function likeBranch(branchId: string) {
  const res = await apiFetch(`/branches/${branchId}/like`, { method: 'POST' })
  return res.ok
}

// ========== Images ==========

export async function generateImage(prompt: string, aspectRatio = '16:9') {
  const res = await apiFetch('/images/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, aspectRatio }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function checkImageStatus(taskId: string) {
  const res = await apiFetch(`/images/status/${taskId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

// ========== Topics ==========

export async function listTopics(trending?: boolean) {
  const params = trending ? '?trending=true' : ''
  const res = await apiFetch(`/topics${params}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

// ========== Session helpers ==========

function getAccessToken(): string | null {
  try {
    const session = JSON.parse(localStorage.getItem('forkzine_session') || '{}')
    return session.access_token || null
  } catch {
    return null
  }
}

function saveSession(data: { session: { access_token: string; refresh_token: string }; user: unknown }) {
  localStorage.setItem('forkzine_session', JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user,
  }))
}

async function refreshToken(): Promise<boolean> {
  try {
    const session = JSON.parse(localStorage.getItem('forkzine_session') || '{}')
    if (!session.refresh_token) return false

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })

    if (!res.ok) return false

    const data = await res.json()
    localStorage.setItem('forkzine_session', JSON.stringify({
      ...session,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }))
    return true
  } catch {
    return false
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem('forkzine_session') || '{}')
    return session.user || null
  } catch {
    return null
  }
}
