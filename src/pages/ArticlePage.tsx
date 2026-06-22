import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getArticle, updateArticle, getCurrentUser, uploadImage, translateArticle, deleteArticle } from '@/lib/api'
import {
  ArrowLeft, GitFork, Eye, Heart, Share2, Bookmark,
  MessageSquarePlus, AlertCircle, Loader2, Pencil, Save, X, Upload, Languages, Trash2
} from 'lucide-react'
import { useT, useI18n } from '@/lib/i18n'

interface SectionData {
  id: string
  title: string
  content: string
  key_quote?: string
  image_prompt?: string
  image_url?: string
  order_index: number
}

interface ArticleData {
  id: string
  title: string
  subtitle: string
  summary: string
  template_style: string
  tags: string[]
  read_count: number
  branch_count: number
  published_at: string
  creator_id: string
  cover_gradient: string
  isOwner?: boolean
  profiles: { id: string; name: string; title?: string; avatar_url?: string }
  sections: SectionData[]
}

export function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useT()
  const { locale } = useI18n()
  const [article, setArticle] = useState<ArticleData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<ArticleData | null>(null)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translatedData, setTranslatedData] = useState<{
    title: string
    subtitle: string
    summary: string
    sections: { title: string; content: string; key_quote: string }[]
  } | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)

  const currentUser = getCurrentUser()
  const isOwner = article?.isOwner || (
    currentUser && article && (
      article.creator_id === currentUser.id || article.profiles?.id === currentUser.id
    )
  )

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    getArticle(id)
      .then(data => {
        setArticle(data)
      })
      .catch(() => {
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  const startEditing = () => {
    setEditData(JSON.parse(JSON.stringify(article)))
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditData(null)
    setEditing(false)
  }

  const saveEdits = async () => {
    if (!editData || !id) return
    setSaving(true)
    try {
      await updateArticle(id, {
        title: editData.title,
        subtitle: editData.subtitle,
        summary: editData.summary,
        cover_gradient: editData.cover_gradient,
        sections: editData.sections.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          key_quote: s.key_quote,
          image_prompt: s.image_prompt,
          image_url: s.image_url,
        })),
      })
      setArticle(editData)
      setEditing(false)
      setEditData(null)
    } catch (e: any) {
      alert(t('article.saveFailed', { msg: e.message || t('article.unknownError') }))
    } finally {
      setSaving(false)
    }
  }

  const updateSection = (idx: number, field: keyof SectionData, value: string) => {
    if (!editData) return
    const newSections = [...editData.sections]
    newSections[idx] = { ...newSections[idx], [field]: value }
    setEditData({ ...editData, sections: newSections })
  }

  const handleImageUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx)
    try {
      const { url } = await uploadImage(file)
      updateSection(idx, 'image_url', url)
    } catch (e: any) {
      alert(t('article.imageUploadFail', { msg: e.message || t('article.unknownError') }))
    } finally {
      setUploadingIdx(null)
    }
  }

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    try {
      const { url } = await uploadImage(file)
      setEditData({ ...editData!, cover_gradient: url })
    } catch (e: any) {
      alert(t('article.coverUploadFail', { msg: e.message || t('article.unknownError') }))
    } finally {
      setUploadingCover(false)
    }
  }

  const handleTranslate = async () => {
    if (!id) return
    // Determine target language: if user locale matches article language, translate to the "other" language
    // Simple heuristic: detect if article is primarily Chinese or not
    const articleText = article?.title || ''
    const isChinese = /[\u4e00-\u9fff]/.test(articleText)
    const targetLang = isChinese && locale === 'en' ? 'en'
      : !isChinese && locale === 'zh' ? 'zh'
      : locale === 'zh' ? 'zh' : 'en'

    setTranslating(true)
    try {
      const { translated } = await translateArticle(id, targetLang)
      setTranslatedData(translated)
      setShowTranslation(true)
    } catch (e: any) {
      alert(t('article.translateFailed', { msg: e.message || t('article.unknownError') }))
    } finally {
      setTranslating(false)
    }
  }

  const toggleTranslation = () => {
    if (!translatedData) {
      handleTranslate()
    } else {
      setShowTranslation(!showTranslation)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    const confirmed = window.confirm(t('article.deleteConfirm'))
    if (!confirmed) return
    try {
      await deleteArticle(id)
      navigate('/')
    } catch (e: any) {
      alert(t('article.deleteFailed', { msg: e.message || t('article.unknownError') }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-serif font-bold mb-2">{t('article.notFound.title')}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t('article.notFound.desc')}</p>
        <Button variant="gold" onClick={() => navigate('/')}>{t('article.notFound.cta')}</Button>
      </div>
    )
  }

  if (!article) return null

  const displayData = editing ? editData! : article

  // Build translated display data if translation is active
  const displayTitle = showTranslation && translatedData ? translatedData.title : displayData.title
  const displaySubtitle = showTranslation && translatedData ? translatedData.subtitle : displayData.subtitle
  const displaySummary = showTranslation && translatedData ? translatedData.summary : displayData.summary
  const getTranslatedSection = (idx: number) => {
    if (showTranslation && translatedData && translatedData.sections[idx]) {
      return translatedData.sections[idx]
    }
    return null
  }

  return (
    <article className="pt-16">
      {/* Cover */}
      <ArticleCover
        article={displayData}
        editing={editing}
        locale={locale}
        translatedTitle={showTranslation && translatedData ? translatedData.title : undefined}
        translatedSubtitle={showTranslation && translatedData ? translatedData.subtitle : undefined}
        onUpdate={editing ? (field, value) => setEditData({ ...editData!, [field]: value }) : undefined}
        onCoverUpload={editing ? handleCoverUpload : undefined}
        uploadingCover={uploadingCover}
      />

      {/* Edit toolbar */}
      {isOwner && (
        <div className="sticky top-16 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
          <div className="container mx-auto px-6 max-w-3xl h-12 flex items-center justify-between">
            {editing ? (
              <>
                <span className="text-sm text-gold font-medium flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5" /> {t('article.editMode')}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={cancelEditing} disabled={saving}>
                    <X className="w-3.5 h-3.5" /> {t('article.cancel')}
                  </Button>
                  <Button variant="gold" size="sm" className="gap-1.5" onClick={saveEdits} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {t('article.save')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">{t('article.ownerHint')}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-red-400 hover:text-red-300 hover:border-red-400/50" onClick={handleDelete}>
                    <Trash2 className="w-3.5 h-3.5" /> {t('article.delete')}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
                    <Pencil className="w-3.5 h-3.5" /> {t('article.edit')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Article body */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Translate button */}
          {!editing && (
            <div className="flex justify-end mb-6">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={toggleTranslation}
                disabled={translating}
              >
                {translating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4" />
                )}
                {translating
                  ? t('article.translating')
                  : showTranslation
                    ? t('article.showOriginal')
                    : t('article.translate')
                }
              </Button>
            </div>
          )}

          {/* Summary */}
          <div className="mb-16 pb-8 border-b border-border">
            {editing ? (
              <textarea
                value={editData!.summary}
                onChange={e => setEditData({ ...editData!, summary: e.target.value })}
                className="w-full text-lg leading-relaxed text-foreground/80 bg-transparent border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-gold/30"
                rows={3}
              />
            ) : (
              <p className="text-lg leading-relaxed text-foreground/80">
                {displaySummary}
              </p>
            )}
          </div>

          {/* Sections */}
          {displayData.sections
            .sort((a, b) => a.order_index - b.order_index)
            .map((section, idx) => {
            const translated = getTranslatedSection(idx)
            const sectionTitle = translated ? translated.title : section.title
            const sectionContent = translated ? translated.content : section.content
            const sectionQuote = translated ? translated.key_quote : section.key_quote

            return (
            <section key={section.id || idx} className="mb-16 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              {/* Section header */}
              {editing ? (
                <input
                  type="text"
                  value={section.title}
                  onChange={e => updateSection(idx, 'title', e.target.value)}
                  className="w-full text-2xl font-serif font-bold bg-transparent border-b border-border pb-2 mb-6 focus:outline-none focus:border-gold/50"
                />
              ) : (
                <h2 className="text-2xl font-serif font-bold mag-header mb-6">{sectionTitle}</h2>
              )}

              {/* Key quote */}
              {editing ? (
                <div className="my-8">
                  <label className="text-xs text-muted-foreground mb-1 block">{t('article.keyQuote')}</label>
                  <input
                    type="text"
                    value={section.key_quote || ''}
                    onChange={e => updateSection(idx, 'key_quote', e.target.value)}
                    placeholder={t('article.keyQuotePlaceholder')}
                    className="w-full text-sm bg-transparent border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold/30 italic"
                  />
                </div>
              ) : sectionQuote ? (
                <blockquote className="pull-quote my-8">
                  {sectionQuote}
                </blockquote>
              ) : null}

              {/* Content */}
              {editing ? (
                <textarea
                  value={section.content}
                  onChange={e => updateSection(idx, 'content', e.target.value)}
                  className="w-full text-foreground/80 leading-[1.8] text-base bg-transparent border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-gold/30"
                  rows={Math.max(5, Math.ceil(section.content.length / 60))}
                />
              ) : (
                <div className="prose prose-lg max-w-none">
                  <p className="text-foreground/80 leading-[1.8] text-base whitespace-pre-wrap">
                    {sectionContent}
                  </p>
                </div>
              )}

              {/* Section image */}
              {editing ? (
                <div className="mt-8 space-y-3">
                  {/* Upload button */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors text-sm">
                      {uploadingIdx === idx ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploadingIdx === idx ? t('article.uploading') : t('article.uploadImage')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingIdx !== null}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(idx, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {section.image_url && !section.image_url.includes('placehold.co') && (
                      <button
                        onClick={() => updateSection(idx, 'image_url', '')}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        {t('article.removeImage')}
                      </button>
                    )}
                  </div>

                  {/* Image prompt */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{t('article.imageDescLabel')}</label>
                    <input
                      type="text"
                      value={section.image_prompt || ''}
                      onChange={e => updateSection(idx, 'image_prompt', e.target.value)}
                      placeholder={t('article.imageDescPlaceholder')}
                      className="w-full text-sm bg-transparent border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>

                  {/* Preview */}
                  {(section.image_url && !section.image_url.includes('placehold.co')) ? (
                    <div className="aspect-[21/9] rounded-lg overflow-hidden">
                      <img src={section.image_url} alt={section.title} className="w-full h-full object-cover" />
                    </div>
                  ) : section.image_prompt ? (
                    <div className="aspect-[21/9] rounded-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 flex items-center justify-center border border-white/5">
                      <p className="text-primary-foreground/60 text-xs italic px-6 text-center">{section.image_prompt}</p>
                    </div>
                  ) : null}
                </div>
              ) : (section.image_url && !section.image_url.includes('placehold.co')) ? (
                <div className="mt-8 rounded-lg overflow-hidden">
                  <img src={section.image_url} alt={section.title} className="w-full" />
                </div>
              ) : section.image_prompt ? (
                <div className="mt-8 aspect-[21/9] rounded-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 flex items-center justify-center relative overflow-hidden border border-white/5">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)]" />
                  <div className="relative z-10 text-center px-8 max-w-lg">
                    <p className="text-primary-foreground/60 text-sm leading-relaxed italic">
                      {section.image_prompt}
                    </p>
                    <span className="inline-block mt-3 text-[10px] text-primary-foreground/30 border border-primary-foreground/10 rounded-full px-2 py-0.5">
                      {t('article.aiImageIdea')}
                    </span>
                  </div>
                </div>
              ) : null}
            </section>
            )
          })}

          {/* End mark */}
          <div className="section-divider">
            <div className="w-3 h-3 rounded-full bg-gold" />
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Heart className="w-4 h-4" /> {t('article.favorite')}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" /> {t('article.share')}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="w-4 h-4" /> {t('article.bookmark')}
              </Button>
            </div>
            <Link to="/chat">
              <Button variant="gold" size="sm" className="gap-2">
                <MessageSquarePlus className="w-4 h-4" /> {t('article.chatAbout')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function ArticleCover({ article, editing, locale, translatedTitle, translatedSubtitle, onUpdate, onCoverUpload, uploadingCover }: {
  article: ArticleData
  editing?: boolean
  locale: string
  translatedTitle?: string
  translatedSubtitle?: string
  onUpdate?: (field: string, value: string) => void
  onCoverUpload?: (file: File) => void
  uploadingCover?: boolean
}) {
  const t = useT()
  const gradients = [
    'from-navy via-navy-light to-purple-900',
    'from-slate-900 via-indigo-900 to-slate-800',
    'from-emerald-900 via-teal-900 to-slate-900',
  ]
  const gradient = gradients[Math.abs(article.title.length) % gradients.length]
  const hasCoverImage = article.cover_gradient?.startsWith('http')

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const authorName = article.profiles?.name || t('article.anonymous')

  const templateLabel = article.template_style === 'deep'
    ? t('article.deepInterview')
    : article.template_style === 'light'
      ? t('article.lightChat')
      : t('article.debateStyle')

  return (
    <div className={`relative min-h-[50vh] flex items-end ${hasCoverImage ? '' : `bg-gradient-to-br ${gradient}`}`}>
      {/* Cover image or gradient */}
      {hasCoverImage && (
        <img src={article.cover_gradient} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {hasCoverImage && <div className="absolute inset-0 bg-black/50" />}

      {/* Decorations (only for gradient) */}
      {!hasCoverImage && (
        <div className="absolute inset-0">
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-gold/5 blur-3xl" />
        </div>
      )}

      {/* Back button */}
      <div className="absolute top-20 left-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1">
            <ArrowLeft className="w-4 h-4" /> {t('article.back')}
          </Button>
        </Link>
      </div>

      {/* Cover upload button (edit mode) */}
      {editing && (
        <div className="absolute top-20 right-6">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer transition-colors text-xs text-primary-foreground">
            {uploadingCover ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploadingCover ? t('article.uploading') : t('article.changeCover')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploadingCover}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file && onCoverUpload) onCoverUpload(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}

      <div className="container mx-auto px-6 pb-16 pt-32 relative z-10">
        <div className="max-w-2xl">
          <div className="flex gap-2 mb-6">
            {article.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 text-xs rounded-full bg-white/10 text-white/80 border border-white/10">
                {tag}
              </span>
            ))}
          </div>

          {editing ? (
            <>
              <input
                type="text"
                value={article.title}
                onChange={e => onUpdate?.('title', e.target.value)}
                className="w-full text-4xl md:text-5xl font-serif font-bold text-primary-foreground leading-tight mb-3 bg-transparent border-b border-white/20 pb-2 focus:outline-none focus:border-gold/50"
              />
              <input
                type="text"
                value={article.subtitle}
                onChange={e => onUpdate?.('subtitle', e.target.value)}
                className="w-full text-xl text-primary-foreground/60 font-serif italic mb-8 bg-transparent border-b border-white/10 pb-2 focus:outline-none focus:border-gold/50"
              />
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground leading-tight mb-3">
                {translatedTitle || article.title}
              </h1>
              <p className="text-xl text-primary-foreground/60 font-serif italic mb-8">
                {translatedSubtitle || article.subtitle}
              </p>
            </>
          )}

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {authorName[0]}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-primary-foreground">{authorName}</div>
              <div className="text-xs text-primary-foreground/50">{templateLabel}</div>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-primary-foreground/50">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {article.read_count}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" /> {article.branch_count} {t('article.branches')}
              </span>
              {article.published_at && <span>{formatDate(article.published_at)}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
