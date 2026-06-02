import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET all users (for admin panel)
router.get('/', async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 0));
    const baseQuery = User.find(query).select('-password').sort({ createdAt: -1 });

    if (pageSize > 0) {
      const [users, total] = await Promise.all([
        baseQuery.skip((pageNumber - 1) * pageSize).limit(pageSize),
        User.countDocuments(query)
      ]);
      return res.json({
        users,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    }

    const users = await baseQuery;
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user count stats
router.get('/stats', async (req, res) => {
  try {
    const total = await User.countDocuments();
    const verified = await User.countDocuments({ isVerified: true });
    const unverified = await User.countDocuments({ isVerified: false });
    const admins = await User.countDocuments({ role: 'admin' });
    res.json({ total, verified, unverified, admins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });
    
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
