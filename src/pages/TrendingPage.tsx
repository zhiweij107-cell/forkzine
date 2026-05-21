import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { listArticles } from '@/lib/api'
import {
  GitFork, Eye, Loader2, Sparkles, TrendingUp, Flame
} from 'lucide-react'
import { useT } from '@/lib/i18n'

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

export function TrendingPage() {
  const t = useT()
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    listArticles(1, 50)
      .then(data => {
        // Sort by branch_count to show most "forked" articles
        const sorted = (data.articles || []).sort(
          (a: ArticleItem, b: ArticleItem) => b.branch_count - a.branch_count
        )
        setArticles(sorted)
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [])

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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 mb-6">
            <Flame className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-medium text-gold">{t('trending.badge')}</span>
          </div>
          <h1 className="text-4xl font-serif font-bold mb-4">{t('trending.title')}</h1>
          <p className="text-muted-foreground">
            {t('trending.subtitle')}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <GitFork className="w-7 h-7 text-gold/50" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('trending.empty.title')}</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">
              {t('trending.empty.desc')}
            </p>
            <Button variant="gold" onClick={() => navigate('/')}>
              {t('trending.empty.cta')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 bg-gold rounded-full" />
              <h2 className="text-2xl font-serif font-bold">{t('trending.mostForked')}</h2>
              <span className="text-sm text-muted-foreground">({articles.length})</span>
            </div>

            {articles.map((article, idx) => (
              <div
                key={article.id}
                onClick={() => navigate(`/article/${article.id}`)}
                className="group flex items-center gap-5 p-5 rounded-xl border border-border hover:border-gold/30 bg-card hover:shadow-[var(--shadow-md)] transition-all cursor-pointer"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-secondary">
                  {idx < 3 ? (
                    <TrendingUp className={`w-4 h-4 ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-slate-400' : 'text-amber-700'}`} />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{idx + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-bold mb-1 group-hover:text-gold transition-colors truncate">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{article.subtitle}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {article.profiles?.name || t('trending.anonymous')}
                    </span>
                    <div className="flex gap-2">
                      {article.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gold">
                    <GitFork className="w-4 h-4" />
                    <span className="font-medium">{article.branch_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{article.read_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center p-8 rounded-2xl border border-border bg-card">
          <Sparkles className="w-8 h-8 text-gold mx-auto mb-4" />
          <h3 className="text-lg font-serif font-bold mb-2">{t('trending.cta.title')}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {t('trending.cta.desc')}
          </p>
          <Button variant="gold" onClick={() => navigate('/')}>
            {t('trending.cta.btn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
