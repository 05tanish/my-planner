import { useState, useEffect } from 'react';
import { Plus, Search, ExternalLink, Link as LinkIcon, Brain, Youtube } from 'lucide-react';
import { Github } from '@/components/ui/BrandIcons';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Knowledge {
  id: string;
  sourceType: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  keyConcepts: string[];
  notes?: string;
  tags: string[];
  createdAt: string;
}

const SOURCE_TYPES = [
  { value: 'YOUTUBE', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { value: 'GITHUB_REPO', label: 'GitHub', icon: Github, color: 'text-purple-500' },
  { value: 'ARTICLE', label: 'Article', icon: LinkIcon, color: 'text-blue-500' },
  { value: 'BLOG', label: 'Blog', icon: LinkIcon, color: 'text-green-500' },
  { value: 'DOCUMENTATION', label: 'Docs', icon: LinkIcon, color: 'text-yellow-500' },
  { value: 'OTHER', label: 'Other', icon: LinkIcon, color: 'text-gray-500' },
];

export default function KnowledgePage() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [filteredKnowledge, setFilteredKnowledge] = useState<Knowledge[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [researchResult, setResearchResult] = useState<any>(null);

  const [captureUrl, setCaptureUrl] = useState('');
  const [researchQuery, setResearchQuery] = useState('');

  useEffect(() => {
    fetchKnowledge();
    fetchStats();
  }, []);

  useEffect(() => {
    filterKnowledge();
  }, [knowledge, activeTab, searchQuery]);

  const fetchKnowledge = async () => {
    try {
      const response = await api.get('/knowledge');
      setKnowledge(response.data);
    } catch (error) {
      console.error('Failed to fetch knowledge:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/knowledge/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const filterKnowledge = () => {
    let filtered = [...knowledge];

    if (activeTab !== 'all') {
      filtered = filtered.filter(k => k.sourceType === activeTab.toUpperCase());
    }

    if (searchQuery) {
      filtered = filtered.filter(k =>
        k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredKnowledge(filtered);
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/knowledge/capture', { url: captureUrl });
      setIsCaptureOpen(false);
      setCaptureUrl('');
      fetchKnowledge();
      fetchStats();
    } catch (error) {
      console.error('Failed to capture:', error);
    }
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/knowledge/research', { query: researchQuery });
      setResearchResult(response.data);
      fetchKnowledge();
      fetchStats();
    } catch (error) {
      console.error('Failed to research:', error);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    const source = SOURCE_TYPES.find(s => s.value === sourceType);
    return source ? { Icon: source.icon, color: source.color } : { Icon: LinkIcon, color: 'text-gray-500' };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Capture and research technical knowledge</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCaptureOpen} onOpenChange={setIsCaptureOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="w-4 h-4 mr-2" />Quick Capture</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Capture</DialogTitle>
                <DialogDescription>Save a URL for later processing</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCapture} className="space-y-4">
                <div>
                  <Label>URL</Label>
                  <Input
                    value={captureUrl}
                    onChange={(e) => setCaptureUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: YouTube, GitHub, Articles, Blogs, Documentation
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsCaptureOpen(false)}>Cancel</Button>
                  <Button type="submit">Capture</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isResearchOpen} onOpenChange={setIsResearchOpen}>
            <DialogTrigger asChild>
              <Button><Brain className="w-4 h-4 mr-2" />Research Topic</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AI Research Assistant</DialogTitle>
                <DialogDescription>Get structured information about any technical topic</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleResearch} className="space-y-4">
                <div>
                  <Label>Topic</Label>
                  <Input
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    placeholder="redis pub/sub"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Research</Button>
              </form>

              {researchResult && (
                <div className="mt-6 space-y-4 border-t pt-4">
                  <div>
                    <h3 className="font-semibold mb-2">📚 Beginner Explanation</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary p-3 rounded">
                      {researchResult.researchData.beginnerExplanation}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">💼 Interview Notes</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary p-3 rounded">
                      {researchResult.researchData.interviewNotes}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">🚀 Production Notes</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary p-3 rounded">
                      {researchResult.researchData.productionNotes}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">🔗 Resource Links</h3>
                    <div className="space-y-2">
                      {researchResult.researchData.resourceLinks.map((link: string, idx: number) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-500 hover:underline"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Items</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">YouTube</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byType?.find((t: any) => t.sourceType === 'YOUTUBE')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">GitHub Repos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byType?.find((t: any) => t.sourceType === 'GITHUB_REPO')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalTags}</div></CardContent>
          </Card>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {SOURCE_TYPES.map(type => (
            <TabsTrigger key={type.value} value={type.value.toLowerCase()}>
              <type.icon className={`w-4 h-4 ${type.color}`} />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredKnowledge.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No knowledge captured yet</p>
                <Button onClick={() => setIsCaptureOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Start Capturing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredKnowledge.map((item) => {
                const { Icon, color } = getSourceIcon(item.sourceType);
                return (
                  <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-start gap-3 w-full pr-4">
                        <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{item.title}</p>
                          {item.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{item.summary}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {item.summary && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Summary:</h4>
                          <p className="text-sm text-muted-foreground">{item.summary}</p>
                        </div>
                      )}
                      {item.keyConcepts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Key Concepts:</h4>
                          <div className="flex flex-wrap gap-2">
                            {item.keyConcepts.map((concept, idx) => (
                              <Badge key={idx} variant="outline">{concept}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.notes && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Notes:</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}
                      {item.sourceUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Source
                          </a>
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
