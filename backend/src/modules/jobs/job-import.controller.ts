import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { importJob } from './job-import.service';
import { sendCreated, sendError } from '../../utils/response';

/**
 * POST /api/jobs/import
 * Receives job data + optional screenshot from the Chrome Extension.
 * Expects multipart/form-data with:
 *   - jobData (JSON string): { job, metadata }
 *   - screenshot (file, optional): PNG screenshot
 */
export const importJobHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    // Parse the JSON data from the multipart form
    const rawData = req.body.jobData;
    if (!rawData) {
      return sendError(res, 'Missing jobData field', 400);
    }

    let parsed: any;
    try {
      parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      return sendError(res, 'Invalid jobData JSON', 400);
    }

    if (!parsed.job || !parsed.metadata) {
      return sendError(res, 'jobData must contain job and metadata fields', 400);
    }

    // Validate metadata
    if (!parsed.metadata.sourceUrl) {
      return sendError(res, 'metadata.sourceUrl is required', 400);
    }

    // Sanitize extracted content (prevent XSS)
    if (parsed.job.title) parsed.job.title = sanitize(parsed.job.title);
    if (parsed.job.company) parsed.job.company = sanitize(parsed.job.company);
    if (parsed.job.location) parsed.job.location = sanitize(parsed.job.location);
    if (parsed.job.description) {
      parsed.job.description = parsed.job.description.slice(0, 10000); // Cap description length
    }

    // Get screenshot file if uploaded
    const screenshotFile = req.file;

    // Validate screenshot if present
    if (screenshotFile) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(screenshotFile.mimetype)) {
        return sendError(res, 'Invalid screenshot format. Allowed: PNG, JPEG, WebP', 400);
      }
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (screenshotFile.size > maxSize) {
        return sendError(res, 'Screenshot too large. Max 10MB', 400);
      }
    }

    const result = await importJob(userId, parsed, screenshotFile);

    return sendCreated(res, result, result.isDuplicate ? 'Job already exists' : 'Job captured');
  } catch (err) {
    next(err);
  }
};

/** Basic HTML/script sanitization */
function sanitize(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 500);
}
