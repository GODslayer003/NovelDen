import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  writerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Writer', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'video', 'music'], default: 'text' },
  mediaUrl: { type: String, default: '' },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('News', newsSchema);
