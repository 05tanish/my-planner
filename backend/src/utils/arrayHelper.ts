// Helper to process array fields from frontend
export const processArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// Helper to process array fields in data objects
export const processArrayFields = (data: any, arrayFields: string[]): any => {
  const processed = { ...data };
  arrayFields.forEach(field => {
    if (field in processed) {
      processed[field] = processArray(processed[field]);
    }
  });
  return processed;
};
