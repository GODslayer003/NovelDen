import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import multer from 'multer'
import booksRouter   from './routes/books.js'
import authRouter    from './routes/auth.js'
import writersRouter from './routes/writers.js'
import newsRouter    from './routes/news.js'
import usersRouter   from './routes/users.js'
import profileRouter from './routes/profile.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load dotenv from backend/.env if present, otherwise fallback to workspace root .env
const backendEnv = path.join(__dirname, '../../.env')
const workspaceEnv = path.join(__dirname, '../../../.env')
if (fs.existsSync(backendEnv)) {
  config({ path: backendEnv })
} else if (fs.existsSync(workspaceEnv)) {
  config({ path: workspaceEnv })
} else {
  // fallback to default dotenv behavior (NODE dotenv will look at process.env already)
  config()
}

const app  = express()
const PORT = process.env.PORT || 5000

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:5173',
  'https://novelden.vercel.app',
  'https://adminnovelden.vercel.app'
]

const envAllowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins])

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true)
    }

    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`CORS blocked origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err))

// Configure helmet (allowing iframe embeds from self to render PDFs inside modals)
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for local testing ease (rendering PDFs inline)
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  xFrameOptions: false // Allow iframes from frontend
}))

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(morgan('dev'))

// Increase body parser limits to allow file base64 or larger uploads
app.use(express.json({ limit: '30mb' }))
app.use(express.urlencoded({ limit: '30mb', extended: true }))

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')))

app.get('/api/health', (_, res) => res.json({ status: 'ok', message: 'Novel Den API running' }))
app.use('/api/books',   booksRouter)
app.use('/api/auth',    authRouter)
app.use('/api/writers', writersRouter)
app.use('/api/news',    newsRouter)
app.use('/api/users',   usersRouter)
app.use('/api/profile', profileRouter)

// Error Handler
app.use((err, req, res, next) => {
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500)
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error'

  console.error(err.stack || err)
  res.status(status).json({ error: message })
})

app.listen(PORT, () => console.log(`\n☕  Novel Den API → http://localhost:${PORT}\n`))
