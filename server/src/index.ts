import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { chatRouter } from './routes/chat.js'
import { articleRouter } from './routes/article.js'
import { branchRouter } from './routes/branch.js'
import { imageRouter } from './routes/image.js'
import { authRouter } from './routes/auth.js'
import { topicRouter } from './routes/topic.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/chat', chatRouter)
app.use('/api/articles', articleRouter)
app.use('/api/branches', branchRouter)
app.use('/api/images', imageRouter)
app.use('/api/topics', topicRouter)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

app.listen(PORT, () => {
  console.log(`[Forkzine Server] Running on http://localhost:${PORT}`)
  console.log(`[Forkzine Server] CORS origin: ${process.env.CORS_ORIGIN}`)

  // Keep-alive: ping self every 14 minutes to prevent Render free tier from sleeping
  const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
    : null

  if (KEEP_ALIVE_URL) {
    const INTERVAL_MS = 14 * 60 * 1000 // 14 minutes
    setInterval(async () => {
      try {
        const res = await fetch(KEEP_ALIVE_URL)
        console.log(`[Keep-Alive] Pinged ${KEEP_ALIVE_URL} — ${res.status}`)
      } catch (err: any) {
        console.warn(`[Keep-Alive] Failed to ping: ${err.message}`)
      }
    }, INTERVAL_MS)
    console.log(`[Keep-Alive] Scheduled every 14min → ${KEEP_ALIVE_URL}`)
  }
})
