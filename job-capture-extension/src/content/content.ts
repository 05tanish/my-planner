// ─── Content Script — Entry Point ───
// Injected into job pages. Listens for extraction requests from the service worker.

import { extractJobFromPage } from './extractor.js';
import type { ExtensionMessage, ExtractionResult } from '../types/job.js';

// Listen for messages from the service worker / popup
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB') {
    (async () => {
      try {
        const result = await extractJobFromPage();
        sendResponse(result);
      } catch (err: any) {
        console.error('[DevOS] Extraction error:', err);
        sendResponse({
          data: {
            title: null, company: null, location: null, description: null,
            employmentType: null, experienceMin: null, experienceMax: null,
            salaryMin: null, salaryMax: null, skills: [], education: [],
            postedDate: null, applicationDeadline: null,
          },
          confidence: 0,
          method: 'dom',
          detectedSite: 'generic',
          isValid: false,
        } satisfies ExtractionResult);
      }
    })();
    return true; // keep channel open for async
  }

  if (message.type === 'DETECT_PAGE') {
    const hostname = window.location.hostname.toLowerCase();
    let siteName = hostname.replace('www.', '');
    if (hostname.includes('linkedin.com')) siteName = 'LinkedIn';
    else if (hostname.includes('indeed.com')) siteName = 'Indeed';
    else if (hostname.includes('naukri.com')) siteName = 'Naukri';

    sendResponse({
      isJobPage: true, // Let the extractor figure out specifics
      siteName,
      siteKey: siteName.toLowerCase(),
      pageTitle: document.title,
      url: window.location.href,
    });
    return false;
  }
});
