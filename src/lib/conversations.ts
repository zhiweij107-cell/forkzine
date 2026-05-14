/**
 * Conversation history storage (localStorage-based)
 */

export interface ConversationRecord {
  id: string
  topicTitle: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  createdAt: string
  updatedAt: string
  preview: string
}

const STORAGE_KEY = 'forkzine_conversations'

export function getConversations(): ConversationRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveConversation(conversation: ConversationRecord): void {
  const conversations = getConversations()
  const existingIndex = conversations.findIndex(c => c.id === conversation.id)

  if (existingIndex >= 0) {
    conversations[existingIndex] = conversation
  } else {
    conversations.unshift(conversation)
  }

  // Keep max 50 conversations
  const trimmed = conversations.slice(0, 50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function deleteConversation(id: string): void {
  const conversations = getConversations().filter(c => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
}

export function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
