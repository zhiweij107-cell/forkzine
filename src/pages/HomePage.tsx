import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, GitFork, Eye, Sparkles, Clock, Flame, Tag, Loader2, Upload, MessageSquare } from 'lucide-react'
import { listArticles, getCurrentUser, uploadImage, updateArticle } from '@/lib/api'
import { useT, useI18n } from '@/lib/i18n'

interface ArticleItem {
  id: string
  title: string
  subtitle: string
  summary: string
  template_style: string
  tags: string[]
  read_count: number
  branch_count: number
  published_at: string
  cover_gradient: string
  profiles: { id: string; name: string; title?: string; avatar_url?: string }
}

type SortMode = 'latest' | 'popular' | 'topic'

export function HomePage() {
  return (
    <div>
      <HeroSection />
      <RecommendedTopics />
      <ArticleFeed />
      <Footer />
    </div>
  )
}

function HeroSection() {
  const t = useT()
  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-gold/3 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
      </div>

      <div className="container mx-auto px-6 relative z-10 pt-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-medium text-gold">{t('home.hero.badge')}</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-serif font-bold text-primary-foreground leading-[1.1] mb-6">
            {t('home.hero.title1')}<br />
            <span className="text-gold">{t('home.hero.title2')}</span>
          </h1>

          <p className="text-lg text-primary-foreground/70 leading-relaxed max-w-xl mb-10">
            {t('home.hero.subtitle')}
          </p>

          <Link to="/chat">
            <Button variant="gold" size="xl" className="gap-2">
              {t('home.hero.cta')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function RecommendedTopics() {
  const t = useT()
  const navigate = useNavigate()

  const topics = [
    { emoji: '🏯', title: t('home.topics.t1'), desc: t('home.topics.d1') },
    { emoji: '⛩️', title: t('home.topics.t2'), desc: t('home.topics.d2') },
    { emoji: '🚀', title: t('home.topics.t3'), desc: t('home.topics.d3') },
    { emoji: '🎭', title: t('home.topics.t4'), desc: t('home.topics.d4') },
    { emoji: '🌌', title: t('home.topics.t5'), desc: t('home.topics.d5') },
    { emoji: '🎮', title: t('home.topics.t6'), desc: t('home.topics.d6') },
  ]

  return (
    <section className="py-14 px-6 border-b border-border">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-gold rounded-full" />
          <h2 className="text-2xl font-serif font-bold">{t('home.topics.title')}</h2>
          <MessageSquare className="w-4 h-4 text-gold" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic, i) => (
            <button
              key={i}
              onClick={() => navigate('/chat', { state: { topicTitle: topic.title } })}
              className="group p-5 rounded-xl border border-border hover:border-gold/40 bg-card hover:shadow-[var(--shadow-md)] transition-all text-left"
            >
              <span className="text-2xl mb-3 block">{topic.emoji}</span>
              <h3 className="text-sm font-semibold mb-1.5 group-hover:text-gold transition-colors">
                {topic.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {topic.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArticleFeed() {
  const t = useT()
  const { locale } = useI18n()
  const [sort, setSort] = useState<SortMode>('latest')
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    listArticles(1, 20)
      .then(data => {
        setArticles(data.articles || [])
      })
      .catch(() => {
        setArticles([])
      })
      .finally(() => setLoading(false))
  }, [])

  const sortedArticles = [...articles].sort((a, b) => {
    switch (sort) {
      case 'popular':
        return b.read_count - a.read_count
      case 'topic':
        return (a.tags[0] || '').localeCompare(b.tags[0] || '')
      default:
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    }
  })

  const sortOptions: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: 'latest', label: t('home.feed.sortLatest'), icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'popular', label: t('home.feed.sortPopular'), icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'topic', label: t('home.feed.sortTopic'), icon: <Tag className="w-3.5 h-3.5" /> },
  ]

  return (
    <section className="py-16 px-6">
      <div className="container mx-auto max-w-4xl">
        {/* Sort bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gold rounded-full" />
            <h2 className="text-2xl font-serif font-bold">{t('home.feed.title')}</h2>
            <span className="text-sm text-muted-foreground">({sortedArticles.length})</span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
            {sortOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  sort === opt.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Articles list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : sortedArticles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-gold/50" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('home.feed.empty.title')}</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">
              {t('home.feed.empty.desc')}
            </p>
            <Link to="/chat">
              <Button variant="gold" className="gap-2">
                <Sparkles className="w-4 h-4" />
                {t('home.feed.empty.cta')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                locale={locale}
                onClick={() => navigate(`/article/${article.id}`)}
                onCoverUpdate={(url) => {
                  setArticles(prev => prev.map(a => a.id === article.id ? { ...a, cover_gradient: url } : a))
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ArticleCard({ article, locale, onClick, onCoverUpdate }: { article: ArticleItem; locale: string; onClick: () => void; onCoverUpdate: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const currentUser = getCurrentUser()
  const isOwner = currentUser && article.profiles?.id === currentUser.id
  const t = useT()

  const handleCoverUpload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage(file)
      await updateArticle(article.id, { cover_gradient: url })
      onCoverUpdate(url)
    } catch {
      alert(t('home.feed.coverUploadFail'))
    } finally {
      setUploading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('home.feed.justNow')
    if (diffMin < 60) return t('home.feed.minutesAgo', { n: diffMin })
    if (diffHour < 24) return t('home.feed.hoursAgo', { n: diffHour })
    if (diffDay < 7) return t('home.feed.daysAgo', { n: diffDay })
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')
  }

  const authorName = article.profiles?.name || t('home.feed.anonymous')

  return (
    <div
      onClick={onClick}
      className="group p-6 rounded-xl border border-border hover:border-gold/30 bg-card hover:shadow-[var(--shadow-md)] transition-all cursor-pointer"
    >
      <div className="flex gap-6">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
              <span className="text-xs font-medium text-gold">
                {authorName[0]}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{authorName}</span>
            <span className="text-xs text-muted-foreground/60">·</span>
            <span className="text-xs text-muted-foreground/60">{formatTime(article.published_at)}</span>
          </div>

          <h3 className="text-lg font-serif font-bold mb-1.5 group-hover:text-gold transition-colors truncate">
            {article.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-1">{article.subtitle}</p>
          <p className="text-sm text-foreground/60 leading-relaxed line-clamp-2 mb-3">
            {article.summary}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {article.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {article.read_count}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" /> {article.branch_count}
              </span>
            </div>
          </div>
        </div>

        {/* Cover thumbnail */}
        <div className="hidden sm:block w-32 h-24 rounded-lg flex-shrink-0 overflow-hidden relative group/cover">
          {article.cover_gradient?.startsWith('http') ? (
            <img src={article.cover_gradient} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${article.cover_gradient || 'from-navy via-navy-light to-purple-900'} flex items-center justify-center`}>
              <span className="font-serif text-lg text-gold/40">&ldquo;</span>
            </div>
          )}
          {isOwner && (
            <label
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity cursor-pointer"
              onClick={e => e.stopPropagation()}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-white" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleCoverUpload(file)
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

function Footer() {
  const t = useT()
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gold flex items-center justify-center">
              <span className="font-serif font-bold text-primary text-xs">F</span>
            </div>
            <span className="font-serif font-bold">Forkzine</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('home.footer.slogan')}
          </p>
        </div>
      </div>
    </footer>
  )
}
