// ─── Shared Types for Job Capture Extension ───

/** Extracted job data from DOM or AI */
export interface ExtractedJobData {
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
}

/** Metadata about the capture */
export interface CaptureMetadata {
  source: string;          // "linkedin", "indeed", "naukri", "other"
  sourceUrl: string;
  pageTitle: string;
  capturedAt: string;      // ISO timestamp
  extensionVersion: string;
  extractionMethod: 'dom' | 'screenshot_ai' | null;
  extractionStatus: ExtractionStatus;
  extractionConfidence: number | null;
}

export type ExtractionStatus =
  | 'pending'
  | 'dom_extracted'
  | 'ai_extracted'
  | 'needs_review'
  | 'manually_completed';

/** Full payload sent to the backend */
export interface JobImportPayload {
  job: ExtractedJobData;
  metadata: CaptureMetadata;
  screenshot?: string; // base64 data URL
}

/** Backend response after import */
export interface JobImportResponse {
  success: boolean;
  job: {
    id: string;
    title: string | null;
    company: string | null;
    location: string | null;
    extractionStatus: string;
    screenshotUrl?: string;
  };
  isDuplicate?: boolean;
  message?: string;
}

/** Extraction result from content script */
export interface ExtractionResult {
  data: ExtractedJobData;
  confidence: number;        // 0.0 - 1.0
  method: 'dom';
  detectedSite: string;      // "linkedin", "indeed", "generic" etc.
  isValid: boolean;          // passed minimum field requirements
}

/** Validation result */
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  missingFields: string[];
  presentFields: string[];
}

// ─── Message Types (popup ↔ service-worker ↔ content-script) ───

export type MessageType =
  | 'PING'           // Liveness check from service worker to content script
  | 'DETECT_PAGE'
  | 'DETECT_PAGE_RESULT'
  | 'EXTRACT_JOB'
  | 'EXTRACT_JOB_RESULT'
  | 'CAPTURE_AND_SAVE'
  | 'CAPTURE_RESULT'
  | 'CHECK_AUTH'
  | 'AUTH_STATUS'
  | 'SAVE_TOKEN'
  | 'GET_PENDING_QUEUE';

export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
}

/** Page detection result */
export interface PageDetection {
  isJobPage: boolean;
  siteName: string;       // "LinkedIn", "Indeed", "Naukri", "Unknown"
  siteKey: string;        // "linkedin", "indeed", "naukri", "generic"
  pageTitle: string;
  url: string;
}

/** Capture status for popup UI */
export type CaptureStage =
  | 'idle'
  | 'detecting'
  | 'extracting'
  | 'validating'
  | 'capturing_screenshot'
  | 'sending_ai'
  | 'saving'
  | 'success'
  | 'saved_needs_review'
  | 'error';

/** Offline queue item */
export interface QueuedCapture {
  id: string;
  payload: JobImportPayload;
  screenshotDataUrl?: string;
  queuedAt: string;
  retryCount: number;
  lastError?: string;
}
