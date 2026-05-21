import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, Sparkles, Wand2, BookOpen } from 'lucide-react'
import { sendMessage } from '@/lib/api'
import { saveConversation, generateConversationId, type ConversationRecord } from '@/lib/conversations'
import { useT } from '@/lib/i18n'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

export function ChatPage() {
  const t = useT()
  const location = useLocation()
  const navigate = useNavigate()

  const SUGGESTED_TOPICS = [
    t('chat.topic1'),
    t('chat.topic2'),
    t('chat.topic3'),
    t('chat.topic4'),
  ]

  // Extract restore state at initialization (not in effect) to avoid race conditions
  const restoredConv = (location.state as { restore?: ConversationRecord } | null)?.restore

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    restoredConv
      ? restoredConv.messages.map((m, i) => ({
          id: `msg-restored-${i}`,
          role: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
          content: m.content,
          timestamp: new Date(restoredConv.updatedAt),
        }))
      : []
  )
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatStarted, setChatStarted] = useState(!!restoredConv)
  const [topicTitle, setTopicTitle] = useState<string>(restoredConv?.topicTitle || '')
  const [conversationId] = useState(() => restoredConv?.id || generateConversationId())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Track whether the user has sent new messages (don't save on initial restore)
  const hasDirtyMessages = useRef(!restoredConv)

  // Save conversation to localStorage whenever messages change (only after new messages added)
  useEffect(() => {
    if (messages.length >= 2 && hasDirtyMessages.current) {
      saveConversation({
        id: conversationId,
        topicTitle: topicTitle || t('chat.freeChat'),
        messages: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        createdAt: messages[0]?.timestamp.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preview: messages[messages.length - 1]?.content.slice(0, 80) || '',
      })
    }
  }, [messages, conversationId, topicTitle, t])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    // Mark that user has sent a new message — enable saving
    hasDirtyMessages.current = true

    const userContent = input.trim()
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setChatStarted(true)
    setIsTyping(true)

    // Build message history for API
    const apiMessages = [...messages, userMsg].map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    // Create a placeholder AI message that will be updated with streaming content
    const aiMsgId = `msg-${Date.now()}-ai`
    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: '', timestamp: new Date() }])

    try {
      await sendMessage(
        apiMessages,
        undefined,
        topicTitle || undefined,
        (chunk: string) => {
          // Update the AI message with each streaming chunk
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
            )
          )
        }
      )
    } catch (error) {
      // On error, show error message in the AI bubble
      const errMsg = error instanceof Error ? error.message : t('chat.error.connectionFailed')
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId ? { ...m, content: `[${t('chat.error.prefix')}] ${errMsg}` } : m
        )
      )
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startWithTopic = (topic: string) => {
    setTopicTitle(topic)
    setInput(topic)
    setChatStarted(true)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" /> {t('chat.back')}
              </Button>
            </Link>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium">
                {topicTitle || t('chat.newChat')}
              </span>
            </div>
          </div>

          {chatStarted && messages.length >= 4 && (
            <Button
              variant="gold"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/generate', {
                state: {
                  messages: messages.map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                  })),
                  topicTitle,
                }
              })}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {t('chat.generateArticle')}
            </Button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {!chatStarted ? (
          <ChatWelcome onSelectTopic={startWithTopic} topics={SUGGESTED_TOPICS} />
        ) : (
          <div className="container mx-auto px-6 py-8 max-w-3xl">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isTyping && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                </div>
                <div className="bg-secondary rounded-xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 max-w-3xl">
          <div className="relative flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all min-h-[48px] max-h-[160px]"
                rows={1}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 160) + 'px'
                }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              variant="gold"
              size="icon"
              className="h-[48px] w-[48px] rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {t('chat.hint')}
          </p>
        </div>
      </div>
    </div>
  )
}

function ChatWelcome({ onSelectTopic, topics }: { onSelectTopic: (topic: string) => void; topics: string[] }) {
  const t = useT()
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Wand2 className="w-7 h-7 text-gold" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-3">{t('chat.welcome.title')}</h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          {t('chat.welcome.desc')}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {topics.map(topic => (
            <button
              key={topic}
              onClick={() => onSelectTopic(topic)}
              className="p-4 rounded-xl border border-border text-left hover:border-gold/50 hover:bg-gold/5 transition-all group"
            >
              <span className="text-sm text-foreground/80 group-hover:text-foreground">
                {topic}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const t = useT()
  const isUser = message.role === 'user'

  if (!isUser && !message.content) return null

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-navy'
          : 'bg-gold/10 border border-gold/20'
      }`}>
        {isUser ? (
          <span className="text-xs font-medium text-primary-foreground">{t('chat.me')}</span>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-gold" />
        )}
      </div>

      {/* Message */}
      <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
        isUser
          ? 'bg-navy text-primary-foreground rounded-tr-sm'
          : 'bg-secondary rounded-tl-sm'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
