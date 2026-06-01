import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '../data/db.json')

// Ensure directory exists
const dir = path.dirname(DB_FILE)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const initialData = {
  users: [
    {
      id: 'admin-1',
      name: 'Den Admin',
      email: 'admin@novelden.com',
      // bcrypt hash for 'admin123'
      password: '$2a$12$XiA12gG4zluqVrWuCUD2Ye1YI9xwZ3C.BJUAyajlMvkSfqmZlQAB2',
      role: 'admin',
      createdAt: new Date('2025-01-01')
    },
    {
      id: 'user-1',
      name: 'Jane Reader',
      email: 'user@novelden.com',
      // bcrypt hash for 'password123'
      password: '$2a$12$rQ8x6NLlNPEOOiXDffWJz.x.UcJF3HTiglgzql/JEtFDwQg4TaS2q',
      role: 'reader',
      createdAt: new Date('2025-01-01')
    }
  ],
  books: [
    {
      id: '1',
      title: 'The Midnight Library',
      author: 'Eleanor Voss',
      genre: 'Fantasy',
      rating: 4.9,
      cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=560&fit=crop',
      description: 'This story revolves around a mysterious library that exists between life and death, where every book represents a life unlived. Nora finds herself making impossible choices…',
      tags: ['Mystery', 'Philosophy', 'Fantasy'],
      createdAt: new Date('2025-01-01')
    },
    {
      id: '2',
      title: 'Crimson Sands',
      author: 'Marco Delacroix',
      genre: 'Adventure',
      rating: 4.7,
      cover: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=560&fit=crop',
      description: 'This story revolves around an exiled prince crossing scorching deserts to reclaim his throne. Ancient magic, treacherous allies, and a love that defies kingdoms…',
      tags: ['Adventure', 'Magic', 'Royal'],
      createdAt: new Date('2025-01-02')
    },
    {
      id: '3',
      title: 'Echoes of Yesterday',
      author: 'Seraphina Bloom',
      genre: 'Romance',
      rating: 4.8,
      cover: 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400&h=560&fit=crop',
      description: 'This story revolves around two souls separated by time who communicate through old letters hidden in a Victorian estate. Love transcending decades…',
      tags: ['Romance', 'Historical', 'Letters'],
      createdAt: new Date('2025-01-03')
    }
  ],
  chapters: [
    {
      id: 'c1',
      bookId: '1',
      title: 'Chapter 1: The Dark Shelf',
      type: 'chapter',
      order: 1.0,
      pdfUrl: '/uploads/sample.pdf',
      createdAt: new Date('2025-01-01')
    },
    {
      id: 'c2',
      bookId: '1',
      title: 'Chapter 2: The Hourglass',
      type: 'chapter',
      order: 2.0,
      pdfUrl: '/uploads/sample.pdf',
      createdAt: new Date('2025-01-02')
    },
    {
      id: 'c3',
      bookId: '1',
      title: 'Chapter 3: Decision Points',
      type: 'chapter',
      order: 3.0,
      pdfUrl: '/uploads/sample.pdf',
      createdAt: new Date('2026-05-30T10:00:00.000Z') // Posted 1 day ago (relative to local time May 31, 2026) -> locked for guest
    },
    {
      id: 'c4',
      bookId: '1',
      title: '3.1. Prequel: Nora\'s Childhood',
      type: 'prequel',
      order: 3.1,
      pdfUrl: '/uploads/sample.pdf',
      createdAt: new Date('2025-01-05')
    }
  ],
  comments: [
    {
      id: 'com1',
      chapterId: 'c1',
      userId: 'user-1',
      userName: 'Jane Reader',
      content: 'Wow, what an incredible opening chapter! The atmosphere is so thick.',
      createdAt: new Date('2025-01-01T12:00:00.000Z')
    }
  ],
  reviews: [
    {
      id: 'rev1',
      chapterId: 'c1',
      userId: 'user-1',
      userName: 'Jane Reader',
      rating: 5,
      comment: 'An absolute masterpiece of a first chapter.',
      createdAt: new Date('2025-01-01T12:05:00.000Z')
    }
  ]
}

export function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    writeDB(initialData)
    return initialData
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8')
    const data = JSON.parse(raw)
    // Parse dates
    if (data.users) data.users.forEach(u => u.createdAt = new Date(u.createdAt))
    if (data.books) data.books.forEach(b => b.createdAt = new Date(b.createdAt))
    if (data.chapters) data.chapters.forEach(c => c.createdAt = new Date(c.createdAt))
    if (data.comments) data.comments.forEach(co => co.createdAt = new Date(co.createdAt))
    if (data.reviews) data.reviews.forEach(r => r.createdAt = new Date(r.createdAt))
    return data
  } catch (err) {
    console.error('Error reading JSON DB', err)
    return initialData
  }
}

export function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing JSON DB', err)
  }
}
