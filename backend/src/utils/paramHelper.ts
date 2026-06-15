/**
 * Helper to safely extract string value from query/param which can be string | string[]
 */
export function getString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Helper to safely extract string value from query/param, with fallback
 */
export function getStringOrDefault(value: string | string[] | undefined, defaultValue: string): string {
  if (Array.isArray(value)) {
    return value[0] || defaultValue;
  }
  return value || defaultValue;
}
