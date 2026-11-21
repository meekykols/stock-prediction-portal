import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon'];

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest('Only PNG, JPEG, WEBP, SVG or ICO images are allowed'));
  },
});
