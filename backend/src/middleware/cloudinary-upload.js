import multer from 'multer';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../../../.env') });

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for images (avatars, book covers, writer profiles)
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'novelDen/images',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ]
  }
});

// Storage for PDFs (chapters)
const pdfStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'novelDen/pdfs',
    resource_type: 'auto',
    allowed_formats: ['pdf'],
    type: 'upload'
  }
});

// Multer instances
export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

export const uploadPDF = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Helper to delete files from Cloudinary by URL
export const deleteCloudinaryFile = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    // Extract public_id from Cloudinary URL
    const urlParts = fileUrl.split('/');
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `novelDen/${publicIdWithExt.split('.')[0]}`;
    
    await cloudinary.v2.uploader.destroy(publicId);
    console.log(`✅ Deleted: ${publicId}`);
  } catch (err) {
    console.error('❌ Cloudinary deletion error:', err);
  }
};
