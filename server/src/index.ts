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
})
