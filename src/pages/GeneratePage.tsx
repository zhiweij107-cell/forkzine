import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, BookOpen, Wand2, RefreshCw, Check,
  Image, Palette, Type, AlertCircle
} from 'lucide-react'
import { publishArticle as publishToAPI } from '@/lib/api'

interface GeneratedSection {
  title: string
  content: string
  keyQuote?: string
  imagePrompt?: string
}

interface GeneratedArticle {
  title: string
  subtitle: string
  summary: string
  sections: GeneratedSection[]
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'

const TEMPLATES = [
  { id: 'deep', name: '深度对话', desc: '类《人物》杂志长访谈' },
  { id: 'light', name: '轻松漫谈', desc: '类播客文字稿' },
  { id: 'debate', name: '观点碰撞', desc: '类辩论赛实录' },
]

export function GeneratePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { messages, topicTitle } = (location.state as { messages?: { role: string; content: string }[]; topicTitle?: string }) || {}

  const [step, setStep] = useState<'template' | 'generating' | 'preview' | 'error'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState('deep')
  const [article, setArticle] = useState<GeneratedArticle | null>(null)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)

  // If no messages passed, show error
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setError('没有对话内容可以生成文章。请先完成一段对话。')
      setStep('error')
    }
  }, [messages])

  const generateArticle = async () => {
    setStep('generating')
    setError('')
    setRetryable(false)
    setRetryCountdown(0)

    try {
      const token = (() => {
        try {
          const session = JSON.parse(localStorage.getItem('forkzine_session') || '{}')
          return session.access_token || null
        } catch { return null }
      })()

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Start an interview first if authenticated
      let currentInterviewId = interviewId
      if (token && !currentInterviewId) {
        try {
          const startRes = await fetch(`${API_BASE}/chat/start`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ topicTitle: topicTitle || '自由对话' }),
          })
          if (startRes.ok) {
            const startData = await startRes.json()
            currentInterviewId = startData.interviewId
            setInterviewId(currentInterviewId)
          }
        } catch {
          // Continue without interviewId - article won't be saved to DB
        }
      }

      const res = await fetch(`${API_BASE}/articles/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages,
          templateStyle: selectedTemplate,
          topicTitle,
          interviewId: currentInterviewId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429 || data.retryable) {
          setRetryable(true)
          setError(data.error || 'AI 服务暂时繁忙，请稍后重试')
          setStep('error')
          startRetryCountdown()
          return
        }
        throw new Error(data.error || '生成文章失败')
      }

      const data = await res.json()
      setArticle(data.article)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成文章失败，请重试')
      setStep('error')
    }
  }

  const startRetryCountdown = () => {
    setRetryCountdown(30)
    const interval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" /> 返回对话
              </Button>
            </button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium">生成杂志文章</span>
            </div>
          </div>

          {step === 'preview' && (
            <Button variant="gold" size="sm" className="gap-2" onClick={async () => {
              if (interviewId) {
                try {
                  await publishToAPI(interviewId)
                } catch (e) {
                  console.error('Publish failed:', e)
                }
              }
              navigate('/')
            }}>
              <Check className="w-3.5 h-3.5" /> 发布文章
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Step: Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
              retryable ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {retryable ? (
                <RefreshCw className="w-8 h-8 text-amber-400" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <h2 className="text-xl font-serif font-bold mb-2">
              {retryable ? 'AI 服务暂时繁忙' : '生成失败'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            {retryable && retryCountdown > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                建议等待 <span className="text-amber-400 font-mono">{retryCountdown}s</span> 后重试
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/chat')}>
                返回对话
              </Button>
              {messages && messages.length > 0 && (
                <Button variant="gold" onClick={generateArticle}>
                  {retryable ? '立即重试' : '重新生成'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step: Template Selection */}
        {step === 'template' && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif font-bold mb-2">选择杂志风格</h2>
              <p className="text-sm text-muted-foreground">不同的风格模板会影响文章的排版和语言风格</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-6 rounded-xl border text-left transition-all ${
                    selectedTemplate === t.id
                      ? 'border-gold bg-gold/5 shadow-[var(--shadow-md)]'
                      : 'border-border hover:border-gold/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {t.id === 'deep' && <BookOpen className="w-4 h-4 text-gold" />}
                    {t.id === 'light' && <Type className="w-4 h-4 text-gold" />}
                    {t.id === 'debate' && <Palette className="w-4 h-4 text-gold" />}
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <Button variant="gold" size="lg" className="gap-2" onClick={generateArticle}>
                生成文章 <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-gold animate-spin" />
            </div>
            <h2 className="text-xl font-serif font-bold mb-2">正在生成文章...</h2>
            <p className="text-sm text-muted-foreground">AI 正在将你的对话转化为结构化的杂志文章，这可能需要 20-60 秒</p>

            <div className="mt-8 space-y-3 w-full max-w-sm">
              <ProgressStep label="分析对话结构" done />
              <ProgressStep label="提取核心观点" active />
              <ProgressStep label="生成杂志文章" />
              <ProgressStep label="生成配图描述" />
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && article && (
          <div className="animate-fade-in">
            <div className="mb-8 p-4 rounded-lg bg-gold/5 border border-gold/20 flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-gold flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                文章已生成。你可以编辑标题、调整章节顺序，或重新生成配图。满意后点击右上角"发布文章"。
              </p>
            </div>

            {/* Article Preview */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Cover preview */}
              <div className="aspect-[21/9] bg-gradient-to-br from-navy via-navy-light to-purple-900 relative flex items-end p-8">
                <div>
                  <input
                    type="text"
                    defaultValue={article.title}
                    className="bg-transparent text-3xl font-serif font-bold text-primary-foreground border-none outline-none w-full"
                  />
                  <input
                    type="text"
                    defaultValue={article.subtitle}
                    className="bg-transparent text-lg font-serif italic text-primary-foreground/60 border-none outline-none w-full mt-1"
                  />
                </div>
                <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Image className="w-4 h-4 text-primary-foreground/80" />
                </button>
              </div>

              {/* Summary */}
              {article.summary && (
                <div className="px-8 pt-6">
                  <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-gold/30 pl-4">
                    {article.summary}
                  </p>
                </div>
              )}

              {/* Sections preview */}
              <div className="p-8 space-y-8">
                {article.sections.map((section, idx) => (
                  <div key={idx} className="pb-8 border-b border-border last:border-none last:pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-serif font-bold">{section.title}</h3>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                        章节 {idx + 1}
                      </span>
                    </div>
                    {section.keyQuote && (
                      <blockquote className="pull-quote my-4 text-base">
                        {section.keyQuote}
                      </blockquote>
                    )}
                    <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </p>
                    <div className="mt-4 aspect-[16/5] rounded-lg bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-900 flex items-center justify-center">
                      <div className="text-center">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs text-primary-foreground/70 transition-colors">
                          <Image className="w-3.5 h-3.5" /> 生成配图
                        </button>
                        {section.imagePrompt && (
                          <p className="mt-2 text-[10px] text-primary-foreground/40 max-w-xs">
                            {section.imagePrompt}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regenerate option */}
            <div className="mt-6 flex justify-center">
              <Button variant="outline" className="gap-2" onClick={() => setStep('template')}>
                <RefreshCw className="w-4 h-4" />
                换一种风格重新生成
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
        done ? 'bg-gold' : active ? 'border-2 border-gold animate-pulse-soft' : 'border border-border'
      }`}>
        {done && <Check className="w-3 h-3 text-primary" />}
      </div>
      <span className={`text-sm ${done ? 'text-foreground' : active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}
