import express from 'express';
import Book from '../models/Book.js';
import { uploadImage, uploadPDF, deleteCloudinaryFile } from '../middleware/cloudinary-upload.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { featured, trend, search, writer, uploadedBy } = req.query;
    let query = {};
    if (featured) query.featured = featured === 'true';
    if (trend) query.trend = trend;
    if (writer) query.writerId = writer;
    if (uploadedBy) query.uploadedBy = uploadedBy;
    if (search) query.title = { $regex: search, $options: 'i' };
    
    const books = await Book.find(query).populate('writerId', 'name');
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('writerId', 'name');
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', uploadImage.single('coverImage'), async (req, res) => {
  try {
    const { title, description, author, writerId, genre, views, rating, status, season, featured, trend, uploadedBy } = req.body;
    let cover = '';
    let coverImage = '';
    if (req.file) {
      cover = req.file.path; // Cloudinary URL
      coverImage = req.file.path; // keep legacy field for admin panel
    }
    
    let resolvedAuthor = author;
    if (!resolvedAuthor && writerId) {
      // Find the writer to get the name
      const mongoose = await import('mongoose');
      const Writer = mongoose.model('Writer');
      const writer = await Writer.findById(writerId);
      if (writer) resolvedAuthor = writer.name;
    }
    
    if (!resolvedAuthor) resolvedAuthor = 'Unknown Author';

    const book = await Book.create({
      title,
      description,
      author: resolvedAuthor,
      writerId: writerId || null,
      uploadedBy: uploadedBy || null,
      genre,
      reads: Number(views) || 0,
      rating: Number(rating) || 0,
      status: status || 'Ongoing',
      seasonNumber: Number(season) || 1,
      featured: featured === 'true',
      trend: trend || 'None',
      cover,
      coverImage,
      chapters: [],
      reviews: [],
      comments: []
    });
    
    res.status(201).json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', uploadImage.single('coverImage'), async (req, res) => {
  try {
    const { title, description, author, writerId, genre, views, rating, status, season, featured, trend } = req.body;
    const book = await Book.findById(req.params.id);
    
    let updateData = {
      title, description, author, genre, reads: Number(views) || 0, rating: Number(rating) || 0, status, seasonNumber: Number(season) || 1, trend, featured: featured === 'true'
    };
    
    if (writerId) updateData.writerId = writerId;
    
    if (req.file) {
      // Delete old cover(s) from Cloudinary if exists
      if (book.cover) {
        await deleteCloudinaryFile(book.cover);
      }
      if (book.coverImage && book.coverImage !== book.cover) {
        await deleteCloudinaryFile(book.coverImage);
      }
      updateData.cover = req.file.path; // New Cloudinary URL
      updateData.coverImage = req.file.path; // legacy field
    }
    
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedBook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    // Delete book cover(s) from Cloudinary
    if (book.cover) {
      await deleteCloudinaryFile(book.cover);
    }
    if (book.coverImage && book.coverImage !== book.cover) {
      await deleteCloudinaryFile(book.coverImage);
    }
    
    // Delete all chapter PDFs
    if (book.chapters && book.chapters.length > 0) {
      for (const chapter of book.chapters) {
        if (chapter.pdfUrl) {
          await deleteCloudinaryFile(chapter.pdfUrl);
        }
      }
    }
    
    await Book.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CHAPTERS ---
router.post('/:id/chapters', uploadPDF.single('pdfFile'), async (req, res) => {
  try {
    const { title, type, order } = req.body;
    let pdfUrl = '';
    if (req.file) pdfUrl = req.file.path; // Cloudinary URL
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    book.chapters.push({ title, type, order: Number(order), pdfUrl });
    await book.save();
    res.status(201).json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/chapters/:chapId', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const chapter = book.chapters.id(req.params.chapId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/chapters/:chapId', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    const chapter = book.chapters.id(req.params.chapId);
    if (chapter && chapter.pdfUrl) {
      // Delete PDF from Cloudinary
      await deleteCloudinaryFile(chapter.pdfUrl);
    }
    
    book.chapters.pull(req.params.chapId);
    await book.save();
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMMENTS ---
router.get('/:id/chapters/:chapId/comments', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const comments = book.comments.filter(c => c.chapterId.toString() === req.params.chapId);
    res.json(comments.sort((a,b) => b.createdAt - a.createdAt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/chapters/:chapId/comments', async (req, res) => {
  try {
    const { content, userId: reqUserId, userName: reqUserName } = req.body;
    const userId = reqUserId || '000000000000000000000000';
    const userName = reqUserName || 'Guest User';
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    // Enforce 1 comment per user per chapter
    const existing = book.comments.find(
      c => c.chapterId.toString() === req.params.chapId && c.userId.toString() === userId
    );
    if (existing) {
      return res.status(409).json({ error: 'You have already posted a comment on this chapter' });
    }
    
    const newComment = { chapterId: req.params.chapId, userId, userName, content, replies: [] };
    book.comments.push(newComment);
    await book.save();
    res.status(201).json(book.comments[book.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMMENT REPLIES ---
router.post('/:id/comments/:commentId/replies', async (req, res) => {
  try {
    const { content, userId: reqUserId, userName: reqUserName } = req.body;
    const userId = reqUserId || '000000000000000000000000';
    const userName = reqUserName || 'Guest User';
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    const comment = book.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    comment.replies.push({ userId, userName, content });
    await book.save();
    
    const updatedComment = book.comments.id(req.params.commentId);
    res.status(201).json(updatedComment.replies[updatedComment.replies.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REVIEWS ---
router.get('/:id/chapters/:chapId/reviews', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const reviews = book.reviews.filter(c => c.chapterId.toString() === req.params.chapId);
    const avg = reviews.length > 0 ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1) : 0;
    res.json({ reviews: reviews.sort((a,b) => b.createdAt - a.createdAt), averageRating: avg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRACK CHAPTER READ ---
router.post('/:id/chapters/:chapId/read', async (req, res) => {
  try {
    const { userId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const identifier = userId || ipAddress; // Use user ID if logged in, else IP address
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    const chapter = book.chapters.id(req.params.chapId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    
    // Check if this identifier already read this chapter
    if (!chapter.readBy.includes(identifier)) {
      chapter.readBy.push(identifier);
      book.reads += 1; // Increment overall book reads
      await book.save();
    }
    
    res.status(200).json({ success: true, reads: book.reads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/chapters/:chapId/reviews', async (req, res) => {
  try {
    const { rating, comment, userId: reqUserId, userName: reqUserName } = req.body;
    const userId = reqUserId || '000000000000000000000000';
    const userName = reqUserName || 'Guest User';
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    // Enforce 1 review per user per chapter
    const existing = book.reviews.find(
      r => r.chapterId.toString() === req.params.chapId && r.userId.toString() === userId
    );
    if (existing) {
      return res.status(409).json({ error: 'You have already posted a review on this chapter' });
    }
    
    const newReview = { chapterId: req.params.chapId, userId, userName, rating, comment };
    book.reviews.push(newReview);
    
    // Update book overall rating
    const totalRating = book.reviews.reduce((a, b) => a + b.rating, 0);
    book.rating = totalRating / book.reviews.length;
    
    await book.save();
    res.status(201).json(book.reviews[book.reviews.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;