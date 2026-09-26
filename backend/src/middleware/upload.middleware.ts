import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';

/**
 * Configure Cloudinary storage for multer
 * Falls back to memory storage if Cloudinary is not configured
 */
const getStorage = () => {
  if (isCloudinaryConfigured()) {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        // Determine folder based on file type
        let folder = 'devos/misc';
        const mimetype = file.mimetype;
        
        if (mimetype.includes('pdf')) {
          folder = 'devos/resumes';
        } else if (mimetype.includes('image')) {
          folder = 'devos/images';
        } else if (mimetype.includes('video')) {
          folder = 'devos/videos';
        }

        return {
          folder: folder,
          resource_type: 'auto' as const, // Automatically detect resource type
          public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')}`, // Clean filename
          // Remove allowed_formats - let Cloudinary auto-detect
        };
      },
    });
  } else {
    console.warn('⚠️  Cloudinary not configured, using memory storage');
    return multer.memoryStorage();
  }
};

const storage = getStorage();

// Set default limits: max 50MB file size
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images, PDFs, documents, and videos.`));
    }
  },
});

// Helper for single file upload — wraps multer to catch Cloudinary errors gracefully
export const uploadSingle = (fieldName: string) => {
  const multerMiddleware = upload.single(fieldName);

  return (req: any, res: any, next: any) => {
    multerMiddleware(req, res, (err: any) => {
      if (err) {
        // If Cloudinary returned 403/401 or any upload error, log it
        // but let the request continue without the file
        console.warn(`⚠️  File upload failed (${err.message || err.name || 'unknown'}). Continuing without file.`);
        // Clear any partial file data so the controller doesn't try to use it
        req.file = undefined;
        return next();
      }
      next();
    });
  };
};

// Helper for multiple files upload — same graceful error handling
export const uploadArray = (fieldName: string, maxCount: number = 5) => {
  const multerMiddleware = upload.array(fieldName, maxCount);

  return (req: any, res: any, next: any) => {
    multerMiddleware(req, res, (err: any) => {
      if (err) {
        console.warn(`⚠️  File upload failed (${err.message || err.name || 'unknown'}). Continuing without files.`);
        (req as any).files = [];
        return next();
      }
      next();
    });
  };
};

/**
 * Memory-only multer upload (bypasses Cloudinary entirely).
 * Use this for routes that handle storage via Supabase/local storage service.
 * The file will be available as req.file with a .buffer property.
 */
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images, PDFs, documents, and videos.`));
    }
  },
});

export const uploadSingleMemory = (fieldName: string) => memoryUpload.single(fieldName);

