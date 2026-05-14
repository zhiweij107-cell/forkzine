import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, GitFork, Eye, Sparkles, Clock, Flame, Tag } from 'lucide-react'
import { getSortedArticles, type SortMode, type PublishedArticle } from '@/lib/articles'

export function HomePage() {
  return (
    <div>
      <HeroSection />
      <ArticleFeed />
      <Footer />
    </div>
  )
}

function HeroSection() {
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
            <span className="text-xs font-medium text-gold">AI 驱动的深度对话平台</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-serif font-bold text-primary-foreground leading-[1.1] mb-6">
            对话即创作<br />
            <span className="text-gold">观点即分叉</span>
          </h1>

          <p className="text-lg text-primary-foreground/70 leading-relaxed max-w-xl mb-10">
            与 AI 深度对话，自动生成精美杂志访谈。每一个观点都可能成为新的分支，
            让思想在碰撞中生长。
          </p>

          <Link to="/chat">
            <Button variant="gold" size="xl" className="gap-2">
              开始你的第一次对话
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function ArticleFeed() {
  const [sort, setSort] = useState<SortMode>('latest')
  const articles = getSortedArticles(sort)
  const navigate = useNavigate()

  const sortOptions: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: 'latest', label: '最新发布', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'popular', label: '最多阅读', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'topic', label: '按话题', icon: <Tag className="w-3.5 h-3.5" /> },
  ]

  return (
    <section className="py-16 px-6">
      <div className="container mx-auto max-w-4xl">
        {/* Sort bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gold rounded-full" />
            <h2 className="text-2xl font-serif font-bold">访谈文章</h2>
            <span className="text-sm text-muted-foreground">({articles.length})</span>
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
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-gold/50" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">还没有发布的文章</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">
              开始一段对话，生成你的第一篇杂志风格访谈文章吧
            </p>
            <Link to="/chat">
              <Button variant="gold" className="gap-2">
                <Sparkles className="w-4 h-4" />
                开始对话
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => navigate(`/article/${article.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ArticleCard({ article, onClick }: { article: PublishedArticle; onClick: () => void }) {
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
                {article.author.name[0]}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{article.author.name}</span>
            <span className="text-xs text-muted-foreground/60">·</span>
            <span className="text-xs text-muted-foreground/60">{formatTime(article.publishedAt)}</span>
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
                <Eye className="w-3 h-3" /> {article.readCount}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" /> {article.branchCount}
              </span>
            </div>
          </div>
        </div>

        {/* Cover thumbnail */}
        <div className="hidden sm:block w-32 h-24 rounded-lg bg-gradient-to-br from-navy via-navy-light to-purple-900 flex-shrink-0 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-serif text-lg text-gold/40">&ldquo;</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Footer() {
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
            &copy; 2026 Forkzine. 对话即创作，观点即分叉。
          </p>
        </div>
      </div>
    </footer>
  )
}
