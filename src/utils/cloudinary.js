import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts public ID from Cloudinary URL
 * @param {string} url 
 * @returns {string|null}
 */
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const remaining = parts[1];
    const segments = remaining.split('/');
    if (segments.length > 0 && /^v\d+$/.test(segments[0])) {
      segments.shift();
    }
    const pathWithoutVersion = segments.join('/');
    const lastDotIndex = pathWithoutVersion.lastIndexOf('.');
    const publicId = lastDotIndex !== -1 ? pathWithoutVersion.substring(0, lastDotIndex) : pathWithoutVersion;
    return decodeURIComponent(publicId);
  } catch (error) {
    console.error('Error parsing Cloudinary URL public_id:', error);
    return null;
  }
};

/**
 * Deletes an image from Cloudinary by its URL
 * @param {string} url 
 * @returns {Promise<any>}
 */
export const deleteImageByUrl = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) {
    console.log(`[Cloudinary Cleanup] Not a valid Cloudinary URL, skipping deletion: ${url}`);
    return null;
  }

  try {
    console.log(`[Cloudinary Cleanup] Attempting to delete image with public ID: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('[Cloudinary Cleanup] Delete result:', result);
    return result;
  } catch (error) {
    console.error('[Cloudinary Cleanup] Error deleting image from Cloudinary:', error);
    throw error;
  }
};
