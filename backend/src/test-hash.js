import bcrypt from 'bcryptjs'

const adminHash = await bcrypt.hash('admin123', 12)
console.log('admin123:', adminHash)

const userHash = await bcrypt.hash('password123', 12)
console.log('password123:', userHash)
