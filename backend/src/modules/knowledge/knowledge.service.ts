import { PrismaClient, KnowledgeSourceType, DsaTopic } from '@prisma/client';
import { processArray } from '../../utils/arrayHelper';
import { aiService } from '../../services/ai.service';

const prisma = new PrismaClient();

export const knowledgeService = {
  // Get all knowledge captures
  async getAll(userId: string, filters?: {
    sourceType?: KnowledgeSourceType;
    tags?: string[];
  }) {
    const where: any = { userId };
    
    if (filters?.sourceType) where.sourceType = filters.sourceType;
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return prisma.knowledgeCapture.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get single knowledge capture
  async getOne(id: string, userId: string) {
    return prisma.knowledgeCapture.findFirst({
      where: { id, userId }
    });
  },

  // Create knowledge capture from URL
  async captureFromUrl(userId: string, sourceUrl: string) {
    // Detect source type from URL
    let sourceType: KnowledgeSourceType = 'OTHER';
    
    if (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')) {
      sourceType = 'YOUTUBE';
    } else if (sourceUrl.includes('github.com')) {
      sourceType = 'GITHUB_REPO';
    } else if (sourceUrl.includes('twitter.com') || sourceUrl.includes('x.com')) {
      sourceType = 'TWEET';
    } else if (sourceUrl.includes('medium.com') || sourceUrl.includes('dev.to')) {
      sourceType = 'BLOG';
    } else if (sourceUrl.match(/\.(pdf|doc|docx)$/i)) {
      sourceType = 'DOCUMENTATION';
    } else {
      sourceType = 'ARTICLE';
    }

    // Extract title from URL (basic extraction)
    const title = this.extractTitleFromUrl(sourceUrl);

    return prisma.knowledgeCapture.create({
      data: {
        userId,
        sourceType,
        sourceUrl,
        title,
        tags: ['quick-capture'],
        keyConcepts: [],
        linkedDsaTopics: [],
        linkedProjects: [],
        linkedQuestions: []
      }
    });
  },

  // Create knowledge capture with full data
  async create(userId: string, data: any) {
    const { tags, keyConcepts, linkedProjects, linkedQuestions, ...rest } = data;
    return prisma.knowledgeCapture.create({
      data: {
        ...rest,
        userId,
        tags: processArray(tags),
        keyConcepts: processArray(keyConcepts),
        linkedProjects: processArray(linkedProjects),
        linkedQuestions: processArray(linkedQuestions)
      }
    });
  },

  // Update knowledge capture (after processing)
  async update(id: string, userId: string, data: any) {
    return prisma.knowledgeCapture.update({
      where: { id, userId },
      data
    });
  },

  // Delete knowledge capture
  async delete(id: string, userId: string) {
    return prisma.knowledgeCapture.delete({
      where: { id, userId }
    });
  },

  // Research and process a topic using AI
  async research(userId: string, query: string) {
    // Use AI service for real research
    const aiResearch = await aiService.researchTopic(query);
    
    const summary = aiResearch.beginnerExplanation;
    const keyConcepts = aiResearch.keyConcepts;
    const tags = this.generateTags(query);

    const capture = await prisma.knowledgeCapture.create({
      data: {
        userId,
        sourceType: 'OTHER',
        sourceUrl: '',
        title: `Research: ${query}`,
        summary,
        keyConcepts,
        tags,
        notes: 'AI-generated research notes',
        linkedDsaTopics: [],
        linkedProjects: [],
        linkedQuestions: []
      }
    });

    return {
      capture,
      researchData: aiResearch
    };
  },

  // Link knowledge to DSA topics
  async linkToDsaTopic(id: string, userId: string, topics: DsaTopic[]) {
    return prisma.knowledgeCapture.update({
      where: { id, userId },
      data: {
        linkedDsaTopics: topics
      }
    });
  },

  // Link knowledge to projects
  async linkToProjects(id: string, userId: string, projectIds: string[]) {
    return prisma.knowledgeCapture.update({
      where: { id, userId },
      data: {
        linkedProjects: projectIds
      }
    });
  },

  // Link knowledge to interview questions
  async linkToQuestions(id: string, userId: string, questionIds: string[]) {
    return prisma.knowledgeCapture.update({
      where: { id, userId },
      data: {
        linkedQuestions: questionIds
      }
    });
  },

  // Process YouTube video
  async processYouTubeVideo(userId: string, url: string) {
    const videoId = this.extractYouTubeId(url);
    const title = `YouTube: ${videoId}`;

    const capture = await prisma.knowledgeCapture.create({
      data: {
        userId,
        sourceType: 'YOUTUBE',
        sourceUrl: url,
        title,
        summary: 'Video content pending processing',
        keyConcepts: ['video-tutorial'],
        tags: ['youtube', 'tutorial'],
        notes: 'Watch and extract key learnings',
        linkedDsaTopics: [],
        linkedProjects: [],
        linkedQuestions: []
      }
    });

    // Also create in YouTubeVideo table
    await prisma.youTubeVideo.create({
      data: {
        userId,
        title,
        channel: 'Unknown',
        url,
        status: 'WATCH_LATER',
        keyConcepts: [],
        importantTimestamps: {}
      }
    });

    return capture;
  },

  // Process GitHub repository
  async processGitHubRepo(userId: string, url: string) {
    const repoName = this.extractGitHubRepo(url);
    
    return prisma.knowledgeCapture.create({
      data: {
        userId,
        sourceType: 'GITHUB_REPO',
        sourceUrl: url,
        title: `GitHub: ${repoName}`,
        summary: 'Repository exploration pending',
        keyConcepts: ['code-reference', 'open-source'],
        tags: ['github', 'repository'],
        notes: 'Explore implementation patterns',
        linkedDsaTopics: [],
        linkedProjects: [],
        linkedQuestions: []
      }
    });
  },

  // Search knowledge captures
  async search(userId: string, query: string) {
    return prisma.knowledgeCapture.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
          { keyConcepts: { has: query.toLowerCase() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get statistics
  async getStats(userId: string) {
    const [total, byType, totalTags] = await Promise.all([
      prisma.knowledgeCapture.count({ where: { userId } }),
      prisma.knowledgeCapture.groupBy({
        by: ['sourceType'],
        where: { userId },
        _count: true
      }),
      prisma.knowledgeCapture.findMany({
        where: { userId },
        select: { tags: true }
      })
    ]);

    // Count unique tags
    const allTags = totalTags.flatMap(k => k.tags);
    const uniqueTags = [...new Set(allTags)];

    return {
      total,
      byType,
      totalTags: uniqueTags.length,
      topTags: this.getTopTags(allTags)
    };
  },

  // Helper functions
  extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(Boolean);
      return parts[parts.length - 1]?.replace(/[-_]/g, ' ') || 'Untitled';
    } catch {
      return 'Untitled';
    }
  },

  extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : 'unknown';
  },

  extractGitHubRepo(url: string): string {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1] : 'unknown';
  },

  generateResearchSummary(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Generate contextual summaries based on keywords
    if (lowerQuery.includes('redis')) {
      return 'Redis is an in-memory data structure store used as database, cache, and message broker. Key features include persistence, replication, and support for various data structures.';
    } else if (lowerQuery.includes('docker')) {
      return 'Docker is a platform for developing, shipping, and running applications in containers. Containers package software with dependencies for consistent deployment across environments.';
    } else if (lowerQuery.includes('kubernetes')) {
      return 'Kubernetes (K8s) is an open-source container orchestration platform for automating deployment, scaling, and management of containerized applications.';
    } else if (lowerQuery.includes('graphql')) {
      return 'GraphQL is a query language for APIs that allows clients to request exactly the data they need, improving efficiency over traditional REST APIs.';
    }
    
    return `Research topic: ${query}. Core concepts and implementation details to be explored.`;
  },

  extractKeyConcepts(query: string): string[] {
    const concepts: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Extract concepts based on common patterns
    if (lowerQuery.includes('redis')) concepts.push('caching', 'pub-sub', 'data-structures');
    if (lowerQuery.includes('docker')) concepts.push('containers', 'images', 'volumes');
    if (lowerQuery.includes('kubernetes')) concepts.push('pods', 'services', 'deployments');
    if (lowerQuery.includes('api')) concepts.push('endpoints', 'rest', 'http');
    if (lowerQuery.includes('database')) concepts.push('schema', 'queries', 'indexing');
    if (lowerQuery.includes('auth')) concepts.push('jwt', 'oauth', 'sessions');

    return concepts.length > 0 ? concepts : ['general-topic'];
  },

  generateTags(query: string): string[] {
    const tags: string[] = ['research'];
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.match(/redis|cache|memcached/)) tags.push('backend', 'caching');
    if (lowerQuery.match(/docker|kubernetes|container/)) tags.push('devops', 'infrastructure');
    if (lowerQuery.match(/react|vue|angular/)) tags.push('frontend', 'javascript');
    if (lowerQuery.match(/node|express|nest/)) tags.push('backend', 'nodejs');
    if (lowerQuery.match(/postgres|mysql|mongodb/)) tags.push('database');
    if (lowerQuery.match(/blockchain|solidity|ethereum/)) tags.push('blockchain', 'web3');

    return tags;
  },

  generateBeginnerExplanation(query: string): string {
    return `**What is ${query}?**\n\n` +
      `${query} is a technology/concept used in software development. ` +
      `It helps solve specific problems and is widely used in the industry.\n\n` +
      `**Why learn it?**\n` +
      `- Industry relevance\n` +
      `- Improves development efficiency\n` +
      `- Common interview topic\n\n` +
      `**Getting Started:**\n` +
      `1. Understand the basics\n` +
      `2. Follow official documentation\n` +
      `3. Build small projects\n` +
      `4. Practice regularly`;
  },

  generateInterviewNotes(query: string): string {
    return `**Interview Focus for ${query}:**\n\n` +
      `**Common Questions:**\n` +
      `- What is ${query} and when would you use it?\n` +
      `- Advantages and disadvantages\n` +
      `- Alternative solutions\n` +
      `- Real-world use cases\n\n` +
      `**Key Points to Mention:**\n` +
      `- Core concepts and architecture\n` +
      `- Performance characteristics\n` +
      `- Best practices\n` +
      `- Common pitfalls\n\n` +
      `**Example Answer Template:**\n` +
      `"${query} is used for [purpose]. In my projects, I've used it to [use case]. ` +
      `The main benefits are [benefits]. One challenge is [challenge] which can be solved by [solution]."`;
  },

  generateProductionNotes(query: string): string {
    return `**Production Considerations for ${query}:**\n\n` +
      `**Setup & Configuration:**\n` +
      `- Installation and dependencies\n` +
      `- Environment configuration\n` +
      `- Security best practices\n\n` +
      `**Performance:**\n` +
      `- Optimization techniques\n` +
      `- Monitoring and logging\n` +
      `- Scaling strategies\n\n` +
      `**Common Issues:**\n` +
      `- Troubleshooting guide\n` +
      `- Error handling\n` +
      `- Debugging tips\n\n` +
      `**Deployment Checklist:**\n` +
      `☐ Configuration validated\n` +
      `☐ Security hardened\n` +
      `☐ Monitoring enabled\n` +
      `☐ Backup strategy in place`;
  },

  generateResourceLinks(query: string): string[] {
    const baseResources = [
      `https://www.google.com/search?q=${encodeURIComponent(query + ' tutorial')}`,
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}`,
      `https://github.com/search?q=${encodeURIComponent(query)}`,
      `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`
    ];

    return baseResources;
  },

  getTopTags(tags: string[]): Array<{ tag: string; count: number }> {
    const tagCount = tags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
};
