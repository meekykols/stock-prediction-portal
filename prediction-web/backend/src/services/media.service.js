import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

export function uploadBuffer(buffer, folder) {
  if (!cloudinaryEnabled) {
    throw new ApiError(503, 'Image uploads are not configured (set CLOUDINARY_* in .env)');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `prediction-web/${folder}`, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })),
    );
    stream.end(buffer);
  });
}

export async function destroyImage(publicId) {
  if (!cloudinaryEnabled || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[media] failed to delete', publicId, err.message);
  }
}
