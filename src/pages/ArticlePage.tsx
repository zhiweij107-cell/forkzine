import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getArticleById, incrementReadCount, type PublishedArticle } from '@/lib/articles'
import {
  ArrowLeft, GitFork, Eye, Heart, Share2, Bookmark,
  MessageSquarePlus, AlertCircle
} from 'lucide-react'

export function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<PublishedArticle | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      return
    }
    const found = getArticleById(id)
    if (found) {
      setArticle(found)
      incrementReadCount(id)
    } else {
      setNotFound(true)
    }
  }, [id])

  if (notFound) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-serif font-bold mb-2">文章不存在</h2>
        <p className="text-sm text-muted-foreground mb-6">该文章可能已被删除或链接无效</p>
        <Button variant="gold" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    )
  }

  if (!article) return null

  return (
    <article className="pt-16">
      {/* Cover */}
      <ArticleCover article={article} />

      {/* Article body */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Summary */}
          <div className="mb-16 pb-8 border-b border-border">
            <p className="text-lg leading-relaxed text-foreground/80">
              {article.summary}
            </p>
          </div>

          {/* Sections */}
          {article.sections.map((section, idx) => (
            <section key={idx} className="mb-16 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              {/* Section header */}
              <h2 className="text-2xl font-serif font-bold mag-header mb-6">{section.title}</h2>

              {/* Key quote */}
              {section.keyQuote && (
                <blockquote className="pull-quote my-8">
                  {section.keyQuote}
                </blockquote>
              )}

              {/* Content */}
              <div className="prose prose-lg max-w-none">
                <p className="text-foreground/80 leading-[1.8] text-base whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>

              {/* Section image placeholder */}
              {section.imagePrompt && (
                <div className="mt-8 aspect-[21/9] rounded-lg bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.3))]" />
                  <span className="text-primary-foreground/30 text-sm font-medium relative z-10">
                    {section.imagePrompt}
                  </span>
                </div>
              )}
            </section>
          ))}

          {/* End mark */}
          <div className="section-divider">
            <div className="w-3 h-3 rounded-full bg-gold" />
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Heart className="w-4 h-4" /> 收藏
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" /> 分享
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="w-4 h-4" /> 书签
              </Button>
            </div>
            <Link to="/chat">
              <Button variant="gold" size="sm" className="gap-2">
                <MessageSquarePlus className="w-4 h-4" /> 我也想聊这个话题
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function ArticleCover({ article }: { article: PublishedArticle }) {
  const gradients = [
    'from-navy via-navy-light to-purple-900',
    'from-slate-900 via-indigo-900 to-slate-800',
    'from-emerald-900 via-teal-900 to-slate-900',
  ]
  const gradient = gradients[Math.abs(article.title.length) % gradients.length]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className={`relative min-h-[50vh] flex items-end bg-gradient-to-br ${gradient}`}>
      {/* Decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-gold/5 blur-3xl" />
      </div>

      {/* Back button */}
      <div className="absolute top-20 left-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1">
            <ArrowLeft className="w-4 h-4" /> 返回
          </Button>
        </Link>
      </div>

      <div className="container mx-auto px-6 pb-16 pt-32 relative z-10">
        <div className="max-w-2xl">
          <div className="flex gap-2 mb-6">
            {article.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 text-xs rounded-full bg-white/10 text-white/80 border border-white/10">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground leading-tight mb-3">
            {article.title}
          </h1>
          <p className="text-xl text-primary-foreground/60 font-serif italic mb-8">
            {article.subtitle}
          </p>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {article.author.name[0]}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-primary-foreground">{article.author.name}</div>
              <div className="text-xs text-primary-foreground/50">{article.templateStyle === 'deep' ? '深度访谈' : article.templateStyle === 'light' ? '轻松漫谈' : '观点碰撞'}</div>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-primary-foreground/50">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {article.readCount}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" /> {article.branchCount} 分支
              </span>
              <span>{formatDate(article.publishedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
