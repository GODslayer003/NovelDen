import mongoose from 'mongoose';

const writerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: '' },
  genre: { type: String, default: '' },
  bio: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  avatar: { type: String, default: '' },
  profileMusic: { type: String, default: '' },
  followers: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for books (we will populate this in the routes)
writerSchema.virtual('books', {
  ref: 'Book',
  localField: '_id',
  foreignField: 'writerId'
});

export default mongoose.model('Writer', writerSchema);
