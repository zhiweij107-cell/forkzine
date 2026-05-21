import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { listTopics, listArticles } from '@/lib/api'
import {
  Search, Sparkles, MessageSquare, Eye, GitFork,
  Loader2, TrendingUp, Users
} from 'lucide-react'
import { useT } from '@/lib/i18n'

interface Topic {
  id: string
  title: string
  description: string
  category: string
  interview_count: number
  trending: boolean
}

interface ArticleItem {
  id: string
  title: string
  subtitle: string
  summary: string
  tags: string[]
  read_count: number
  branch_count: number
  published_at: string
  profiles: { id: string; name: string; title?: string; avatar_url?: string }
}

export function ExplorePage() {
  const t = useT()
  const [topics, setTopics] = useState<Topic[]>([])
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      listTopics().catch(() => ({ topics: [] })),
      listArticles(1, 6).catch(() => ({ articles: [] })),
    ]).then(([topicData, articleData]) => {
      setTopics(topicData.topics || [])
      setArticles(articleData.articles || [])
    }).finally(() => setLoading(false))
  }, [])

  const filteredTopics = topics.filter(t =>
    t.title.includes(searchQuery) || t.description.includes(searchQuery) || t.category.includes(searchQuery)
  )

  const categories = [...new Set(topics.map(t => t.category))]

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Hero */}
      <section className="py-16 px-6 border-b border-border">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-serif font-bold mb-4">{t('explore.title')}</h1>
          <p className="text-muted-foreground mb-8">{t('explore.subtitle')}</p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('explore.searchPlaceholder')}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Topics Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-gold rounded-full" />
            <h2 className="text-2xl font-serif font-bold">{t('explore.hotTopics')}</h2>
            <span className="text-sm text-muted-foreground">({filteredTopics.length})</span>
          </div>

          {/* Category filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(searchQuery === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    searchQuery === cat
                      ? 'bg-gold text-primary'
                      : 'bg-secondary text-muted-foreground hover:bg-gold/10 hover:text-gold'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filteredTopics.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t('explore.noTopics')}</p>
              <Link to="/chat">
                <Button variant="gold" size="sm" className="mt-4 gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> {t('explore.startFirst')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map(topic => (
                <div
                  key={topic.id}
                  onClick={() => navigate(`/chat`, { state: { topicTitle: topic.title } })}
                  className="group p-5 rounded-xl border border-border hover:border-gold/30 bg-card hover:shadow-[var(--shadow-md)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-gold/10 text-gold font-medium">
                      {topic.category}
                    </span>
                    {topic.trending && (
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <h3 className="font-serif font-bold mb-2 group-hover:text-gold transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {topic.description || t('explore.clickToDiscuss')}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {t('explore.interviewCount', { n: topic.interview_count })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Articles */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-gold rounded-full" />
            <h2 className="text-2xl font-serif font-bold">{t('explore.latestArticles')}</h2>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t('explore.noArticles')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {articles.map(article => (
                <div
                  key={article.id}
                  onClick={() => navigate(`/article/${article.id}`)}
                  className="group p-5 rounded-xl border border-border hover:border-gold/30 bg-card hover:shadow-[var(--shadow-md)] transition-all cursor-pointer"
                >
                  <h3 className="font-serif font-bold mb-1 group-hover:text-gold transition-colors truncate">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-1">{article.subtitle}</p>
                  <p className="text-xs text-foreground/60 line-clamp-2 mb-3">{article.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {article.profiles?.name || t('explore.anonymous')}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {article.read_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" /> {article.branch_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
