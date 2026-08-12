// ─── Indeed Job Extractor ───

import type { ExtractedJobData } from '../../types/job.js';
import {
  getText, getTextFromAny, cleanDescription,
  extractSkillsFromText, parseExperience, parseSalary, getJsonLd,
} from '../dom-parser.js';

export function extractIndeed(): ExtractedJobData {
  const jsonLd = getJsonLd('JobPosting');
  if (jsonLd) {
    return extractFromJsonLd(jsonLd);
  }

  const title = getTextFromAny([
    '.jobsearch-JobInfoHeader-title',
    'h1.jobTitle',
    '.icl-u-xs-mb--xs h1',
    'h1[data-testid="jobTitle"]',
    'h1',
  ]);

  const company = getTextFromAny([
    '[data-testid="inlineHeader-companyName"]',
    '.jobsearch-InlineCompanyRating-companyHeader a',
    '.icl-u-lg-mr--sm a',
    '.companyName',
    'div[data-company-name] a',
  ]);

  const location = getTextFromAny([
    '[data-testid="inlineHeader-companyLocation"]',
    '.jobsearch-JobInfoHeader-subtitle .icl-u-xs-mt--xs div',
    '.companyLocation',
    'div[data-testid="job-location"]',
  ]);

  const descEl = document.querySelector(
    '#jobDescriptionText, .jobsearch-jobDescriptionText, ' +
    '.jobDescription, [data-testid="jobDescription"]'
  );
  const description = cleanDescription(descEl?.textContent || null);

  const skills = description ? extractSkillsFromText(description) : [];

  const salaryText = getTextFromAny([
    '#salaryInfoAndJobType span',
    '.jobsearch-JobMetadataHeader-item',
    '[data-testid="attribute_snippet_testid"]',
  ]);
  const salary = parseSalary(salaryText);

  const expText = getTextFromAny([
    '.jobsearch-JobDescriptionSection-sectionItem',
  ]);
  const exp = parseExperience(expText);

  return {
    title,
    company,
    location,
    description,
    employmentType: getTextFromAny([
      '#salaryInfoAndJobType .jobsearch-JobMetadataHeader-item:last-child',
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

function extractFromJsonLd(data: any): ExtractedJobData {
  const exp = parseExperience(data.experienceRequirements?.toString() || '');
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  if (data.baseSalary?.value) {
    salaryMin = data.baseSalary.value.minValue || null;
    salaryMax = data.baseSalary.value.maxValue || null;
  }

  return {
    title: data.title || null,
    company: data.hiringOrganization?.name || null,
    location: data.jobLocation?.address?.addressLocality || null,
    description: cleanDescription(data.description || null),
    employmentType: data.employmentType || null,
    experienceMin: exp.min,
    experienceMax: exp.max,
    salaryMin,
    salaryMax,
    skills: [],
    education: [],
    postedDate: data.datePosted || null,
    applicationDeadline: data.validThrough || null,
  };
}
