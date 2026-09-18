// ─── DevOS Job Capture — Background Service Worker ───
// Orchestrates: popup ↔ content script ↔ backend API
// Service workers are ephemeral — all state is stored in chrome.storage

import type {
  ExtensionMessage,
  ExtractedJobData,
  ExtractionResult,
  JobImportPayload,
  CaptureMetadata,
  QueuedCapture,
} from '../types/job.js';

const EXTENSION_VERSION = '1.0.0';

// ─── Message Handler ───
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'CHECK_AUTH':
          sendResponse(await handleCheckAuth(message.payload));
          break;

        case 'CAPTURE_AND_SAVE':
          sendResponse(await handleCaptureAndSave(message.payload));
          break;

        case 'GET_PENDING_QUEUE':
          await processPendingQueue();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err: any) {
      console.error('Service worker error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // keep message channel open for async response
});

// ─── Auth Verification ───
async function handleCheckAuth(payload: { token: string }): Promise<{ success: boolean }> {
  try {
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/api/auth/extension-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: payload.token }),
    });
    const data = await response.json();
    return { success: data.success === true };
  } catch {
    return { success: false };
  }
}

// ─── Main Capture & Save Flow ───
async function handleCaptureAndSave(payload: {
  tabId: number;
  url: string;
  title: string;
}): Promise<any> {
  const { tabId, url, title } = payload;

  // Step 1: Run DOM extraction via content script.
  // The content script is already injected by the manifest at document_idle.
  // We ping it first; if it doesn't respond (e.g. fresh page load), we inject manually.
  let extraction: ExtractionResult | null = null;
  try {
    // Try pinging the already-running content script first
    let contentScriptReady = false;
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' } as ExtensionMessage);
      contentScriptReady = true;
    } catch {
      // Content script not ready — inject it manually
      contentScriptReady = false;
    }

    if (!contentScriptReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content.js'],
      });
      // Brief pause to let the newly injected script register its listener
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Now request extraction
    const extractResults = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_JOB',
    } as ExtensionMessage);
    extraction = extractResults as ExtractionResult;
  } catch (err) {
    console.warn('DOM extraction failed:', err);
  }

  const domSuccess = extraction && extraction.isValid && extraction.confidence >= 0.6;

  // Step 2: If DOM extraction is sufficient, save directly
  if (domSuccess && extraction) {
    const metadata: CaptureMetadata = {
      source: extraction.detectedSite,
      sourceUrl: url,
      pageTitle: title || '',
      capturedAt: new Date().toISOString(),
      extensionVersion: EXTENSION_VERSION,
      extractionMethod: 'dom',
      extractionStatus: 'dom_extracted',
      extractionConfidence: extraction.confidence,
    };

    const importPayload: JobImportPayload = {
      job: extraction.data,
      metadata,
    };

    return await sendToBackend(importPayload);
  }

  // Step 3: DOM failed/incomplete → Screenshot fallback
  let screenshotDataUrl: string | null = null;
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(undefined as any, {
      format: 'png',
      quality: 90,
    });
  } catch (err) {
    console.warn('Screenshot capture failed:', err);
  }

  // Step 4: Send partial DOM + screenshot to backend for AI extraction
  const partialData: ExtractedJobData = extraction?.data || {
    title: null, company: null, location: null, description: null,
    employmentType: null, experienceMin: null, experienceMax: null,
    salaryMin: null, salaryMax: null, skills: [], education: [],
    postedDate: null, applicationDeadline: null,
  };


  const metadata: CaptureMetadata = {
    source: extraction?.detectedSite || detectSiteFromUrl(url),
    sourceUrl: url,
    pageTitle: title || '',
    capturedAt: new Date().toISOString(),
    extensionVersion: EXTENSION_VERSION,
    extractionMethod: 'screenshot_ai',
    extractionStatus: 'pending', // backend will update this
    extractionConfidence: extraction?.confidence || 0,
  };

  const importPayload: JobImportPayload = {
    job: partialData,
    metadata,
    screenshot: screenshotDataUrl || undefined,
  };

  return await sendToBackend(importPayload);
}

