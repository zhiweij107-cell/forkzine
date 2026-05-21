import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, MessageSquare, Trash2, Clock, FileText,
  Loader2, BookOpen, Eye, Send
} from 'lucide-react'
import { getConversations, deleteConversation, type ConversationRecord } from '@/lib/conversations'
import { listMyArticles, publishArticle, isAuthenticated } from '@/lib/api'
import { useT, useI18n } from '@/lib/i18n'

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
  const t = useT()
  const { locale } = useI18n()
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
      alert(t('history.drafts.publishFailed'))
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('history.justNow')
    if (diffMin < 60) return t('history.minutesAgo', { n: diffMin })
    if (diffHour < 24) return t('history.hoursAgo', { n: diffHour })
    if (diffDay < 7) return t('history.daysAgo', { n: diffDay })
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> {t('history.back')}
          </Button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium">{t('history.title')}</span>
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
              {t('history.tabConversations')}
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
              {t('history.tabArticles')}
              {drafts.length > 0 && (
                <span className="text-xs text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                  {drafts.length} {t('history.drafts')}
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
  const t = useT()

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('history.conversations.empty.title')}</h3>
        <p className="text-sm text-muted-foreground/60 mb-6">{t('history.conversations.empty.desc')}</p>
        <Button variant="gold" onClick={() => navigate('/chat')}>
          {t('history.conversations.empty.cta')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif font-bold">{t('history.conversations.count', { n: conversations.length })}</h2>
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
                {t('history.conversations.messages', { n: conv.messages.length })} · {conv.preview}
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
  const t = useT()

  if (!isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('history.drafts.loginRequired.title')}</h3>
        <p className="text-sm text-muted-foreground/60 mb-6">{t('history.drafts.loginRequired.desc')}</p>
        <Button variant="gold" onClick={() => navigate('/auth')}>
          {t('history.drafts.loginRequired.cta')}
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
        <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('history.drafts.empty.title')}</h3>
        <p className="text-sm text-muted-foreground/60 mb-6">{t('history.drafts.empty.desc')}</p>
        <Button variant="gold" onClick={() => navigate('/chat')}>
          {t('history.drafts.empty.cta')}
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
            <h3 className="text-base font-serif font-bold">{t('history.drafts.sectionTitle')}</h3>
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
                        {article.status === 'generated' ? t('history.drafts.statusGenerated') : t('history.drafts.statusDraft')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(article.created_at)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium truncate">{article.title || t('history.noTitle')}</h4>
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
                    <Send className="w-3 h-3" /> {t('history.drafts.publish')}
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
            <h3 className="text-base font-serif font-bold">{t('history.published.sectionTitle')}</h3>
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
                        {t('history.published.status')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(article.published_at || article.created_at)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium truncate">{article.title || t('history.noTitle')}</h4>
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
