// ─── Extraction Validator ───
// Validates extracted data and calculates confidence score

import type { ExtractedJobData, ValidationResult } from '../types/job.js';

const FIELD_WEIGHTS: Record<string, number> = {
  title: 0.25,
  company: 0.20,
  location: 0.10,
  description: 0.15,
  employmentType: 0.05,
  experienceMin: 0.05,
  salaryMin: 0.05,
  skills: 0.10,
  postedDate: 0.03,
  education: 0.02,
};

/** Required minimum: title + company + (location OR description) + sourceUrl */
const REQUIRED_FIELDS = ['title', 'company'];

export function validateExtraction(data: ExtractedJobData): ValidationResult {
  const presentFields: string[] = [];
  const missingFields: string[] = [];
  let totalWeight = 0;

  // Check each field
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const value = (data as any)[field];
    const isPresent = value !== null && value !== undefined &&
      (typeof value === 'string' ? value.trim().length > 0 : true) &&
      (Array.isArray(value) ? value.length > 0 : true);

    if (isPresent) {
      presentFields.push(field);
      totalWeight += weight;
    } else {
      missingFields.push(field);
    }
  }

  // Bonus for having BOTH location and description
  if (presentFields.includes('location') && presentFields.includes('description')) {
    totalWeight = Math.min(1.0, totalWeight + 0.05);
  }

  const confidence = Math.round(totalWeight * 100) / 100;

  // Check required fields
  const hasMandatory = REQUIRED_FIELDS.every(f => presentFields.includes(f));
  const hasLocationOrDesc = presentFields.includes('location') || presentFields.includes('description');
  const isValid = hasMandatory && hasLocationOrDesc && confidence >= 0.4;

  return {
    isValid,
    confidence,
    missingFields,
    presentFields,
  };
}