// ─── Backend Communication ───
async function sendToBackend(payload: JobImportPayload): Promise<any> {
  try {
    const backendUrl = await getBackendUrl();
    const token = await getExtensionToken();

    if (!token) {
      return { success: false, error: 'Not authenticated. Please connect the extension.' };
    }

    // Send as JSON — service workers don't have FormData/Blob
    const body = {
      job: payload.job,
      metadata: payload.metadata,
      screenshot: payload.screenshot || undefined, // base64 data URL
    };

    const response = await fetch(`${backendUrl}/api/jobs/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Token': token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Authentication expired. Please reconnect.' };
      }
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data?.extractionStatus === 'needs_review') {
      return { success: true, result: data.data, stage: 'saved_needs_review' };
    }

    return { success: true, result: data.data };
  } catch (err: any) {
    console.error('Backend send failed:', err);

    // Queue for offline retry
    await queueForRetry(payload);
    return {
      success: false,
      error: 'Backend unavailable. Saved locally for retry.',
      stage: 'error',
    };
  }
}

// ─── Offline Queue ───
async function queueForRetry(payload: JobImportPayload): Promise<void> {
  const result = await chrome.storage.local.get('captureQueue');
  const queue: QueuedCapture[] = result.captureQueue || [];

  const item: QueuedCapture = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    screenshotDataUrl: payload.screenshot,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  // Remove screenshot from payload to avoid double storage
  delete (item.payload as any).screenshot;

  queue.push(item);
  await chrome.storage.local.set({ captureQueue: queue });

  // Show badge with pending count
  await chrome.action.setBadgeText({ text: String(queue.length) });
  await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
}

async function processPendingQueue(): Promise<void> {
  const result = await chrome.storage.local.get('captureQueue');
  const queue: QueuedCapture[] = result.captureQueue || [];
  if (queue.length === 0) return;

  const remaining: QueuedCapture[] = [];

  for (const item of queue) {
    try {
      // Restore screenshot if saved
      if (item.screenshotDataUrl) {
        item.payload.screenshot = item.screenshotDataUrl;
      }

      const sendResult = await sendToBackendDirect(item.payload);
      if (!sendResult.success) {
        item.retryCount++;
        item.lastError = sendResult.error;
        if (item.retryCount < 5) {
          remaining.push(item);
        }
      }
    } catch {
      item.retryCount++;
      if (item.retryCount < 5) {
        remaining.push(item);
      }
    }
  }

  await chrome.storage.local.set({ captureQueue: remaining });

  if (remaining.length === 0) {
    await chrome.action.setBadgeText({ text: '' });
  } else {
    await chrome.action.setBadgeText({ text: String(remaining.length) });
  }
}

/** Direct send without queue fallback (used by queue processor) */
async function sendToBackendDirect(payload: JobImportPayload): Promise<any> {
  const backendUrl = await getBackendUrl();
  const token = await getExtensionToken();
  if (!token) return { success: false, error: 'Not authenticated' };

  const body = {
    job: payload.job,
    metadata: payload.metadata,
    screenshot: payload.screenshot || undefined,
  };

  const response = await fetch(`${backendUrl}/api/jobs/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Token': token,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

// ─── Retry Alarm ───
// Guard against duplicate alarm creation on service worker restarts
chrome.alarms.get('retryQueue').then(existing => {
  if (!existing) {
    chrome.alarms.create('retryQueue', { periodInMinutes: 5 });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'retryQueue') {
    await processPendingQueue();
  }
});

// ─── Utilities ───
async function getBackendUrl(): Promise<string> {
  return 'https://devos-backend-production-6025.up.railway.app';
}

async function getExtensionToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('extensionToken');
  return result.extensionToken || null;
}

function detectSiteFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('indeed.com')) return 'indeed';
    if (hostname.includes('naukri.com')) return 'naukri';
    return 'other';
  } catch {
    return 'other';
  }
}

