import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, MessageSquare, Trash2, Clock, FileText,
  Loader2, BookOpen, Eye, Send
} from 'lucide-react'
import { getConversations, deleteConversation, type ConversationRecord } from '@/lib/conversations'
import { listMyArticles, publishArticle, isAuthenticated } from '@/lib/api'

type Tab = 'conversations' | 'drafts'

interface DraftArticle {
  id: string
  title: string
  subtitle: string
  summary: string
  template_style: string
  tags: string[]
  status: string
  read_count: number
  branch_count: number
  created_at: string
  published_at: string | null
}

export function HistoryPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('conversations')
  const [conversations, setConversations] = useState<ConversationRecord[]>(getConversations)
  const [drafts, setDrafts] = useState<DraftArticle[]>([])
  const [published, setPublished] = useState<DraftArticle[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  useEffect(() => {
    if (tab === 'drafts' && isAuthenticated()) {
      setLoadingDrafts(true)
      listMyArticles()
        .then(data => {
          const articles = data.articles || []
          setDrafts(articles.filter((a: DraftArticle) => a.status !== 'published'))
          setPublished(articles.filter((a: DraftArticle) => a.status === 'published'))
        })
        .catch(() => {
          setDrafts([])
          setPublished([])
        })
        .finally(() => setLoadingDrafts(false))
    }
  }, [tab])

  const handleDelete = (id: string) => {
    deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
  }

  const handleRestore = (conv: ConversationRecord) => {
    navigate('/chat', { state: { restore: conv } })
  }

  const handlePublishDraft = async (id: string) => {
    try {
      await publishArticle(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
      const published_item = drafts.find(d => d.id === id)
      if (published_item) {
        setPublished(prev => [{ ...published_item, status: 'published' }, ...prev])
      }
    } catch {
      alert('发布失败，请重试')
    }
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
            <span className="text-sm font-medium">历史记录</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="flex gap-1 pt-3">
            <button
              onClick={() => setTab('conversations')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                tab === 'conversations'
                  ? 'bg-background border border-border border-b-transparent text-foreground -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              对话记录
              <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                {conversations.length}
              </span>
            </button>
            <button
              onClick={() => setTab('drafts')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                tab === 'drafts'
                  ? 'bg-background border border-border border-b-transparent text-foreground -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              我的文章
              {drafts.length > 0 && (
                <span className="text-xs text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                  {drafts.length} 草稿
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        {tab === 'conversations' && (
          <ConversationsTab
            conversations={conversations}
            onRestore={handleRestore}
            onDelete={handleDelete}
            formatTime={formatTime}
            navigate={navigate}
          />
        )}
        {tab === 'drafts' && (
          <DraftsTab
            drafts={drafts}
            published={published}
            loading={loadingDrafts}
            onPublish={handlePublishDraft}
            formatTime={formatTime}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  )
}

function ConversationsTab({
  conversations, onRestore, onDelete, formatTime, navigate
}: {
  conversations: ConversationRecord[]
  onRestore: (conv: ConversationRecord) => void
  onDelete: (id: string) => void
  formatTime: (d: string) => string
  navigate: ReturnType<typeof useNavigate>
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">还没有对话记录</h3>
        <p className="text-sm text-muted-foreground/60 mb-6">开始一段新对话，你的对话历史会自动保存在这里</p>
        <Button variant="gold" onClick={() => navigate('/chat')}>
          开始新对话
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif font-bold">共 {conversations.length} 条对话</h2>
      </div>

      {conversations.map(conv => (
        <div
          key={conv.id}
          className="group p-4 rounded-xl border border-border hover:border-gold/30 hover:bg-gold/5 transition-all cursor-pointer"
          onClick={() => onRestore(conv)}
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
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function DraftsTab({
  drafts, published, loading, onPublish, formatTime, navigate
}: {
  drafts: DraftArticle[]
  published: DraftArticle[]
  loading: boolean
  onPublish: (id: string) => void
  formatTime: (d: string) => string
  navigate: ReturnType<typeof useNavigate>
}) {
  if (!isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">请先登录</h3>
        <p className="text-sm text-muted-foreground/60 mb-6">登录后可以查看和管理你的文章</p>
        <Button variant="gold" onClick={() => navigate('/auth')}>
          去登录
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    )
  }

  if (drafts.length === 0 && published.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">还没有文章</h3>
        <p className="text-sm text-muted-foreground/60 mb-6">通过对话生成文章后，会出现在这里</p>
        <Button variant="gold" onClick={() => navigate('/chat')}>
          开始对话
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Drafts section */}
      {drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-amber-400 rounded-full" />
            <h3 className="text-base font-serif font-bold">草稿 / 待发布</h3>
            <span className="text-xs text-muted-foreground">({drafts.length})</span>
          </div>
          <div className="space-y-3">
            {drafts.map(article => (
              <div
                key={article.id}
                className="group p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-gold/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/article/${article.id}`)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-400 font-medium">
                        {article.status === 'generated' ? '已生成' : '草稿'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(article.created_at)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium truncate">{article.title || '无标题'}</h4>
                    {article.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{article.subtitle}</p>
                    )}
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onPublish(article.id)}
                  >
                    <Send className="w-3 h-3" /> 发布
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published section */}
      {published.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-emerald-400 rounded-full" />
            <h3 className="text-base font-serif font-bold">已发布</h3>
            <span className="text-xs text-muted-foreground">({published.length})</span>
          </div>
          <div className="space-y-3">
            {published.map(article => (
              <div
                key={article.id}
                className="group p-4 rounded-xl border border-border hover:border-gold/30 transition-all cursor-pointer"
                onClick={() => navigate(`/article/${article.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400 font-medium">
                        已发布
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(article.published_at || article.created_at)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium truncate">{article.title || '无标题'}</h4>
                    {article.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{article.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {article.read_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {article.branch_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
