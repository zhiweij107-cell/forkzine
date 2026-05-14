/**
 * Published articles storage (localStorage-based)
 */

export interface PublishedArticle {
  id: string
  title: string
  subtitle: string
  summary: string
  topicTitle: string
  sections: {
    title: string
    content: string
    keyQuote?: string
    imagePrompt?: string
    imageUrl?: string
  }[]
  author: {
    name: string
    email?: string
  }
  templateStyle: string
  publishedAt: string
  readCount: number
  branchCount: number
  tags: string[]
}

const STORAGE_KEY = 'forkzine_articles'

export function getPublishedArticles(): PublishedArticle[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function publishArticle(article: Omit<PublishedArticle, 'id' | 'publishedAt' | 'readCount' | 'branchCount'>): PublishedArticle {
  const published: PublishedArticle = {
    ...article,
    id: `article-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    publishedAt: new Date().toISOString(),
    readCount: 0,
    branchCount: 0,
  }

  const articles = getPublishedArticles()
  articles.unshift(published)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles))
  return published
}

export function getArticleById(id: string): PublishedArticle | null {
  const articles = getPublishedArticles()
  return articles.find(a => a.id === id) || null
}

export function incrementReadCount(id: string): void {
  const articles = getPublishedArticles()
  const article = articles.find(a => a.id === id)
  if (article) {
    article.readCount++
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles))
  }
}

export type SortMode = 'latest' | 'popular' | 'topic'

export function getSortedArticles(sort: SortMode, topicFilter?: string): PublishedArticle[] {
  let articles = getPublishedArticles()

  if (topicFilter) {
    articles = articles.filter(a =>
      a.topicTitle.includes(topicFilter) || a.tags.some(t => t.includes(topicFilter))
    )
  }

  switch (sort) {
    case 'latest':
      return articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    case 'popular':
      return articles.sort((a, b) => b.readCount - a.readCount)
    case 'topic':
      return articles.sort((a, b) => a.topicTitle.localeCompare(b.topicTitle))
    default:
      return articles
  }
}
