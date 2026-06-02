import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import Book from '../models/Book.js';
import User from '../models/User.js';
import Writer from '../models/Writer.js';
import { uploadImage, uploadPDF, deleteCloudinaryFile } from '../middleware/cloudinary-upload.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(__dirname, '../public/uploads');

const isHttpUrl = (value) => /^https?:\/\//i.test(value || '');

const cloudinaryPdfCandidates = (pdfUrl) => {
  const candidates = [pdfUrl];
  if (/res\.cloudinary\.com/i.test(pdfUrl)) {
    candidates.push(
      pdfUrl.replace('/image/upload/', '/raw/upload/'),
      pdfUrl.replace('/video/upload/', '/raw/upload/')
    );
  }

  return [...new Set(candidates)];
};

const parseCloudinaryAsset = (pdfUrl) => {
  try {
    const url = new URL(pdfUrl);
    if (!/res\.cloudinary\.com$/i.test(url.hostname)) return null;

    const parts = url.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex < 2) return null;

    const resourceType = parts[1];
    const assetParts = parts.slice(uploadIndex + 1);
    if (/^v\d+$/.test(assetParts[0])) assetParts.shift();

    const publicIdWithFormat = assetParts.join('/');
    const formatMatch = /\.([a-z0-9]+)$/i.exec(publicIdWithFormat);
    const format = formatMatch ? formatMatch[1].toLowerCase() : 'pdf';
    const publicIdWithoutFormat = publicIdWithFormat.replace(/\.[^/.]+$/, '');

    return {
      resourceType,
      publicIdWithFormat,
      publicIdWithoutFormat,
      format
    };
  } catch {
    return null;
  }
};

const signedCloudinaryPdfCandidates = (pdfUrl) => {
  const asset = parseCloudinaryAsset(pdfUrl);
  if (!asset) return [];

  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const candidates = [];
  const addSignedUrl = (publicId, format, resourceType) => {
    if (!publicId) return;

    try {
      candidates.push(cloudinary.v2.utils.private_download_url(publicId, format, {
        resource_type: resourceType,
        type: 'upload',
        attachment: false,
        expires_at: expiresAt
      }));
    } catch {
      // Ignore malformed candidates and continue with the remaining fallbacks.
    }
  };

  addSignedUrl(asset.publicIdWithoutFormat, asset.format, asset.resourceType);
  addSignedUrl(asset.publicIdWithoutFormat, asset.format, 'raw');
  addSignedUrl(asset.publicIdWithFormat, undefined, 'raw');

  return [...new Set(candidates)];
};

const isSafeUploadPath = (filePath) =>
  filePath === uploadRoot || filePath.startsWith(`${uploadRoot}${path.sep}`);

const parseRangeHeader = (rangeHeader, fileSize) => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || '');
  if (!match) return null;

  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : fileSize - 1;

  if (!match[1] && match[2]) {
    start = Math.max(fileSize - Number(match[2]), 0);
    end = fileSize - 1;
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
    return null;
  }

  return { start, end: Math.min(end, fileSize - 1) };
};

const requestRemoteFile = (url, headers = {}, redirectCount = 0) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(url);
  const client = parsedUrl.protocol === 'http:' ? http : https;

  const req = client.get(parsedUrl, { headers }, (remoteRes) => {
    const redirectUrl = remoteRes.headers.location;
    if ([301, 302, 303, 307, 308].includes(remoteRes.statusCode) && redirectUrl && redirectCount < 5) {
      remoteRes.resume();
      return resolve(requestRemoteFile(new URL(redirectUrl, parsedUrl).toString(), headers, redirectCount + 1));
    }

    resolve(remoteRes);
  });

  req.setTimeout(30000, () => {
    req.destroy(new Error('Timed out while loading PDF'));
  });
  req.on('error', reject);
});

const sendPdfHeaders = (res, contentLength) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (contentLength) res.setHeader('Content-Length', contentLength);
};

