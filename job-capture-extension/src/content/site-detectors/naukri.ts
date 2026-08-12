// ─── Naukri Job Extractor ───

import type { ExtractedJobData } from '../../types/job.js';
import {
  getText, getTextFromAny, cleanDescription,
  extractSkillsFromText, parseExperience, parseSalary, getAllText, getJsonLd,
} from '../dom-parser.js';

export function extractNaukri(): ExtractedJobData {
  const jsonLd = getJsonLd('JobPosting');
  if (jsonLd) {
    return extractFromJsonLd(jsonLd);
  }

  const title = getTextFromAny([
    '.jd-header-title',
    'h1.jd-header-title',
    '.naukri-job-title',
    '.styles_jd-header-title__rZwM1',
    'h1',
  ]);

  const company = getTextFromAny([
    '.jd-header-comp-name a',
    '.jd-header-comp-name',
    '.styles_jd-header-comp-name__MvDhr a',
    '.company-name',
  ]);

  const location = getTextFromAny([
    '.location',
    '.loc',
    '.locWdth',
    '.styles_jhc__loc___Du2H',
    '[class*="location"]',
  ]);

  const descEl = document.querySelector(
    '.dang-inner-html, .job-desc, .jd-desc, ' +
    '.styles_JDC__dang-inner-html__h0K4t, [class*="job-desc"]'
  );
  const description = cleanDescription(descEl?.textContent || null);

  const skills = getAllText(
    '.key-skill .chip, .keyskill-chip, .chipWrap .chip, ' +
    '.styles_key-skill__GIPn_ span, [class*="chip"]'
  );

  const expText = getTextFromAny([
    '.exp',
    '.expwdth',
    '.styles_jhc__exp__k_giM',
    '[class*="experience"]',
  ]);
  const exp = parseExperience(expText);

  const salaryText = getTextFromAny([
    '.sal',
    '.salWdth',
    '.styles_jhc__sal__jHavz',
    '[class*="salary"]',
  ]);
  const salary = parseSalary(salaryText);

  return {
    title,
    company,
    location,
    description,
    employmentType: null,
    experienceMin: exp.min,
    experienceMax: exp.max,
    salaryMin: salary.min,
    salaryMax: salary.max,
    skills,
    education: getAllText('[class*="education"] li, .edu .chip'),
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
    skills: Array.isArray(data.skills) ? data.skills : [],
    education: [],
    postedDate: data.datePosted || null,
    applicationDeadline: data.validThrough || null,
  };
}
