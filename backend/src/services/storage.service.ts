import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

const supabase = env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      realtime: { transport: ws as unknown as typeof WebSocket },
    })
  : null;

if (supabase) {
  console.log('⚡ Supabase Storage client initialized');
} else {
  console.log('⚡ [Supabase Not Configured] Storage running in local fallback mode');
}

export const uploadFile = async (file: Express.Multer.File, folder: string): Promise<string> => {
  const bucketName = env.SUPABASE_STORAGE_BUCKET;
  const fileExtension = file.originalname.split('.').pop();
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
  const fullPath = `${folder}/${uniqueFilename}`;

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fullPath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fullPath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.warn('⚠️ Supabase Upload Error, falling back to local storage:', error.message || error);
    }
  }

  // Local Storage Fallback
  try {
    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(localFilePath, file.buffer);

    console.log(`⚡ Saved file locally to ${localFilePath}`);
    // Use BACKEND_URL env var if set, otherwise fall back to localhost with port
    const backendBase = process.env.BACKEND_URL || `http://localhost:${env.PORT || 4000}`;
    return `${backendBase}/uploads/${folder}/${uniqueFilename}`;
  } catch (err: any) {
    console.error('❌ Local Storage Save Error:', err);
    // Return a placeholder if everything fails
    return `https://images.unsplash.com/photo-1618401471353-b98aedd07871?q=80&w=400`;
  }
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  if (supabase) {
    try {
      const bucketName = env.SUPABASE_STORAGE_BUCKET;
      // Extract file path from public URL
      // E.g., https://your-project.supabase.co/storage/v1/object/public/devos-files/notes/filename.pdf
      const prefix = `/storage/v1/object/public/${bucketName}/`;
      const urlObj = new URL(fileUrl);
      const pathname = decodeURIComponent(urlObj.pathname);

      if (pathname.includes(prefix)) {
        const filePath = pathname.split(prefix)[1];
        const { error } = await supabase.storage.from(bucketName).remove([filePath]);
        if (error) {
          console.error('❌ Supabase File Deletion Error:', error);
        } else {
          console.log(`⚡ Deleted file from storage: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse/delete file URL:', error);
    }
  } else {
    console.log(`⚡ [Storage Mock] Deleted file: ${fileUrl}`);
  }
};
