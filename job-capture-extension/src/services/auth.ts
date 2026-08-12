// ─── Extension Auth Service ───
// Manages connection/disconnection between the Chrome Extension and DevOS.

import { getBackendUrl, setExtensionToken, clearAuth, getExtensionToken } from './api.js';

/** Verify a token and store it if valid */
export async function connectWithToken(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const backendUrl = await getBackendUrl();

  try {
    const response = await fetch(`${backendUrl}/api/auth/extension-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return { success: false, error: 'Invalid or expired token' };
    }

    const data = await response.json();
    if (data.success) {
      await setExtensionToken(token);
      return { success: true };
    }

    return { success: false, error: data.message || 'Verification failed' };
  } catch (err: any) {
    return {
      success: false,
      error: `Cannot reach DevOS backend at ${backendUrl}. Is it running?`,
    };
  }
}

/** Disconnect the extension */
export async function disconnect(): Promise<void> {
  await clearAuth();
  await chrome.action.setBadgeText({ text: '' });
}

/** Check if connected */
export async function isConnected(): Promise<boolean> {
  const token = await getExtensionToken();
  return !!token;
}
