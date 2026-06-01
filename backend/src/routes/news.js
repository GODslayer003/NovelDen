import express from 'express';
import News from '../models/News.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const news = await News.find().populate('writerId', 'name avatarUrl').sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('media'), async (req, res) => {
  try {
    const { writerId, title, content } = req.body;
    let mediaUrl = '';
    let mediaType = 'none';
    
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
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
    
    const populatedNews = await news.populate('writerId', 'name avatarUrl');
    res.status(201).json(populatedNews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
