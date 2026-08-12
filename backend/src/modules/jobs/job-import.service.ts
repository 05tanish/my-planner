import prisma from '../../config/database';
import { uploadFile } from '../../services/storage.service';
import { extractJobFromScreenshot } from '../../services/vision-ai.service';

/**
 * Job Import Service
 * Handles the full import pipeline:
 *   1. Validate incoming data
 *   2. Check for duplicates
 *   3. Store screenshot (if provided)
 *   4. Run AI extraction if DOM data is insufficient
 *   5. ALWAYS create job record (capture-first principle)
 */

interface ImportJobData {
  job: {
    title: string | null;
    company: string | null;
    location: string | null;
    description: string | null;
    employmentType: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    salaryMin: number | null;
    salaryMax: number | null;
    skills: string[];
    education: string[];
    postedDate: string | null;
    applicationDeadline: string | null;
  };
  metadata: {
    source: string;
    sourceUrl: string;
    pageTitle: string;
    capturedAt: string;
    extensionVersion: string;
    extractionMethod: string | null;
    extractionStatus: string;
    extractionConfidence: number | null;
  };
}

export async function importJob(
  userId: string,
  data: ImportJobData,
  screenshotFile?: Express.Multer.File
) {
  const { job, metadata } = data;

  // ─── 1. Duplicate Check ───
  const duplicate = await checkDuplicate(userId, metadata.sourceUrl, job.company, job.title, job.location);
  if (duplicate) {
    return {
      ...duplicate,
      isDuplicate: true,
      message: 'Job already exists',
    };
  }

  // ─── 2. Store Screenshot ───
  let screenshotUrl: string | null = null;
  if (screenshotFile) {
    try {
      screenshotUrl = await uploadFile(screenshotFile, 'job-screenshots');
    } catch (err) {
      console.error('❌ Screenshot upload failed:', err);
      // Don't fail the entire import for a screenshot upload error
    }
  }

  // ─── 3. Determine extraction quality ───
  const hasDomData = isExtractionSufficient(job);
  let finalJob = { ...job };
  let extractionStatus = metadata.extractionStatus;
  let extractionMethod = metadata.extractionMethod;
  let extractionError: string | null = null;
  let extractionConfidence = metadata.extractionConfidence || 0;

  if (hasDomData) {
    // DOM extraction was sufficient
    extractionStatus = 'DOM_EXTRACTED';
    extractionMethod = 'dom';
  } else if (screenshotFile) {
    // ─── 4. AI Extraction from Screenshot ───
    try {
      const partialData: Record<string, any> = {};
      if (job.title) partialData.title = job.title;
      if (job.company) partialData.company = job.company;
      if (job.location) partialData.location = job.location;

      const aiResult = await extractJobFromScreenshot(
        screenshotFile.buffer,
        screenshotFile.mimetype,
        Object.keys(partialData).length > 0 ? partialData : undefined
      );

      if (aiResult.success) {
        // Merge AI results with DOM partial data (DOM data takes priority)
        finalJob = {
          title: job.title || aiResult.data.title,
          company: job.company || aiResult.data.company,
          location: job.location || aiResult.data.location,
          description: job.description || aiResult.data.description,
          employmentType: job.employmentType || aiResult.data.employmentType,
          experienceMin: job.experienceMin ?? aiResult.data.experienceMin,
          experienceMax: job.experienceMax ?? aiResult.data.experienceMax,
          salaryMin: job.salaryMin ?? aiResult.data.salaryMin,
          salaryMax: job.salaryMax ?? aiResult.data.salaryMax,
          skills: job.skills.length > 0 ? job.skills : aiResult.data.skills,
          education: job.education.length > 0 ? job.education : aiResult.data.education,
          postedDate: job.postedDate || aiResult.data.postedDate,
          applicationDeadline: job.applicationDeadline || null,
        };

        if (isExtractionSufficient(finalJob)) {
          extractionStatus = 'AI_EXTRACTED';
          extractionMethod = 'screenshot_ai';
          extractionConfidence = 0.7; // AI confidence
        } else {
          // AI helped but still not sufficient
          extractionStatus = 'NEEDS_REVIEW';
          extractionMethod = 'screenshot_ai';
        }
      } else {
        // AI extraction failed
        extractionStatus = 'NEEDS_REVIEW';
        extractionMethod = 'screenshot_ai';
        extractionError = aiResult.error || 'AI extraction failed';
      }
    } catch (err: any) {
      console.error('❌ AI extraction error:', err);
      extractionStatus = 'NEEDS_REVIEW';
      extractionError = err.message;
    }
  } else {
    // No screenshot, insufficient DOM data
    extractionStatus = 'NEEDS_REVIEW';
  }

  // ─── 5. ALWAYS Create Job Record ───
  // This is the capture-first principle: never discard a job.
  let created;
  try {
    created = await prisma.job.create({
      data: {
        userId,
        company: finalJob.company || metadata.pageTitle || 'Unknown',
        role: finalJob.title || 'Untitled Position',
        jobUrl: metadata.sourceUrl || null,
        location: finalJob.location,
        salary: formatSalaryString(finalJob.salaryMin, finalJob.salaryMax),
        notes: null,
        status: 'WISHLIST',
        description: finalJob.description,
        employmentType: finalJob.employmentType,
        experienceMin: finalJob.experienceMin,
        experienceMax: finalJob.experienceMax,
        salaryMin: finalJob.salaryMin,
        salaryMax: finalJob.salaryMax,
        skills: finalJob.skills || [],
        education: (finalJob.education || []).map((e: any) => {
          if (typeof e === 'string') return e;
          if (typeof e === 'object' && e !== null) {
            return e.credentialCategory || e.name || JSON.stringify(e);
          }
          return String(e);
        }),
        source: metadata.source,
        sourceUrl: metadata.sourceUrl,
        screenshotUrl,
        extractionStatus: extractionStatus as any,
        extractionMethod,
        extractionError,
        extractionConfidence,
        capturedAt: metadata.capturedAt ? new Date(metadata.capturedAt) : new Date(),
      },
    });
  } catch (err: any) {
    console.error('❌ Failed to save comprehensive job data, falling back to minimal save:', err);
    // Fallback: minimal save so we don't lose the screenshot and basic reference
    created = await prisma.job.create({
      data: {
        userId,
        company: metadata.pageTitle || 'Unknown',
        role: 'Untitled Position (Fallback Save)',
        jobUrl: metadata.sourceUrl || null,
        status: 'WISHLIST',
        source: metadata.source,
        sourceUrl: metadata.sourceUrl,
        screenshotUrl,
        extractionStatus: 'NEEDS_REVIEW',
        extractionError: 'Failed to save rich data: ' + err.message,
        capturedAt: metadata.capturedAt ? new Date(metadata.capturedAt) : new Date(),
      }
    });
  }

  return {
    id: created.id,
    title: created.role,
    company: created.company,
    location: created.location,
    extractionStatus: created.extractionStatus,
    screenshotUrl: created.screenshotUrl,
    isDuplicate: false,
  };
}

