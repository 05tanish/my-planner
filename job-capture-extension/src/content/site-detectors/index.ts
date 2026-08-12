// ─── Site Detector Registry ───
// Maps hostnames to site-specific extractors

import type { ExtractedJobData } from '../../types/job.js';
import { extractLinkedIn } from './linkedin.js';
import { extractIndeed } from './indeed.js';
import { extractNaukri } from './naukri.js';
import { extractGeneric } from './generic.js';

type SiteExtractor = () => ExtractedJobData;

interface SiteDetectorEntry {
  key: string;
  name: string;
  hostPatterns: string[];
  extractor: SiteExtractor;
}

const SITE_REGISTRY: SiteDetectorEntry[] = [
  {
    key: 'linkedin',
    name: 'LinkedIn',
    hostPatterns: ['linkedin.com'],
    extractor: extractLinkedIn,
  },
  {
    key: 'indeed',
    name: 'Indeed',
    hostPatterns: ['indeed.com', 'indeed.co'],
    extractor: extractIndeed,
  },
  {
    key: 'naukri',
    name: 'Naukri',
    hostPatterns: ['naukri.com'],
    extractor: extractNaukri,
  },
];

/** Detect which site we're on and return the appropriate extractor */
export function detectSite(): { key: string; name: string; extractor: SiteExtractor } {
  const hostname = window.location.hostname.toLowerCase();

  for (const site of SITE_REGISTRY) {
    for (const pattern of site.hostPatterns) {
      if (hostname.includes(pattern)) {
        return { key: site.key, name: site.name, extractor: site.extractor };
      }
    }
  }

  // Fallback to generic
  return {
    key: 'generic',
    name: hostname.replace('www.', ''),
    extractor: extractGeneric,
  };
}
