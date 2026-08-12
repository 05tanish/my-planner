// ─── Screenshot Capture Service ───
// Uses chrome.tabs.captureVisibleTab() to capture the visible area of the active tab.
// Must be called from the service worker (background script).

/**
 * Capture a screenshot of the currently visible tab.
 * Returns a base64 data URL (png format).
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(
      undefined as unknown as number, // current window
      { format: 'png', quality: 90 }
    );
    return dataUrl;
  } catch (err) {
    console.error('[DevOS] Screenshot capture failed:', err);
    return null;
  }
}

/**
 * Convert a base64 data URL to a Blob for upload.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const raw = atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}
