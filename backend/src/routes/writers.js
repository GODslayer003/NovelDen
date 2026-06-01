import express from 'express';
import bcrypt from 'bcryptjs';
import Writer from '../models/Writer.js';
import User from '../models/User.js';
import { uploadImage, deleteCloudinaryFile } from '../middleware/cloudinary-upload.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const writers = await Writer.find().populate('books');
    res.json(writers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const writer = await Writer.findById(req.params.id).populate('books');
    if (!writer) return res.status(404).json({ error: 'Writer not found' });
    res.json(writer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', uploadImage.fields([{ name: 'avatar', maxCount: 1 }, { name: 'music', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, genre, bio, featured, email, password } = req.body;
    
    const avatar = req.files?.['avatar'] ? req.files['avatar'][0].path : '';
    const profileMusic = req.files?.['music'] ? req.files['music'][0].path : '';
    
    const writer = await Writer.create({
      name,
      email,
      genre,
      bio,
      featured: featured === 'true',
      avatar,
      profileMusic
    });
    
    // Create linked Admin User if email and password provided
    if (email && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });
    }
    
    res.status(201).json(writer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', uploadImage.fields([{ name: 'avatar', maxCount: 1 }, { name: 'music', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, genre, bio, featured, email, password } = req.body;
    const writer = await Writer.findById(req.params.id);
    if (!writer) return res.status(404).json({ error: 'Writer not found' });
    
    const updateData = { name, genre, bio, featured: featured === 'true', email };
    
    if (req.files?.['avatar']) {
      // Delete old avatar from Cloudinary if exists
      if (writer.avatar) {
        await deleteCloudinaryFile(writer.avatar);
      }
      updateData.avatar = req.files['avatar'][0].path;
    }
    if (req.files?.['music']) {
      // Delete old music from Cloudinary if exists
      if (writer.profileMusic) {
        await deleteCloudinaryFile(writer.profileMusic);
      }
      updateData.profileMusic = req.files['music'][0].path;
    }
    
    const updatedWriter = await Writer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // Update or Create Admin User
    if (email) {
      let user = await User.findOne({ email });
      if (user) {
        if (password) user.password = await bcrypt.hash(password, 10);
        user.name = name;
        await user.save();
      } else if (password) {
        await User.create({
          name, email, password: await bcrypt.hash(password, 10), role: 'admin', isVerified: true
        });
      }
    }
    res.json(updatedWriter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const writer = await Writer.findById(req.params.id);
    if (!writer) return res.status(404).json({ error: 'Writer not found' });
    
    // Delete avatar and music from Cloudinary
    if (writer.avatar) {
      await deleteCloudinaryFile(writer.avatar);
    }
    if (writer.profileMusic) {
      await deleteCloudinaryFile(writer.profileMusic);
    }
    
    await Writer.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;