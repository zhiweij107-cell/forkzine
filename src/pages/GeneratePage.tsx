import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, BookOpen, Wand2, RefreshCw, Check,
  Palette, Type, AlertCircle, Upload, Loader2
} from 'lucide-react'
import { publishArticle as publishToAPI, publishArticleDirect, uploadImage } from '@/lib/api'

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
              try {
                if (interviewId) {
                  await publishToAPI(interviewId)
                } else if (article) {
                  await publishArticleDirect({
                    title: article.title,
                    subtitle: article.subtitle,
                    summary: article.summary,
                    sections: article.sections,
                    templateStyle: selectedTemplate,
                    topicTitle: topicTitle || '自由对话',
                    tags: [topicTitle || '自由对话', selectedTemplate === 'deep' ? '深度访谈' : selectedTemplate === 'light' ? '轻松漫谈' : '观点碰撞'],
                  })
                }
                navigate('/')
              } catch (e: any) {
                console.error('Publish failed:', e)
                const msg = e?.message || '未知错误'
                if (msg.includes('authorization') || msg.includes('token') || msg.includes('401')) {
                  alert('登录已过期，请重新登录后再发布')
                  navigate('/auth')
                } else {
                  alert(`发布失败: ${msg}`)
                }
              }
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
          <EditablePreview
            article={article}
            onArticleChange={setArticle}
            selectedTemplate={selectedTemplate}
            topicTitle={topicTitle}
            onRegenerate={() => setStep('template')}
          />
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

function EditablePreview({
  article, onArticleChange, onRegenerate
}: {
  article: GeneratedArticle
  onArticleChange: (article: GeneratedArticle) => void
  selectedTemplate: string
  topicTitle?: string
  onRegenerate: () => void
}) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [uploadingCover, setUploadingCover] = useState(false)

  const updateField = (field: keyof GeneratedArticle, value: string) => {
    onArticleChange({ ...article, [field]: value })
  }

  const updateSection = (idx: number, field: keyof GeneratedSection, value: string) => {
    const newSections = [...article.sections]
    newSections[idx] = { ...newSections[idx], [field]: value }
    onArticleChange({ ...article, sections: newSections })
  }

  const handleSectionImageUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx)
    try {
      const { url } = await uploadImage(file)
      updateSection(idx, 'imagePrompt', url)
    } catch {
      alert('图片上传失败')
    } finally {
      setUploadingIdx(null)
    }
  }

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    try {
      const { url } = await uploadImage(file)
      setCoverUrl(url)
    } catch {
      alert('封面上传失败')
    } finally {
      setUploadingCover(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 p-4 rounded-lg bg-gold/5 border border-gold/20 flex items-center gap-3">
        <Wand2 className="w-5 h-5 text-gold flex-shrink-0" />
        <p className="text-sm text-foreground/80">
          文章已生成，所有内容均可直接编辑。修改满意后点击右上角"发布文章"。
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Cover */}
        <div className="aspect-[21/9] relative flex items-end p-8 overflow-hidden">
          {coverUrl ? (
            <>
              <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-purple-900" />
          )}
          <div className="relative z-10 w-full">
            <input
              type="text"
              value={article.title}
              onChange={e => updateField('title', e.target.value)}
              className="bg-transparent text-3xl font-serif font-bold text-primary-foreground border-none outline-none w-full placeholder:text-primary-foreground/30"
              placeholder="文章标题"
            />
            <input
              type="text"
              value={article.subtitle}
              onChange={e => updateField('subtitle', e.target.value)}
              className="bg-transparent text-lg font-serif italic text-primary-foreground/60 border-none outline-none w-full mt-1 placeholder:text-primary-foreground/20"
              placeholder="副标题"
            />
          </div>
          <label className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer z-10">
            {uploadingCover ? (
              <Loader2 className="w-4 h-4 text-primary-foreground/80 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-primary-foreground/80" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploadingCover}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleCoverUpload(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        {/* Summary */}
        <div className="px-8 pt-6">
          <label className="text-xs text-muted-foreground mb-1 block">文章摘要</label>
          <textarea
            value={article.summary}
            onChange={e => updateField('summary', e.target.value)}
            className="w-full text-sm text-muted-foreground italic leading-relaxed border-l-2 border-gold/30 pl-4 bg-transparent resize-none focus:outline-none focus:border-gold"
            rows={3}
          />
        </div>

        {/* Sections */}
        <div className="p-8 space-y-8">
          {article.sections.map((section, idx) => (
            <div key={idx} className="pb-8 border-b border-border last:border-none last:pb-0">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={section.title}
                  onChange={e => updateSection(idx, 'title', e.target.value)}
                  className="text-lg font-serif font-bold bg-transparent border-none outline-none flex-1 focus:border-b focus:border-gold/30"
                  placeholder="章节标题"
                />
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded ml-3 flex-shrink-0">
                  章节 {idx + 1}
                </span>
              </div>

              {/* Key quote */}
              <div className="my-4">
                <label className="text-xs text-muted-foreground mb-1 block">精华引言</label>
                <input
                  type="text"
                  value={section.keyQuote || ''}
                  onChange={e => updateSection(idx, 'keyQuote', e.target.value)}
                  className="w-full text-sm italic bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="本章节的精华引言..."
                />
              </div>

              {/* Content */}
              <textarea
                value={section.content}
                onChange={e => updateSection(idx, 'content', e.target.value)}
                className="w-full text-sm text-foreground/70 leading-relaxed bg-transparent border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-gold/30"
                rows={Math.max(4, Math.ceil(section.content.length / 70))}
              />

              {/* Image section */}
              <div className="mt-4 rounded-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 border border-white/5 overflow-hidden">
                {section.imagePrompt?.startsWith('http') ? (
                  <div className="relative">
                    <img src={section.imagePrompt} alt="" className="w-full aspect-[16/5] object-cover" />
                    <button
                      onClick={() => updateSection(idx, 'imagePrompt', '')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-xs text-white hover:bg-black/80"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <div className="aspect-[16/5] flex items-center justify-center p-4">
                    <div className="text-center">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs text-primary-foreground/70 transition-colors cursor-pointer">
                        {uploadingIdx === idx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        上传配图
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={uploadingIdx !== null}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleSectionImageUpload(idx, file)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {section.imagePrompt && (
                        <p className="mt-3 text-xs text-primary-foreground/50 italic max-w-sm">
                          {section.imagePrompt}
                        </p>
                      )}
                      <span className="inline-block mt-2 text-[10px] text-primary-foreground/30 border border-primary-foreground/10 rounded-full px-2 py-0.5">
                        AI 配图构想
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Image prompt editor */}
              <div className="mt-2">
                <input
                  type="text"
                  value={section.imagePrompt?.startsWith('http') ? '' : (section.imagePrompt || '')}
                  onChange={e => updateSection(idx, 'imagePrompt', e.target.value)}
                  className="w-full text-xs bg-transparent border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/30 text-muted-foreground"
                  placeholder="配图描述（Midjourney 提示词）"
                  disabled={section.imagePrompt?.startsWith('http')}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regenerate option */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" className="gap-2" onClick={onRegenerate}>
          <RefreshCw className="w-4 h-4" />
          换一种风格重新生成
        </Button>
      </div>
    </div>
  )
}
