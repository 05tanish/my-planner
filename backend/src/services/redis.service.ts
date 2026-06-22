import { env } from '../config/env';

const isConfigured = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

if (isConfigured) {
  console.log('⚡ Upstash Redis client initialized');
} else {
  console.log('⚡ [Redis Not Configured] Running rate limiting in local memory fallback mode');
}

/**
 * Execute a single Redis command using Upstash HTTP REST API
 */
export const exec = async (command: string[]): Promise<any> => {
  if (!isConfigured) return null;

  try {
    const response = await fetch(env.UPSTASH_REDIS_REST_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upstash Redis error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    return data.result;
  } catch (error) {
    console.error('❌ Upstash Redis exec failure:', error);
    return null;
  }
};

/**
 * Execute multiple Redis commands in a single pipeline request
 */
export const pipeline = async (commands: any[][]): Promise<any[] | null> => {
  if (!isConfigured) return null;

  try {
    const response = await fetch(`${env.UPSTASH_REDIS_REST_URL!}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upstash Redis pipeline error: ${response.statusText} - ${errorText}`);
    }

    const results = await response.json() as any;
    return results.map((r: any) => r.result);
  } catch (error) {
    console.error('❌ Upstash Redis pipeline failure:', error);
    return null;
  }
};

/**
 * Get a value from Redis
 */
export const get = async (key: string): Promise<string | null> => {
  return exec(['GET', key]);
};

/**
 * Set a value in Redis with optional expiration in seconds
 */
export const set = async (key: string, value: string, exSeconds?: number): Promise<any> => {
  if (exSeconds) {
    return exec(['SET', key, value, 'EX', exSeconds.toString()]);
  }
  return exec(['SET', key, value]);
};

/**
 * Delete a key from Redis
 */
export const del = async (key: string): Promise<any> => {
  return exec(['DEL', key]);
};

/* ─── Session helpers ─────────────────────────────────────────────────── */

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
const sessionKey = (token: string) => `session:${token}`;

export interface SessionData {
  userId: string;
  email: string;
  role: string;
}

/**
 * Store a user session in Redis (replaces Postgres session lookup on hot path)
 */
export const setSession = async (token: string, data: SessionData): Promise<void> => {
  await set(sessionKey(token), JSON.stringify(data), SESSION_TTL);
};

/**
 * Get session data from Redis. Returns null if not found / expired.
 */
export const getSession = async (token: string): Promise<SessionData | null> => {
  const raw = await get(sessionKey(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
};

/**
 * Delete a session from Redis (used on logout)
 */
export const deleteSession = async (token: string): Promise<void> => {
  await del(sessionKey(token));
};
