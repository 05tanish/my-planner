import { useState, useEffect } from 'react';
import { Plus, Search, ExternalLink, Link as LinkIcon, Brain, Video, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { Github } from '@/components/ui/BrandIcons';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';

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
  { value: 'YOUTUBE', label: 'YouTube', icon: Video, color: 'text-red-500' },
  { value: 'GITHUB_REPO', label: 'GitHub', icon: Github, color: 'text-purple-500' },
  { value: 'ARTICLE', label: 'Article', icon: LinkIcon, color: 'text-blue-500' },
  { value: 'BLOG', label: 'Blog', icon: LinkIcon, color: 'text-green-500' },
  { value: 'DOCUMENTATION', label: 'Docs', icon: LinkIcon, color: 'text-yellow-500' },
  { value: 'OTHER', label: 'Other', icon: LinkIcon, color: 'text-gray-500' },
];

export default function KnowledgePage() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [filtered, setFiltered] = useState<Knowledge[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [captureUrl, setCaptureUrl] = useState('');
  const [researchQuery, setResearchQuery] = useState('');

  useEffect(() => { fetchKnowledge(); fetchStats(); }, []);
  useEffect(() => { applyFilter(); }, [knowledge, activeTab, search]);

  const fetchKnowledge = async () => {
    try {
      const res = await api.get('/knowledge');
      setKnowledge(res.data);
    } catch { toast.error('Failed to load knowledge'); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/knowledge/stats');
      setStats(res.data);
    } catch { /* silent */ }
  };

  const applyFilter = () => {
    let f = [...knowledge];
    if (activeTab !== 'all') f = f.filter(k => k.sourceType === activeTab.toUpperCase());
    if (search) f = f.filter(k =>
      k.title.toLowerCase().includes(search.toLowerCase()) ||
      k.summary?.toLowerCase().includes(search.toLowerCase()) ||
      k.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
    setFiltered(f);
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/knowledge/capture', { url: captureUrl });
      toast.success('Knowledge captured!');
      setIsCaptureOpen(false);
      setCaptureUrl('');
      fetchKnowledge();
      fetchStats();
    } catch { toast.error('Failed to capture'); }
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setResearchLoading(true);
    setResearchResult(null);
    try {
      const res = await api.post('/knowledge/research', { query: researchQuery });
      setResearchResult(res.data);
      toast.success('Research complete — saved to knowledge base');
      fetchKnowledge();
      fetchStats();
    } catch { toast.error('Research failed'); }
    finally { setResearchLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/knowledge/${deleteId}`);
      toast.success('Deleted');
      setDeleteId(null);
      fetchKnowledge();
      fetchStats();
    } catch { toast.error('Failed to delete'); }
  };

  const saveToNotes = async (id: string) => {
    try {
      await api.post(`/knowledge/${id}/save-to-notes`);
      toast.success('Saved to Notes!');
    } catch { toast.error('Failed to save to notes'); }
  };

  const sourceInfo = (type: string) => {
    const s = SOURCE_TYPES.find(x => x.value === type);
    return s ? { Icon: s.icon, color: s.color } : { Icon: LinkIcon, color: 'text-gray-500' };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Capture and research technical knowledge</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCaptureOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Quick Capture
          </Button>
          <Button onClick={() => setIsResearchOpen(true)}>
            <Brain className="w-4 h-4 mr-2" />AI Research
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Items', value: stats.total },
            { label: 'YouTube', value: stats.byType?.find((t: any) => t.sourceType === 'YOUTUBE')?._count ?? 0 },
            { label: 'GitHub Repos', value: stats.byType?.find((t: any) => t.sourceType === 'GITHUB_REPO')?._count ?? 0 },
            { label: 'Unique Tags', value: stats.totalTags },
          ].map(s => (
            <Card key={s.label}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search knowledge..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({knowledge.length})</TabsTrigger>
          {SOURCE_TYPES.map(t => (
            <TabsTrigger key={t.value} value={t.value.toLowerCase()}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filtered.length === 0 ? (
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
            <Accordion type="single" collapsible className="space-y-3">
              {filtered.map(item => {
                const { Icon, color } = sourceInfo(item.sourceType);
                return (
                  <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-start gap-3 w-full pr-4">
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.summary}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.slice(0, 3).map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4 pb-4">
                      {item.summary && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Summary</h4>
                          <p className="text-sm text-muted-foreground">{item.summary}</p>
                        </div>
                      )}
                      {item.keyConcepts.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Key Concepts</h4>
                          <div className="flex flex-wrap gap-1">
                            {item.keyConcepts.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
                          </div>
                        </div>
                      )}
                      {item.notes && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2 border-t flex-wrap">
                        {item.sourceUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" />Source
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => saveToNotes(item.id)}>
                          <BookOpen className="w-3 h-3 mr-1" />Save to Notes
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />Delete
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Capture Dialog */}
      <Dialog open={isCaptureOpen} onOpenChange={setIsCaptureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Capture</DialogTitle>
            <DialogDescription>Save a URL to your knowledge base</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCapture} className="space-y-4">
            <div>
              <Label>URL *</Label>
              <Input
                value={captureUrl}
                onChange={e => setCaptureUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Supports YouTube, GitHub, articles, blogs, docs</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCaptureOpen(false)}>Cancel</Button>
              <Button type="submit">Capture</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Research Dialog */}
      <Dialog open={isResearchOpen} onOpenChange={v => { setIsResearchOpen(v); if (!v) setResearchResult(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Research Assistant</DialogTitle>
            <DialogDescription>Deep research any technical topic with AI</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResearch} className="space-y-4">
            <div>
              <Label>Topic *</Label>
              <Input
                value={researchQuery}
                onChange={e => setResearchQuery(e.target.value)}
                placeholder="redis pub/sub, docker networking, jwt auth..."
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={researchLoading}>
              {researchLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Researching...</> : <><Brain className="w-4 h-4 mr-2" />Research</>}
            </Button>
          </form>

          {researchResult && (
            <div className="mt-6 space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Results saved to knowledge base ✅</h3>
              {[
                { label: '📚 Beginner Explanation', key: 'beginnerExplanation' },
                { label: '💼 Interview Notes', key: 'interviewNotes' },
                { label: '🚀 Production Tips', key: 'productionNotes' },
              ].map(({ label, key }) => researchResult.researchData?.[key] && (
                <div key={key}>
                  <h4 className="font-semibold text-sm mb-2">{label}</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/40 p-3 rounded-lg">
                    {researchResult.researchData[key]}
                  </div>
                </div>
              ))}
              {researchResult.researchData?.resourceLinks?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">🔗 Resources</h4>
                  <div className="space-y-1">
                    {researchResult.researchData.resourceLinks.map((link: string, i: number) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                        className="block text-sm text-blue-500 hover:underline truncate"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Knowledge Item?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
