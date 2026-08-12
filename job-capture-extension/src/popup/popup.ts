import type {
  ExtensionMessage,
  PageDetection,
  CaptureStage,
  JobImportResponse,
} from '../types/job.js';

// ─── DOM Elements ───
const $connectionStatus = document.getElementById('connectionStatus')!;
const $connectionText = document.getElementById('connectionText')!;
const $notConnectedView = document.getElementById('notConnectedView')!;
const $captureView = document.getElementById('captureView')!;
const $tokenInput = document.getElementById('tokenInput') as HTMLInputElement;
const $connectBtn = document.getElementById('connectBtn')!;
const $siteName = document.getElementById('siteName')!;
const $pageStatus = document.getElementById('pageStatus')!;
const $pageStatusText = document.getElementById('pageStatusText')!;
const $captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const $captureBtnText = document.getElementById('captureBtnText')!;
const $captureBtnIcon = document.getElementById('captureBtnIcon')!;
const $progressSection = document.getElementById('progressSection')!;
const $resultSection = document.getElementById('resultSection')!;
const $resultContent = document.getElementById('resultContent')!;
const $queueSection = document.getElementById('queueSection')!;
const $queueCount = document.getElementById('queueCount')!;
const $syncNowBtn = document.getElementById('syncNowBtn')!;

// Step elements
const steps: Record<string, HTMLElement> = {
  detect: document.getElementById('stepDetect')!,
  extract: document.getElementById('stepExtract')!,
  validate: document.getElementById('stepValidate')!,
  screenshot: document.getElementById('stepScreenshot')!,
  ai: document.getElementById('stepAI')!,
  save: document.getElementById('stepSave')!,
};

let currentStage: CaptureStage = 'idle';

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await checkPendingQueue();
});

// ─── Auth ───
async function checkAuth(): Promise<void> {
  const result = await chrome.storage.local.get(['extensionToken', 'backendUrl']);
  const token = result.extensionToken as string | undefined;

  if (token) {
    showConnected();
    await detectPage();
  } else {
    showDisconnected();
  }
}

function showConnected(): void {
  const dot = $connectionStatus.querySelector('.status-dot')!;
  dot.classList.remove('disconnected');
  dot.classList.add('connected');
  $connectionText.textContent = 'Connected';
  $notConnectedView.classList.add('hidden');
  $captureView.classList.remove('hidden');
}

function showDisconnected(): void {
  const dot = $connectionStatus.querySelector('.status-dot')!;
  dot.classList.remove('connected');
  dot.classList.add('disconnected');
  $connectionText.textContent = 'Not connected';
  $notConnectedView.classList.remove('hidden');
  $captureView.classList.add('hidden');
}

// Connect button handler
$connectBtn.addEventListener('click', async () => {
  const token = $tokenInput.value.trim();
  if (!token) return;

  $connectBtn.textContent = 'Connecting...';
  ($connectBtn as HTMLButtonElement).disabled = true;

  try {
    // Verify token with backend
    const msg: ExtensionMessage = { type: 'CHECK_AUTH', payload: { token } };
    const response = await chrome.runtime.sendMessage(msg);

    if (response?.success) {
      await chrome.storage.local.set({ extensionToken: token });
      showConnected();
      await detectPage();
    } else {
      $tokenInput.style.borderColor = '#ef4444';
      setTimeout(() => { $tokenInput.style.borderColor = ''; }, 2000);
    }
  } catch (err) {
    console.error('Connect error:', err);
  } finally {
    $connectBtn.textContent = 'Connect';
    ($connectBtn as HTMLButtonElement).disabled = false;
  }
});

// ─── Page Detection ───
async function detectPage(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      showPageStatus('not-detected', '❌', 'Cannot access this page');
      return;
    }

    // Detect site from URL
    const url = new URL(tab.url);
    const hostname = url.hostname.toLowerCase();

    let siteName = 'Unknown Site';
    let isJobPage = false;

    if (hostname.includes('linkedin.com')) {
      siteName = 'LinkedIn';
      isJobPage = tab.url.includes('/jobs/') || tab.url.includes('/job/');
    } else if (hostname.includes('indeed.com')) {
      siteName = 'Indeed';
      isJobPage = tab.url.includes('/viewjob') || tab.url.includes('/jobs');
    } else if (hostname.includes('naukri.com')) {
      siteName = 'Naukri';
      isJobPage = tab.url.includes('/job-listings') || tab.url.includes('/job/');
    } else {
      siteName = hostname.replace('www.', '');
      // For unknown sites, always allow capture attempt
      isJobPage = true;
    }

    $siteName.textContent = siteName;

    if (isJobPage) {
      showPageStatus('detected', '✓', 'Job page detected');
      $captureBtn.disabled = false;
    } else {
      showPageStatus('not-detected', '⚠', 'May not be a job page');
      // Still allow capture — user knows best
      $captureBtn.disabled = false;
    }
  } catch (err) {
    showPageStatus('not-detected', '❌', 'Error detecting page');
    console.error('Detection error:', err);
  }
}

