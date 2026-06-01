import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['chapter', 'teaser', 'prequel', 'sequel'], default: 'chapter' },
  order: { type: Number, required: true },
  pdfUrl: { type: String, required: true },
  readBy: [{ type: String }], // Array of IP addresses or User IDs
  createdAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  chapterId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const replySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  chapterId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  content: { type: String, required: true },
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
});

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true }, // Keeping for backwards compatibility
  writerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Writer' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who created it
  genre: { type: String, required: true },
  description: { type: String, required: true },
  cover: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  reads: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Ongoing', 'Completed', 'On Hiatus', 'Dropped', 'Season End'], 
    default: 'Ongoing' 
  },
  seasonNumber: { type: Number },
  tags: [{ type: String }],
  chapters: [chapterSchema],
  reviews: [reviewSchema],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Book', bookSchema);
