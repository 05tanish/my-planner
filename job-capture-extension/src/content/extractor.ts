// ─── Main Extraction Orchestrator ───
// Runs the site-specific extractor, validates, and returns results

import type { ExtractionResult } from '../types/job.js';
import { detectSite } from './site-detectors/index.js';
import { validateExtraction } from './validators.js';

/**
 * Extract job information from the current page.
 * Called by the content script when the service worker requests extraction.
 */
export async function extractJobFromPage(): Promise<ExtractionResult> {
  // Detect which site we're on and get the appropriate extractor
  const { key, name, extractor } = detectSite();

  // Run extraction
  const data = extractor();

  // Validate the extraction
  const validation = validateExtraction(data);

  return {
    data,
    confidence: validation.confidence,
    method: 'dom',
    detectedSite: key,
    isValid: validation.isValid,
  };
}
