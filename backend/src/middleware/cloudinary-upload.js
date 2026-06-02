import multer from 'multer';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../../../.env') });

const parseCloudinaryUrl = (value) => {
  if (!value) return {};

  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:') return {};

    return {
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password)
    };
  } catch {
    return {};
  }
};

const cloudinaryUrlConfig = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || cloudinaryUrlConfig.cloud_name,
  api_key: process.env.CLOUDINARY_API_KEY || cloudinaryUrlConfig.api_key,
  api_secret: process.env.CLOUDINARY_API_SECRET || cloudinaryUrlConfig.api_secret
};

cloudinary.v2.config({
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key,
  api_secret: cloudinaryConfig.api_secret
});

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/webm'];
const videoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

const cloudinaryCloudNamePattern = /^[a-zA-Z0-9-]+$/;

const hasCloudinaryConfig = () =>
  Boolean(cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret);

const uploadConfigGuard = (req, res, next) => {
  if (!hasCloudinaryConfig()) {
    return res.status(503).json({
      error: 'File uploads are not configured. Please set Cloudinary environment variables on the server.'
    });
  }

  if (!cloudinaryCloudNamePattern.test(cloudinaryConfig.cloud_name)) {
    return res.status(503).json({
      error: 'Cloudinary is misconfigured: CLOUDINARY_CLOUD_NAME must be your Cloudinary cloud name, not an upload preset, folder name, or MediaFlows id.'
    });
  }

  return next();
};

const createFileTypeError = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const isImage = (file) => imageMimeTypes.includes(file.mimetype);
const isAudio = (file) => audioMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/');
const isVideo = (file) => videoMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('video/');
const isPDF = (file) => file.mimetype === 'application/pdf';

const mediaParams = (folder, allowedFormats) => ({
  folder,
  resource_type: 'auto',
  allowed_formats: allowedFormats,
  type: 'upload'
});

const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: mediaParams('novelDen/images', ['jpg', 'jpeg', 'png', 'webp', 'gif'])
});

const pdfStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: mediaParams('novelDen/pdfs', ['pdf'])
});

const writerMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: (req, file) => {
    if (file.fieldname === 'avatar') {
      return mediaParams('novelDen/images', ['jpg', 'jpeg', 'png', 'webp', 'gif']);
    }

    return mediaParams('novelDen/audio', ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm']);
  }
});

const newsMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: (req, file) => {
    if (isImage(file)) return mediaParams('novelDen/images', ['jpg', 'jpeg', 'png', 'webp', 'gif']);
    if (isAudio(file)) return mediaParams('novelDen/audio', ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm']);
    return mediaParams('novelDen/videos', ['mp4', 'webm', 'mov']);
  }
});

const imageUploader = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isImage(file)) {
      return cb(createFileTypeError('Only image files are allowed'));
    }
    cb(null, true);
  }
});

const pdfUploader = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isPDF(file)) {
      return cb(createFileTypeError('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

const writerMediaUploader = multer({
  storage: writerMediaStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'avatar' && !isImage(file)) {
      return cb(createFileTypeError('Avatar must be an image file'));
    }

    if (file.fieldname === 'music' && !isAudio(file)) {
      return cb(createFileTypeError('Profile music must be an audio file'));
    }

    cb(null, true);
  }
});

const newsMediaUploader = multer({
  storage: newsMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!isImage(file) && !isAudio(file) && !isVideo(file)) {
      return cb(createFileTypeError('News media must be an image, video, or audio file'));
    }

    cb(null, true);
  }
});

const withUploadConfig = (uploader) => [uploadConfigGuard, uploader];

export const uploadImage = {
  single: (fieldName) => withUploadConfig(imageUploader.single(fieldName)),
  fields: (fields) => withUploadConfig(imageUploader.fields(fields))
};

export const uploadPDF = {
  single: (fieldName) => withUploadConfig(pdfUploader.single(fieldName))
};

export const uploadWriterMedia = {
  fields: (fields) => withUploadConfig(writerMediaUploader.fields(fields))
};

export const uploadNewsMedia = {
  single: (fieldName) => withUploadConfig(newsMediaUploader.single(fieldName))
};

export const deleteCloudinaryFile = async (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('http')) return;

  try {
    const parsedUrl = new URL(fileUrl);
    const uploadMarker = '/upload/';
    const uploadIndex = parsedUrl.pathname.indexOf(uploadMarker);
    if (uploadIndex === -1) return;

    let publicIdWithExt = parsedUrl.pathname.slice(uploadIndex + uploadMarker.length);
    publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, '');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

    await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'auto' });
    console.log(`Deleted Cloudinary file: ${publicId}`);
  } catch (err) {
    console.error('Cloudinary deletion error:', err);
  }
};
