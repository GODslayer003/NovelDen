import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Book from '../models/Book.js';
import { uploadImage, deleteCloudinaryFile } from '../middleware/cloudinary-upload.js';
import { publicAssetUrl } from '../utils/assets.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';

// JWT middleware for profile routes
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET /api/profile — Full profile with read history and discussions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Get all books to search for user's activity
    const books = await Book.find({}).populate('writerId', 'name');
    
    // Build Read History: chapters where readBy includes this user's ID
    const readHistory = [];
    books.forEach(book => {
      (book.chapters || []).forEach(chapter => {
        if (chapter.readBy && chapter.readBy.includes(userId)) {
          readHistory.push({
            bookId: book._id,
            bookTitle: book.title,
            bookCover: book.cover,
            chapterId: chapter._id,
            chapterTitle: chapter.title,
            chapterOrder: chapter.order,
            chapterType: chapter.type,
            readDate: chapter.createdAt // approximate
          });
        }
      });
    });
    
    // Build Discussion History: comments and reviews by this user
    const discussions = [];
    books.forEach(book => {
      // Comments
      (book.comments || []).forEach(comment => {
        if (comment.userId && comment.userId.toString() === userId) {
          discussions.push({
            type: 'comment',
            bookId: book._id,
            bookTitle: book.title,
            content: comment.content,
            createdAt: comment.createdAt,
            chapterId: comment.chapterId
          });
        }
      });
      // Reviews
      (book.reviews || []).forEach(review => {
        if (review.userId && review.userId.toString() === userId) {
          discussions.push({
            type: 'review',
            bookId: book._id,
            bookTitle: book.title,
            content: review.comment,
            rating: review.rating,
            createdAt: review.createdAt,
            chapterId: review.chapterId
          });
        }
      });
    });
    
    // Sort discussions by date (newest first)
    discussions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: publicAssetUrl(req.user.avatar),
        role: req.user.role,
        createdAt: req.user.createdAt
      },
      readHistory,
      discussions,
      stats: {
        totalReads: readHistory.length,
        totalComments: discussions.filter(d => d.type === 'comment').length,
        totalReviews: discussions.filter(d => d.type === 'review').length,
        uniqueBooksRead: [...new Set(readHistory.map(r => r.bookId.toString()))].length
      }
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/avatar — Upload profile picture
router.post('/avatar', authMiddleware, uploadImage.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const user = await User.findById(req.user._id);
    
    // Delete old avatar from Cloudinary if exists
    if (user.avatar) {
      await deleteCloudinaryFile(user.avatar);
    }
    
    const avatarUrl = req.file.path; // Cloudinary URL
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    
    res.json({ avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
