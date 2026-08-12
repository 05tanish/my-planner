// ─── Extension API Client ───
// Handles communication between the Chrome Extension and the DevOS backend.
// Stores and retrieves the auth token from chrome.storage.local.

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

/** Get the backend URL from storage, with fallback */
export async function getBackendUrl(): Promise<string> {
  const result = await chrome.storage.local.get('backendUrl');
  return result.backendUrl || DEFAULT_BACKEND_URL;
}

/** Get the stored extension auth token */
export async function getExtensionToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('extensionToken');
  return result.extensionToken || null;
}

/** Store the extension auth token */
export async function setExtensionToken(token: string): Promise<void> {
  await chrome.storage.local.set({ extensionToken: token });
}

/** Store the backend URL */
export async function setBackendUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ backendUrl: url });
}

/** Clear stored auth data */
export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove(['extensionToken']);
}

/** Make an authenticated API request to the backend */
export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const backendUrl = await getBackendUrl();
  const token = await getExtensionToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  const url = `${backendUrl}${path}`;
  const headers: Record<string, string> = {
    'X-Extension-Token': token,
    ...(options.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      return { success: false, error: 'Authentication expired. Please reconnect.' };
    }

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Server error: ${response.status} — ${text}` };
    }

    const json = await response.json();
    return { success: true, data: json.data ?? json };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}
