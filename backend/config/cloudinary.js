require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Explicitly parse and configure Cloudinary credentials
if (process.env.CLOUDINARY_URL) {
  const uri = process.env.CLOUDINARY_URL;
  const match = uri.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (match) {
    cloudinary.config({
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3],
      secure: true
    });
  } else {
    cloudinary.config({ cloudinary_url: uri, secure: true });
  }
} else {
  console.warn('WARNING: CLOUDINARY_URL is missing. File uploads to Cloudinary will fail.');
}

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.mp4'];

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let resource_type = 'auto';
    if (['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'].includes(ext)) resource_type = 'raw';
    else if (['.mp4', '.avi'].includes(ext)) resource_type = 'video';

    const cleanName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');

    return {
      folder: 'edux/elearning',
      resource_type,
      public_id: `${Date.now()}_${cleanName}${ext}`, // extension included — required for raw files
    };
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error(`File type ${ext} not allowed`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB cap
});

// Memory storage for AI document parsing
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt'].includes(ext)) {
      return cb(null, true);
    }
    cb(new Error(`File type ${ext} not supported for AI quiz generation. Please upload PDF, PPT, or PPTX.`), false);
  },
  limits: { fileSize: 25 * 1024 * 1024 }
});

/**
 * Generates a signed, authenticated download URL for raw Cloudinary assets.
 * Resolves Cloudinary's default 401 Unauthorized restriction on raw/PDF files.
 */
function getSafeDownloadUrl(rawUrl, expirySeconds = 7200) {
  try {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.includes('cloudinary.com')) {
      return rawUrl;
    }
    
    // Check if it's already a signed download URL
    if (rawUrl.includes('/raw/download?') && rawUrl.includes('signature=')) {
      return rawUrl;
    }

    const uploadIdx = rawUrl.indexOf('/upload/');
    if (uploadIdx === -1) return rawUrl;

    let afterUpload = rawUrl.substring(uploadIdx + 8);
    // Remove Cloudinary version tag (e.g. v1787415858/)
    afterUpload = afterUpload.replace(/^v\d+\//, '');
    const publicId = decodeURIComponent(afterUpload);

    const isRaw = rawUrl.includes('/raw/') || ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'].some(ext => rawUrl.toLowerCase().includes(ext));
    
    if (isRaw && cloudinary.config().api_secret) {
      return cloudinary.utils.private_download_url(publicId, '', {
        resource_type: 'raw',
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + expirySeconds
      });
    }

    return rawUrl;
  } catch (err) {
    console.error('Error generating safe download URL:', err);
    return rawUrl;
  }
}

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
    return {
      folder: 'edux/events',
      resource_type: 'image',
      public_id: `${Date.now()}_${cleanName}${ext}`,
    };
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) {
      return cb(new Error(`File type ${ext} not allowed for images. Allowed: JPG, PNG, WEBP, SVG, GIF`), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap
});

module.exports = { cloudinary, upload, uploadMemory, uploadImage, getSafeDownloadUrl };