router.get('/', async (req, res) => {
  try {
    const { featured, trend, search, writer, uploadedBy, visibleToUser } = req.query;
    let query = {};
    if (featured) query.featured = featured === 'true';
    if (trend) query.trend = trend;
    if (writer) query.writerId = writer;
    if (uploadedBy) query.uploadedBy = uploadedBy;
    if (search) query.title = { $regex: search, $options: 'i' };

    if (visibleToUser) {
      const user = await User.findById(visibleToUser).select('email');
      const linkedWriter = user?.email ? await Writer.findOne({ email: user.email }).select('_id') : null;
      const ownership = [{ uploadedBy: visibleToUser }];
      if (linkedWriter) ownership.push({ writerId: linkedWriter._id });
      delete query.uploadedBy;
      query = { $and: [query, { $or: ownership }] };
    }
    
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
    if (!book) return res.status(404).json({ error: 'Book not found' });

    let resolvedAuthor = author;
    if (writerId) {
      const writer = await Writer.findById(writerId).select('name');
      if (writer) resolvedAuthor = writer.name;
    }
    if (!resolvedAuthor) resolvedAuthor = 'Unknown Author';
    
    let updateData = {
      title,
      description,
      author: resolvedAuthor,
      genre,
      reads: Number.isFinite(Number(views)) ? Number(views) : book.reads,
      rating: Number.isFinite(Number(rating)) ? Number(Number(rating).toFixed(1)) : book.rating,
      status,
      seasonNumber: Number(season) || 1,
      trend,
      featured: featured === 'true'
    };
    
    updateData.writerId = writerId || null;
    
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

router.get('/:id/chapters/:chapId/pdf', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const chapter = book.chapters.id(req.params.chapId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    if (!chapter.pdfUrl) return res.status(404).json({ error: 'PDF not found' });

    if (!isHttpUrl(chapter.pdfUrl)) {
      const relativePath = chapter.pdfUrl.replace(/^\/uploads\//, '');
      const filePath = path.resolve(uploadRoot, relativePath);

      if (!isSafeUploadPath(filePath) || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'PDF file not found' });
      }

      const stat = fs.statSync(filePath);
      const range = parseRangeHeader(req.headers.range, stat.size);
      if (req.headers.range && !range) {
        res.setHeader('Content-Range', `bytes */${stat.size}`);
        return res.status(416).end();
      }

      if (range) {
        const contentLength = range.end - range.start + 1;
        sendPdfHeaders(res, contentLength);
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
        res.status(206);
        return fs.createReadStream(filePath, range).pipe(res);
      }

      sendPdfHeaders(res, stat.size);
      return fs.createReadStream(filePath).pipe(res);
    }

    let lastStatus = 502;
    let lastContentType = '';
    const candidateUrls = [
      ...cloudinaryPdfCandidates(chapter.pdfUrl),
      ...signedCloudinaryPdfCandidates(chapter.pdfUrl)
    ];

    for (const candidateUrl of candidateUrls) {
      const remoteRes = await requestRemoteFile(
        candidateUrl,
        req.headers.range ? { Range: req.headers.range } : {}
      );
      lastStatus = remoteRes.statusCode || lastStatus;
      lastContentType = remoteRes.headers['content-type'] || lastContentType;

      if (lastStatus >= 200 && lastStatus < 300) {
        sendPdfHeaders(res, remoteRes.headers['content-length']);
        if (remoteRes.headers['content-range']) {
          res.setHeader('Content-Range', remoteRes.headers['content-range']);
        }
        if (lastStatus === 206) res.status(206);
        return remoteRes.pipe(res);
      }

      remoteRes.resume();
    }

    console.error('PDF delivery failed', {
      bookId: req.params.id,
      chapterId: req.params.chapId,
      status: lastStatus,
      contentType: lastContentType,
      pdfUrl: chapter.pdfUrl
    });

    return res.status(lastStatus).json({
      error: 'Failed to load PDF document',
      detail: 'The uploaded PDF could not be read from storage. Re-upload this chapter PDF after deploying the latest upload fix.'
    });
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
    const existingReview = book.reviews.find(
      r => r.chapterId.toString() === req.params.chapId && r.userId.toString() === userId
    );
    if (existing || existingReview) {
      return res.status(409).json({ error: 'You have already posted on this chapter. You can still reply to comments.' });
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
    const avg = reviews.length > 0 ? Number((reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)) : 0;
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
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const userId = reqUserId || '000000000000000000000000';
    const userName = reqUserName || 'Guest User';
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    // Enforce 1 review per user per chapter
    const existing = book.reviews.find(
      r => r.chapterId.toString() === req.params.chapId && r.userId.toString() === userId
    );
    const existingComment = book.comments.find(
      c => c.chapterId.toString() === req.params.chapId && c.userId.toString() === userId
    );
    if (existing || existingComment) {
      return res.status(409).json({ error: 'You have already posted on this chapter. You can still reply to comments.' });
    }
    
    const newReview = { chapterId: req.params.chapId, userId, userName, rating: numericRating, comment };
    book.reviews.push(newReview);
    
    // Update book overall rating
    const totalRating = book.reviews.reduce((a, b) => a + b.rating, 0);
    book.rating = Number((totalRating / book.reviews.length).toFixed(1));
    
    await book.save();
    res.status(201).json(book.reviews[book.reviews.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
