import { env } from '../config/env';

/**
 * AI Research Service
 * Integrates with OpenAI API for intelligent content generation
 */

export interface ResearchResult {
  beginnerExplanation: string;
  interviewNotes: string;
  productionNotes: string;
  resourceLinks: string[];
  keyConcepts: string[];
}

export const aiService = {
  /**
   * Research a technical topic using AI
   */
  async researchTopic(query: string): Promise<ResearchResult> {
    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not configured, using fallback responses');
      return this.getFallbackResearch(query);
    }

    try {
      const prompt = this.buildResearchPrompt(query);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a technical research assistant helping developers learn new technologies. Provide clear, concise, and accurate information.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      return this.parseAIResponse(content, query);
    } catch (error) {
      console.error('❌ AI Research Error:', error);
      return this.getFallbackResearch(query);
    }
  },

  /**
   * Build a structured prompt for AI research
   */
  buildResearchPrompt(query: string): string {
    return `Research the following technical topic: "${query}"

Please provide a comprehensive but concise response in the following format:

## Beginner Explanation
[Explain what it is, why it matters, and basic use cases in 2-3 paragraphs]

## Interview Focus
[Key points developers should know for interviews, common questions, and important concepts]

## Production Tips
[Best practices, common pitfalls, performance considerations, and real-world usage]

## Key Concepts
[List 3-5 core concepts or terms, comma-separated]

## Resources
[2-3 recommended learning resources with URLs]

Keep each section concise and practical.`;
  },

  /**
   * Parse AI response into structured format
   */
  parseAIResponse(content: string, query: string): ResearchResult {
    const sections = {
      beginnerExplanation: '',
      interviewNotes: '',
      productionNotes: '',
      resourceLinks: [] as string[],
      keyConcepts: [] as string[],
    };

    try {
      // Split by markdown headers
      const beginnerMatch = content.match(/## Beginner Explanation\s*\n([\s\S]*?)(?=\n##|$)/i);
      const interviewMatch = content.match(/## Interview Focus\s*\n([\s\S]*?)(?=\n##|$)/i);
      const productionMatch = content.match(/## Production Tips\s*\n([\s\S]*?)(?=\n##|$)/i);
      const conceptsMatch = content.match(/## Key Concepts\s*\n([\s\S]*?)(?=\n##|$)/i);
      const resourcesMatch = content.match(/## Resources\s*\n([\s\S]*?)(?=\n##|$)/i);

      sections.beginnerExplanation = beginnerMatch?.[1]?.trim() || `Research topic: ${query}`;
      sections.interviewNotes = interviewMatch?.[1]?.trim() || 'Focus on core concepts and practical applications.';
      sections.productionNotes = productionMatch?.[1]?.trim() || 'Follow best practices and test thoroughly.';
      
      // Parse concepts (comma-separated list)
      const conceptsText = conceptsMatch?.[1]?.trim() || '';
      sections.keyConcepts = conceptsText.split(',').map(c => c.trim()).filter(Boolean).slice(0, 5);
      
      // Parse resources (look for URLs)
      const resourcesText = resourcesMatch?.[1] || '';
      const urlRegex = /https?:\/\/[^\s\)]+/g;
      sections.resourceLinks = (resourcesText.match(urlRegex) || []).slice(0, 3);

      return sections;
    } catch (error) {
      console.error('❌ Parse error:', error);
      return this.getFallbackResearch(query);
    }
  },

  /**
   * Fallback research when AI is not available
   */
  getFallbackResearch(query: string): ResearchResult {
    return {
      beginnerExplanation: `${query} is a technology used in software development. To learn more, search the official documentation and try building small projects.`,
      interviewNotes: `For interviews, focus on: What is ${query}? When to use it? Key features and trade-offs. Common use cases.`,
      productionNotes: `Best practices: Read official docs, follow community standards, test thoroughly, monitor performance.`,
      resourceLinks: [
        `https://www.google.com/search?q=${encodeURIComponent(query)}+tutorial`,
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+explained`,
      ],
      keyConcepts: ['basics', 'implementation', 'best-practices'],
    };
  },
};
