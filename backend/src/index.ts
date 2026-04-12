import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import directoriesRouter from './routes/directories.js'
import modelsRouter from './routes/models.js'
import aiRouter from './routes/ai.js'
import uploadsRouter from './routes/uploads.js'

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json({ limit: '20mb' }))

// Routes
app.use('/api/directories', directoriesRouter)
app.use('/api', modelsRouter)
app.use('/api/ai', aiRouter)
app.use('/api', uploadsRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Shadow Simulator Backend running on http://localhost:${PORT}`)
})
