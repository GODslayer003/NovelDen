import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import booksRouter   from './routes/books.js'
import authRouter    from './routes/auth.js'
import writersRouter from './routes/writers.js'
import newsRouter    from './routes/news.js'
import usersRouter   from './routes/users.js'
import profileRouter from './routes/profile.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../../.env') })

const app  = express()
const PORT = process.env.PORT || 5000

mongoose.connect(process.env.MONGODB_URI)
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

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5173'],
  credentials: true
}))

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
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => console.log(`\n☕  Novel Den API → http://localhost:${PORT}\n`))
