import multer from 'multer';

// Use memory storage to avoid writing local files, and immediately stream to Supabase Storage
const storage = multer.memoryStorage();

// Set default limits: max 50MB file size
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Helper for single file upload
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Helper for multiple files upload
export const uploadArray = (fieldName: string, maxCount: number = 5) => upload.array(fieldName, maxCount);
