// ─── Generic Job Extractor ───
// Works on any website using JSON-LD, meta tags, and semantic HTML

import type { ExtractedJobData } from '../../types/job.js';
import {
  getText, getTextFromAny, getMeta, getJsonLd,
  cleanDescription, extractSkillsFromText,
  parseExperience, parseSalary, getAllText,
} from '../dom-parser.js';

export function extractGeneric(): ExtractedJobData {
  // Strategy 1: JSON-LD JobPosting (highest quality)
  const jsonLd = getJsonLd('JobPosting');
  if (jsonLd) {
    return extractFromJsonLd(jsonLd);
  }

  // Strategy 2: Meta tags (OpenGraph, etc.)
  const metaData = extractFromMeta();

  // Strategy 3: Semantic HTML
  const semanticData = extractFromSemanticHtml();

  // Merge: prefer meta, fill gaps with semantic
  return mergeData(metaData, semanticData);
}

function extractFromJsonLd(data: any): ExtractedJobData {
  const exp = parseExperience(data.experienceRequirements?.toString() || '');
  const salary = data.baseSalary;
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;

  if (salary?.value) {
    if (typeof salary.value === 'object') {
      salaryMin = salary.value.minValue || null;
      salaryMax = salary.value.maxValue || null;
    } else {
      salaryMin = parseInt(salary.value) || null;
    }
  }

  const skills = Array.isArray(data.skills)
    ? data.skills
    : typeof data.skills === 'string'
      ? data.skills.split(',').map((s: string) => s.trim())
      : [];

  return {
    title: data.title || null,
    company: typeof data.hiringOrganization === 'string'
      ? data.hiringOrganization
      : data.hiringOrganization?.name || null,
    location: typeof data.jobLocation === 'string'
      ? data.jobLocation
      : data.jobLocation?.address?.addressLocality ||
        data.jobLocation?.name ||
        (Array.isArray(data.jobLocation) ? data.jobLocation[0]?.address?.addressLocality : null) ||
        null,
    description: cleanDescription(
      typeof data.description === 'string' ? data.description : null
    ),
    employmentType: Array.isArray(data.employmentType)
      ? data.employmentType[0]
      : data.employmentType || null,
    experienceMin: exp.min,
    experienceMax: exp.max,
    salaryMin,
    salaryMax,
    skills,
    education: Array.isArray(data.educationRequirements)
      ? data.educationRequirements
      : data.educationRequirements
        ? [data.educationRequirements.toString()]
        : [],
    postedDate: data.datePosted || null,
    applicationDeadline: data.validThrough || null,
  };
}

function extractFromMeta(): ExtractedJobData {
  return {
    title: getMeta('og:title') || getMeta('twitter:title'),
    company: getMeta('og:site_name'),
    location: null,
    description: cleanDescription(getMeta('og:description') || getMeta('description')),
    employmentType: null,
    experienceMin: null,
    experienceMax: null,
    salaryMin: null,
    salaryMax: null,
    skills: [],
    education: [],
    postedDate: null,
    applicationDeadline: null,
  };
}

function extractFromSemanticHtml(): ExtractedJobData {
  // Title: first h1, or common selectors
  const title = getTextFromAny([
    'h1',
    '[class*="job-title"]',
    '[class*="jobTitle"]',
    '[class*="job_title"]',
    '[data-testid*="title"]',
    '.posting-headline h1',
    '.job-header h1',
  ]);

  // Company
  const company = getTextFromAny([
    '[class*="company-name"]',
    '[class*="companyName"]',
    '[class*="company_name"]',
    '[class*="employer"]',
    '[data-testid*="company"]',
    '.company-name',
    'a[href*="company"]',
  ]);

  // Location
  const location = getTextFromAny([
    '[class*="job-location"]',
    '[class*="jobLocation"]',
    '[class*="job_location"]',
    '[class*="location"]',
    '[data-testid*="location"]',
    '.location',
  ]);

  // Description — get main content area
  const descEl = document.querySelector(
    '[class*="job-description"], [class*="jobDescription"], [class*="job_description"], ' +
    '[class*="description"], article, [role="main"] section, .job-details, main'
  );
  const description = cleanDescription(descEl?.textContent || null);

  // Skills from description text
  const skills = description ? extractSkillsFromText(description) : [];

  // Experience from any visible text
  const expText = getTextFromAny([
    '[class*="experience"]',
    '[class*="Experience"]',
  ]);
  const exp = parseExperience(expText);

  // Salary
  const salaryText = getTextFromAny([
    '[class*="salary"]',
    '[class*="Salary"]',
    '[class*="compensation"]',
    '[class*="pay"]',
  ]);
  const salary = parseSalary(salaryText);

  return {
    title,
    company,
    location,
    description,
    employmentType: getTextFromAny([
      '[class*="job-type"]',
      '[class*="jobType"]',
      '[class*="employment-type"]',
      '[class*="employmentType"]',
    ]),
    experienceMin: exp.min,
    experienceMax: exp.max,
    salaryMin: salary.min,
    salaryMax: salary.max,
    skills,
    education: [],
    postedDate: null,
    applicationDeadline: null,
  };
}

function mergeData(primary: ExtractedJobData, secondary: ExtractedJobData): ExtractedJobData {
  return {
    title: primary.title || secondary.title,
    company: primary.company || secondary.company,
    location: primary.location || secondary.location,
    description: primary.description || secondary.description,
    employmentType: primary.employmentType || secondary.employmentType,
    experienceMin: primary.experienceMin ?? secondary.experienceMin,
    experienceMax: primary.experienceMax ?? secondary.experienceMax,
    salaryMin: primary.salaryMin ?? secondary.salaryMin,
    salaryMax: primary.salaryMax ?? secondary.salaryMax,
    skills: primary.skills.length ? primary.skills : secondary.skills,
    education: primary.education.length ? primary.education : secondary.education,
    postedDate: primary.postedDate || secondary.postedDate,
    applicationDeadline: primary.applicationDeadline || secondary.applicationDeadline,
  };
}
