import { Request, Response } from 'express';
import { aiService } from '../../services/ai.service';
import prisma from '../../config/database';

export const summarizeNote = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const prompt = `Summarize the following notes. Provide a concise TL;DR at the top, followed by key bullet points. Do not include introductory text, just the summary in markdown format:\n\n${content}`;
    
    const summary = await aiService.generateContent(prompt);
    res.json({ success: true, data: { summary } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const generateMockInterview = async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const prompt = `Generate 5 mock interview questions for the following topic/role/technology:
Topic: ${topic}

Provide 3 technical questions and 2 behavioral questions. Provide the output in markdown format with headings for each question. Do not include introductory text.`;

    const questions = await aiService.generateContent(prompt);
    res.json({ success: true, data: { questions } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const generateReadme = async (req: Request, res: Response) => {
  try {
    const { project } = req.body;
    if (!project || !project.name) return res.status(400).json({ error: 'Project data with name is required' });

    const prompt = `Generate a professional GitHub README.md for a project.
Title: ${project.name}
Description: ${project.description || 'A software project'}
Tech Stack / Tags: ${(project.techStack || []).join(', ')}
Features: ${(project.features || []).join(', ')}

Include sections for: Description, Features, Tech Stack, Installation, and Usage. Format strictly as Markdown. Do not include introductory conversational text.`;

    const readme = await aiService.generateContent(prompt);
    res.json({ success: true, data: { readme } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const explainDsaConcept = async (req: Request, res: Response) => {
  try {
    const { concept } = req.body;
    if (!concept) return res.status(400).json({ error: 'Concept is required' });

    const prompt = `Explain the Data Structure or Algorithm concept: "${concept}".
Provide:
1. A simplified, 2-sentence explanation.
2. A real-world analogy.
3. Time and Space complexity (if applicable).
Format as Markdown. Do not include introductory conversational text.`;

    const explanation = await aiService.generateContent(prompt);
    res.json({ success: true, data: { explanation } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const suggestSchedule = async (req: Request, res: Response) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'Tasks array is required' });

    const prompt = `Act as an AI scheduling assistant. I have the following unscheduled tasks:
${tasks.map((t: any) => `- ${t.title} (Priority: ${t.priority}, Est: ${t.estimatedMinutes || 30} mins)`).join('\n')}

Suggest a schedule for today assuming I have 4 hours of focus time. Group them logically and provide a short explanation of why you scheduled them this way. Format as Markdown.`;

    const schedule = await aiService.generateContent(prompt);
    res.json({ success: true, data: { schedule } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
