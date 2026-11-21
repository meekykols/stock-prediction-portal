import { getSiteConfig, setSiteImage, updateSiteConfig } from '../../services/siteConfig.service.js';
import { destroyImage, uploadBuffer } from '../../services/media.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

const IMAGE_FIELDS = ['logo', 'logoDark', 'favicon'];

export const show = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getSiteConfig({ fresh: true }) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Settings saved', data: await updateSiteConfig(req.body) });
});

export const uploadImage = asyncHandler(async (req, res) => {
  const { field } = req.params;
  if (!IMAGE_FIELDS.includes(field)) throw ApiError.badRequest('Unknown image field');
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const image = await uploadBuffer(req.file.buffer, 'branding');
  const { config, previousPublicId } = await setSiteImage(field, image);
  await destroyImage(previousPublicId);
  res.json({ success: true, data: config });
});
