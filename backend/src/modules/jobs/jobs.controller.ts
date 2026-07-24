import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './jobs.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendCreated(res, await service.create(req.user!.userId, req.body)); } catch (e) { next(e); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.list(req.user!.userId, req.query)); } catch (e) { next(e); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.getOne(req.user!.userId, req.params.id as string)); } catch (e) { next(e); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.update(req.user!.userId, req.params.id as string, req.body), 'Job updated'); } catch (e) { next(e); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await service.remove(req.user!.userId, req.params.id as string); return sendSuccess(res, null, 'Job deleted'); } catch (e) { next(e); }
};

export const uploadResume = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    const updatedJob = await service.uploadJobResume(req.user!.userId, req.params.id as string, req.file);
    return sendSuccess(res, updatedJob, 'Resume uploaded successfully');
  } catch (e) { next(e); }
};

export const deleteResume = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updatedJob = await service.deleteJobResume(req.user!.userId, req.params.id as string);
    return sendSuccess(res, updatedJob, 'Resume deleted successfully');
  } catch (e) { next(e); }
};

export const downloadResume = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await service.getOne(req.user!.userId, req.params.id as string);
    if (!job.resumePath) {
      return res.status(404).json({ success: false, message: 'No resume attached to this job application.' });
    }

    const downloadFileName = job.resumeFileName || 'resume.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFileName)}"`);

    // Check if local file or remote URL
    if (job.resumePath.startsWith('http://') || job.resumePath.startsWith('https://')) {
      const client = job.resumePath.startsWith('https://') ? https : http;
      client.get(job.resumePath, (fileStream) => {
        fileStream.pipe(res);
      }).on('error', (err) => {
        console.error('Download stream error:', err);
        return res.status(500).json({ success: false, message: 'Error streaming file' });
      });
    } else {
      // Local path fallback
      const localPath = path.isAbsolute(job.resumePath)
        ? job.resumePath
        : path.join(process.cwd(), job.resumePath);

      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ success: false, message: 'Resume file not found on disk.' });
      }

      fs.createReadStream(localPath).pipe(res);
    }
  } catch (e) { next(e); }
};
