// ─── DOM Parser Utilities ───
// Safe, reusable DOM extraction helpers

/** Safely get text content from a selector */
export function getText(selector: string, root: Element | Document = document): string | null {
  const el = root.querySelector(selector);
  return el?.textContent?.trim() || null;
}

/** Get text from multiple selectors, return first non-empty */
export function getTextFromAny(selectors: string[], root: Element | Document = document): string | null {
  for (const sel of selectors) {
    const text = getText(sel, root);
    if (text) return text;
  }
  return null;
}

/** Get content of a meta tag */
export function getMeta(name: string): string | null {
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement;
  return el?.content?.trim() || null;
}

/** Get all text from multiple selectors */
export function getAllText(selector: string, root: Element | Document = document): string[] {
  const els = root.querySelectorAll(selector);
  return Array.from(els)
    .map(el => el.textContent?.trim())
    .filter((t): t is string => !!t);
}

/** Get attribute from first matching element */
export function getAttr(selector: string, attr: string, root: Element | Document = document): string | null {
  const el = root.querySelector(selector);
  return el?.getAttribute(attr)?.trim() || null;
}

/** Extract JSON-LD data from the page */
export function getJsonLd(type?: string): any | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      
      // Handle @graph arrays
      if (data['@graph']) {
        const items = data['@graph'];
        for (const item of items) {
          if (!type || item['@type'] === type) return item;
        }
      }
      
      // Direct match
      if (!type || data['@type'] === type) return data;
      
      // Array of items
      if (Array.isArray(data)) {
        for (const item of data) {
          if (!type || item['@type'] === type) return item;
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }
  return null;
}

/** Clean HTML from description text */
export function cleanDescription(text: string | null): string | null {
  if (!text) return null;
  // Remove excessive whitespace and normalize
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .slice(0, 10000); // Cap at 10k chars
}

/** Extract skills from text by looking for common patterns */
export function extractSkillsFromText(text: string): string[] {
  // Common tech skill patterns
  const skillPatterns = [
    /(?:skills?|technologies?|requirements?|tech stack|qualifications?)[\s:]+([^.]+)/gi,
  ];

  const skills: Set<string> = new Set();

  for (const pattern of skillPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const items = match[1].split(/[,;•·\|]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
      items.forEach(s => skills.add(s));
    }
  }

  return Array.from(skills);
}

/** Parse experience range from text like "2-5 years" */
export function parseExperience(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };

  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  const singleMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (singleMatch) {
    return { min: parseInt(singleMatch[1]), max: null };
  }

  return { min: null, max: null };
}

/** Parse salary from text */
export function parseSalary(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };

  // Try range: $80,000 - $120,000 or 80k-120k or ₹8LPA-12LPA
  const rangeMatch = text.match(/[\$₹€£]?\s*([\d,]+(?:\.\d+)?)\s*[kK]?\s*[-–to]+\s*[\$₹€£]?\s*([\d,]+(?:\.\d+)?)\s*[kK]?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
    let max = parseFloat(rangeMatch[2].replace(/,/g, ''));
    // Handle "k" notation
    if (text.toLowerCase().includes('k') || min < 1000) {
      if (min < 1000) min *= 1000;
      if (max < 1000) max *= 1000;
    }
    return { min: Math.round(min), max: Math.round(max) };
  }

  return { min: null, max: null };
}