function showPageStatus(cls: string, icon: string, text: string): void {
  $pageStatus.className = 'page-status ' + cls;
  $pageStatus.querySelector('.status-icon')!.textContent = icon;
  $pageStatusText.textContent = text;
}

// ─── Capture Flow ───
$captureBtn.addEventListener('click', async () => {
  if (currentStage !== 'idle') return;
  await startCapture();
});

async function startCapture(): Promise<void> {
  currentStage = 'detecting';
  $captureBtn.disabled = true;
  $captureBtnText.textContent = 'Capturing...';
  $captureBtnIcon.innerHTML = '<span class="spinning">⏳</span>';
  $progressSection.classList.remove('hidden');
  $resultSection.classList.add('hidden');
  resetSteps();

  try {
    // Step 1: Detect
    setStepState('detect', 'active');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    setStepState('detect', 'done');

    // Step 2+3+4+5+6: Send to service worker which orchestrates the full flow
    setStepState('extract', 'active');

    const msg: ExtensionMessage = {
      type: 'CAPTURE_AND_SAVE',
      payload: { tabId: tab.id, url: tab.url, title: tab.title },
    };

    const response: { success: boolean; result?: JobImportResponse; stage?: CaptureStage; error?: string } =
      await chrome.runtime.sendMessage(msg);

    if (response.success && response.result) {
      handleCaptureSuccess(response.result);
    } else if (response.stage === 'saved_needs_review') {
      handleNeedsReview(response.result);
    } else {
      handleCaptureError(response.error || 'Unknown error');
    }
  } catch (err: any) {
    handleCaptureError(err.message || 'Capture failed');
  }
}

function handleCaptureSuccess(result?: JobImportResponse): void {
  completeAllSteps();
  const status = result?.job?.extractionStatus || 'dom_extracted';

  $resultSection.classList.remove('hidden');
  $resultContent.innerHTML = `
    <div class="result-success">
      <div class="result-title">✓ Job Saved!</div>
      <div class="result-detail">
        ${result?.job?.title || 'Job'} at ${result?.job?.company || 'Unknown Company'}
      </div>
      <div class="result-detail">
        Extraction: ${status.replace('_', ' ')}
        ${result?.isDuplicate ? ' (already existed)' : ''}
      </div>
    </div>
  `;
  resetCaptureBtn();
}

function handleNeedsReview(result?: JobImportResponse): void {
  setStepState('extract', 'done');
  setStepState('validate', 'error');
  setStepState('screenshot', 'done');
  setStepState('ai', 'error');
  setStepState('save', 'done');

  $resultSection.classList.remove('hidden');
  $resultContent.innerHTML = `
    <div class="result-warning">
      <div class="result-title">⚠ Saved — Needs Review</div>
      <div class="result-detail">
        Extraction was incomplete. Your screenshot has been saved.
      </div>
      <div class="result-detail">
        Complete the job details from the DevOS Job Tracker.
      </div>
    </div>
  `;
  resetCaptureBtn();
}

function handleCaptureError(error: string): void {
  $resultSection.classList.remove('hidden');
  $resultContent.innerHTML = `
    <div class="result-error">
      <div class="result-title">❌ Capture Failed</div>
      <div class="result-detail">${error}</div>
      <div class="result-detail">
        The capture may have been saved locally for retry.
      </div>
    </div>
  `;
  resetCaptureBtn();
}

// ─── Step Helpers ───
function setStepState(step: string, state: 'active' | 'done' | 'error' | 'skipped'): void {
  const el = steps[step];
  if (!el) return;
  el.className = 'progress-step ' + state;
  const icon = el.querySelector('.step-icon')!;
  switch (state) {
    case 'active': icon.textContent = '⏳'; icon.classList.add('pulsing'); break;
    case 'done': icon.textContent = '✓'; icon.classList.remove('pulsing'); break;
    case 'error': icon.textContent = '✗'; icon.classList.remove('pulsing'); break;
    case 'skipped': icon.textContent = '—'; icon.classList.remove('pulsing'); break;
  }
}

function resetSteps(): void {
  for (const key of Object.keys(steps)) {
    const el = steps[key];
    el.className = 'progress-step';
    el.querySelector('.step-icon')!.textContent = '⏳';
  }
}

function completeAllSteps(): void {
  for (const key of Object.keys(steps)) {
    setStepState(key, 'done');
  }
}

function resetCaptureBtn(): void {
  currentStage = 'idle';
  $captureBtn.disabled = false;
  $captureBtnText.textContent = 'Capture & Save Job';
  $captureBtnIcon.textContent = '📥';
}

// ─── Pending Queue ───
async function checkPendingQueue(): Promise<void> {
  const result = await chrome.storage.local.get('captureQueue');
  const queue: any[] = result.captureQueue || [];
  if (queue.length > 0) {
    $queueSection.classList.remove('hidden');
    $queueCount.textContent = String(queue.length);
  } else {
    $queueSection.classList.add('hidden');
  }
}

$syncNowBtn.addEventListener('click', async () => {
  const msg: ExtensionMessage = { type: 'GET_PENDING_QUEUE' };
  await chrome.runtime.sendMessage(msg);
  await checkPendingQueue();
});