// ─── Helpers ───

function isExtractionSufficient(job: ImportJobData['job']): boolean {
  const hasTitle = !!job.title?.trim();
  const hasCompany = !!job.company?.trim();
  const hasLocationOrDesc = !!job.location?.trim() || !!job.description?.trim();
  return hasTitle && hasCompany && hasLocationOrDesc;
}

async function checkDuplicate(
  userId: string,
  sourceUrl: string | null,
  company: string | null,
  title: string | null,
  location: string | null
) {
  // Strategy 1: Exact URL match
  if (sourceUrl) {
    const existing = await prisma.job.findFirst({
      where: { userId, sourceUrl },
      select: {
        id: true, company: true, role: true, location: true,
        extractionStatus: true, screenshotUrl: true,
      },
    });
    if (existing) {
      return {
        id: existing.id,
        title: existing.role,
        company: existing.company,
        location: existing.location,
        extractionStatus: existing.extractionStatus,
        screenshotUrl: existing.screenshotUrl,
      };
    }
  }

  // Strategy 2: Fuzzy match on company + role + location
  if (company && title) {
    const existing = await prisma.job.findFirst({
      where: {
        userId,
        company: { equals: company, mode: 'insensitive' },
        role: { equals: title, mode: 'insensitive' },
        ...(location ? { location: { equals: location, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true, company: true, role: true, location: true,
        extractionStatus: true, screenshotUrl: true,
      },
    });
    if (existing) {
      return {
        id: existing.id,
        title: existing.role,
        company: existing.company,
        location: existing.location,
        extractionStatus: existing.extractionStatus,
        screenshotUrl: existing.screenshotUrl,
      };
    }
  }

  return null;
}

function formatSalaryString(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `${min} - ${max}`;
  if (min) return `${min}+`;
  return `Up to ${max}`;
}
