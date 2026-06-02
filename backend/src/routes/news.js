import express from 'express';
import News from '../models/News.js';
import { uploadNewsMedia, deleteCloudinaryFile } from '../middleware/cloudinary-upload.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const news = await News.find().populate('writerId', 'name avatar').sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', uploadNewsMedia.single('media'), async (req, res) => {
  try {
    const { writerId, title, content } = req.body;
    let mediaUrl = '';
    let mediaType = 'none';
    
    if (req.file) {
      mediaUrl = req.file.path; // Cloudinary URL
      const mime = req.file.mimetype;
      if (mime.startsWith('image/')) mediaType = 'image';
      else if (mime.startsWith('video/')) mediaType = 'video';
      else if (mime.startsWith('audio/')) mediaType = 'music';
    }
    
    const news = await News.create({
      writerId,
      title,
      content,
      mediaUrl,
      mediaType
    });
    
    const populatedNews = await news.populate('writerId', 'name avatar');
    res.status(201).json(populatedNews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    
    // Delete media from Cloudinary if exists
    if (news.mediaUrl) {
      await deleteCloudinaryFile(news.mediaUrl);
    }
    
    await News.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
