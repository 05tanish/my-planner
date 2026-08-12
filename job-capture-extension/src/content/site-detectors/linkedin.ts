// ─── LinkedIn Job Extractor ───

import type { ExtractedJobData } from '../../types/job.js';
import {
  getText, getTextFromAny, cleanDescription,
  extractSkillsFromText, parseExperience, getJsonLd,
} from '../dom-parser.js';

export function extractLinkedIn(): ExtractedJobData {
  // LinkedIn often has JSON-LD — try that first
  const jsonLd = getJsonLd('JobPosting');
  if (jsonLd) {
    return extractFromJsonLd(jsonLd);
  }

  // Fall back to LinkedIn-specific DOM selectors
  const title = getTextFromAny([
    '.job-details-jobs-unified-top-card__job-title',
    '.top-card-layout__title',
    '.jobs-unified-top-card__job-title',
    'h1.t-24',
    'h1',
  ]);

  const company = getTextFromAny([
    '.job-details-jobs-unified-top-card__company-name',
    '.topcard__org-name-link',
    '.jobs-unified-top-card__company-name',
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
    '.top-card-layout__card .topcard__flavor:first-child a',
  ]);

  const location = getTextFromAny([
    '.job-details-jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
    '.jobs-unified-top-card__bullet',
    '.top-card-layout__card .topcard__flavor--bullet',
  ]);

  const descEl = document.querySelector(
    '.jobs-description-content, .jobs-box__html-content, ' +
    '.show-more-less-html__markup, .description__text, ' +
    '.jobs-description__content'
  );
  const description = cleanDescription(descEl?.textContent || null);

  const skills = description ? extractSkillsFromText(description) : [];

  // Employment type & experience from criteria list
  const criteriaItems = document.querySelectorAll(
    '.job-details-jobs-unified-top-card__job-insight, ' +
    '.jobs-unified-top-card__job-insight, ' +
    '.description__job-criteria-item'
  );

  let employmentType: string | null = null;
  let expText: string | null = null;

  criteriaItems.forEach(item => {
    const label = item.querySelector('.job-criteria-subheader, .t-bold')?.textContent?.trim()?.toLowerCase();
    const value = item.querySelector('.job-criteria-text, .t-normal')?.textContent?.trim();
    if (!label || !value) return;
    if (label.includes('employment type') || label.includes('job type')) {
      employmentType = value;
    }
    if (label.includes('experience') || label.includes('seniority')) {
      expText = value;
    }
  });

  const exp = parseExperience(expText);

  return {
    title,
    company,
    location,
    description,
    employmentType,
    experienceMin: exp.min,
    experienceMax: exp.max,
    salaryMin: null,
    salaryMax: null,
    skills,
    education: [],
    postedDate: null,
    applicationDeadline: null,
  };
}

function extractFromJsonLd(data: any): ExtractedJobData {
  const exp = parseExperience(data.experienceRequirements?.toString() || '');

  return {
    title: data.title || null,
    company: data.hiringOrganization?.name || null,
    location: data.jobLocation?.address?.addressLocality ||
      (Array.isArray(data.jobLocation) ? data.jobLocation[0]?.address?.addressLocality : null) ||
      null,
    description: cleanDescription(data.description || null),
    employmentType: Array.isArray(data.employmentType)
      ? data.employmentType[0]
      : data.employmentType || null,
    experienceMin: exp.min,
    experienceMax: exp.max,
    salaryMin: null,
    salaryMax: null,
    skills: Array.isArray(data.skills) ? data.skills : [],
    education: [],
    postedDate: data.datePosted || null,
    applicationDeadline: data.validThrough || null,
  };
}
