import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare, Trash2, Clock } from 'lucide-react'
import { getConversations, deleteConversation, type ConversationRecord } from '@/lib/conversations'

export function HistoryPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationRecord[]>(getConversations)

  const handleDelete = (id: string) => {
    deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
  }

  const handleRestore = (conv: ConversationRecord) => {
    navigate('/chat', { state: { restore: conv } })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    if (diffHour < 24) return `${diffHour} 小时前`
    if (diffDay < 7) return `${diffDay} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> 返回
          </Button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium">对话历史</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">还没有对话记录</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">开始一段新对话，你的对话历史会自动保存在这里</p>
            <Button variant="gold" onClick={() => navigate('/chat')}>
              开始新对话
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif font-bold">共 {conversations.length} 条对话</h2>
            </div>

            {conversations.map(conv => (
              <div
                key={conv.id}
                className="group p-4 rounded-xl border border-border hover:border-gold/30 hover:bg-gold/5 transition-all cursor-pointer"
                onClick={() => handleRestore(conv)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{conv.topicTitle}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.messages.length} 条消息 · {conv.preview}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
