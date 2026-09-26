import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

/**
 * Configure Cloudinary with environment variables
 */
export const configureCloudinary = () => {
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true, // Always use HTTPS
    });
    console.log('✅ Cloudinary configured successfully');
  } else {
    console.warn('⚠️  Cloudinary credentials not found - file uploads will not work');
  }
};

/**
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = (): boolean => {
  return !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

export { cloudinary };
