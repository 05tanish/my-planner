import { env } from '../config/env';

/**
 * Vision AI Service — Extracts structured job data from screenshots
 * Uses Gemini 1.5 Flash for free vision AI extraction.
 * Provider-agnostic interface allows swapping to other providers later.
 */

export interface JobExtractionResult {
  success: boolean;
  data: {
    title: string | null;
    company: string | null;
    location: string | null;
    description: string | null;
    employmentType: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    salaryMin: number | null;
    salaryMax: number | null;
    skills: string[];
    education: string[];
    postedDate: string | null;
  };
  error?: string;
}

interface VisionAIProvider {
  extractJobFromImage(
    imageBase64: string,
    mimeType: string,
    partialData?: Record<string, any>
  ): Promise<JobExtractionResult>;
}

// ─── Gemini Vision Provider ───
class GeminiVisionProvider implements VisionAIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-3.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractJobFromImage(
    imageBase64: string,
    mimeType: string,
    partialData?: Record<string, any>
  ): Promise<JobExtractionResult> {
    const prompt = this.buildPrompt(partialData);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
      }

      const result: any = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(text);
      return {
        success: true,
        data: {
          title: parsed.title || null,
          company: parsed.company || null,
          location: parsed.location || null,
          description: parsed.description || null,
          employmentType: parsed.employment_type || parsed.employmentType || null,
          experienceMin: parsed.experience_min ?? parsed.experienceMin ?? null,
          experienceMax: parsed.experience_max ?? parsed.experienceMax ?? null,
          salaryMin: parsed.salary_min ?? parsed.salaryMin ?? null,
          salaryMax: parsed.salary_max ?? parsed.salaryMax ?? null,
          skills: Array.isArray(parsed.skills) ? parsed.skills : [],
          education: Array.isArray(parsed.education) ? parsed.education : [],
          postedDate: parsed.posted_date || parsed.postedDate || null,
        },
      };
    } catch (error: any) {
      console.error('❌ Gemini Vision extraction failed:', error.message);
      return {
        success: false,
        data: {
          title: null, company: null, location: null, description: null,
          employmentType: null, experienceMin: null, experienceMax: null,
          salaryMin: null, salaryMax: null, skills: [], education: [],
          postedDate: null,
        },
        error: error.message,
      };
    }
  }

  private buildPrompt(partialData?: Record<string, any>): string {
    let context = '';
    if (partialData) {
      const nonNull = Object.entries(partialData)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n');
      if (nonNull) {
        context = `\n\nPartially extracted data (fill in missing fields from the screenshot):\n${nonNull}`;
      }
    }

    return `Extract job posting information from this screenshot.

Return ONLY a JSON object with these fields:
{
  "title": "job title or null",
  "company": "company name or null",
  "location": "job location or null",
  "description": "brief job description or null",
  "employment_type": "Full-time/Part-time/Contract/Internship or null",
  "experience_min": number or null,
  "experience_max": number or null,
  "salary_min": number or null,
  "salary_max": number or null,
  "skills": ["skill1", "skill2"] or [],
  "education": ["requirement1"] or [],
  "posted_date": "ISO date or null"
}

CRITICAL RULES:
- Return null for any field NOT visible in the screenshot.
- Do NOT guess or invent information.
- Do NOT hallucinate data.
- Only extract what is clearly visible.
- Skills must be specific technologies/tools, not generic phrases.${context}`;
  }
}

// ─── Public API ───

let provider: VisionAIProvider | null = null;

function getProvider(): VisionAIProvider | null {
  if (provider) return provider;

  if (env.GEMINI_API_KEY) {
    provider = new GeminiVisionProvider(env.GEMINI_API_KEY);
    console.log('⚡ Vision AI: Gemini provider initialized');
    return provider;
  }

  console.warn('⚠️ No Vision AI provider configured (GEMINI_API_KEY missing)');
  return null;
}

/**
 * Extract job information from a screenshot image.
 * Returns structured data or a failure result (never throws).
 */
export async function extractJobFromScreenshot(
  imageBuffer: Buffer,
  mimeType: string = 'image/png',
  partialData?: Record<string, any>
): Promise<JobExtractionResult> {
  const ai = getProvider();

  if (!ai) {
    return {
      success: false,
      data: {
        title: null, company: null, location: null, description: null,
        employmentType: null, experienceMin: null, experienceMax: null,
        salaryMin: null, salaryMax: null, skills: [], education: [],
        postedDate: null,
      },
      error: 'No Vision AI provider configured',
    };
  }

  const base64 = imageBuffer.toString('base64');
  return ai.extractJobFromImage(base64, mimeType, partialData);
}
