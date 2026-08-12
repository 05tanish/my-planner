// ─── Offline Queue Service ───
// Stores failed captures locally and retries them when backend is available.
// Uses chrome.storage.local and chrome.alarms for persistence.

import type { QueuedCapture, JobImportPayload } from '../types/job.js';

const QUEUE_KEY = 'captureQueue';
const MAX_RETRIES = 5;

/** Get all queued items */
export async function getQueue(): Promise<QueuedCapture[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY);
  return result[QUEUE_KEY] || [];
}

/** Add an item to the queue */
export async function enqueue(payload: JobImportPayload, screenshotDataUrl?: string): Promise<void> {
  const queue = await getQueue();

  const item: QueuedCapture = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload: { ...payload, screenshot: undefined }, // Don't duplicate screenshot in payload
    screenshotDataUrl,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  queue.push(item);
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  await updateBadge(queue.length);
}

/** Remove an item from the queue */
export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.id !== id);
  await chrome.storage.local.set({ [QUEUE_KEY]: filtered });
  await updateBadge(filtered.length);
}

/** Increment retry count and update error */
export async function markRetry(id: string, error: string): Promise<void> {
  const queue = await getQueue();
  const item = queue.find(q => q.id === id);
  if (!item) return;

  item.retryCount++;
  item.lastError = error;

  // Remove items that exceeded max retries
  const filtered = queue.filter(q => q.retryCount <= MAX_RETRIES);
  await chrome.storage.local.set({ [QUEUE_KEY]: filtered });
  await updateBadge(filtered.length);
}

/** Get queue count */
export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/** Clear the entire queue */
export async function clearQueue(): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: [] });
  await updateBadge(0);
}

/** Update the extension badge with pending count */
async function updateBadge(count: number): Promise<void> {
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(count) });
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}
