import { useState, useEffect } from 'react';
import { Plus, Search, Star, Clock, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface InterviewQuestion {
  id: string;
  category: string;
  subCategory?: string;
  question: string;
  shortAnswer?: string;
  detailedAnswer?: string;
  notes?: string;
  tags: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  revisionCount: number;
  lastRevisedAt?: string;
  isFavorite: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'BACKEND', label: 'Backend' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'BLOCKCHAIN', label: 'Blockchain' },
  { value: 'HR', label: 'HR' },
  { value: 'PROJECT_QUESTIONS', label: 'Project Questions' },
];

const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy', color: 'text-green-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-500' },
  { value: 'HARD', label: 'Hard', color: 'text-orange-500' },
  { value: 'EXPERT', label: 'Expert', color: 'text-red-500' },
];

const emptyForm = {
  category: 'BACKEND', question: '', shortAnswer: '', detailedAnswer: '',
  notes: '', tags: '', difficulty: 'MEDIUM',
};

export default function InterviewsPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [filtered, setFiltered] = useState<InterviewQuestion[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InterviewQuestion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { fetchAll(); fetchStats(); }, []);
  useEffect(() => { applyFilter(); }, [questions, activeCategory, search]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await api.get('/interviews');
      setQuestions(res.data.data);
    } catch { toast.error('Failed to load questions'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/interviews/stats');
      setStats(res.data.data);
    } catch { /* silent */ }
  };

  const applyFilter = () => {
    let f = [...questions];
    if (activeCategory !== 'all' && activeCategory !== 'favorites' && activeCategory !== 'due') {
      f = f.filter(q => q.category === activeCategory);
    }
    if (activeCategory === 'favorites') f = f.filter(q => q.isFavorite);
    if (activeCategory === 'due') {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      f = f.filter(q => !q.lastRevisedAt || new Date(q.lastRevisedAt) < cutoff);
    }
    if (search) {
      f = f.filter(q =>
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.shortAnswer?.toLowerCase().includes(search.toLowerCase()) ||
        q.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      );
    }
    setFiltered(f);
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (q: InterviewQuestion) => {
    setEditing(q);
    setForm({
      category: q.category, question: q.question, shortAnswer: q.shortAnswer || '',
      detailedAnswer: q.detailedAnswer || '', notes: q.notes || '',
      tags: q.tags.join(', '), difficulty: q.difficulty,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (editing) {
        await api.patch(`/interviews/${editing.id}`, payload);
        toast.success('Question updated');
      } else {
        await api.post('/interviews', payload);
        toast.success('Question added');
      }
      setFormOpen(false);
      fetchAll();
      fetchStats();
    } catch { toast.error('Failed to save question'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/interviews/${deleteId}`);
      toast.success('Question deleted');
      setDeleteId(null);
      fetchAll();
      fetchStats();
    } catch { toast.error('Failed to delete question'); }
  };

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/interviews/${id}/favorite`);
      fetchAll();
    } catch { toast.error('Failed to update favorite'); }
  };

  const markRevised = async (id: string) => {
    try {
      await api.post(`/interviews/${id}/revise`);
      toast.success('Marked as revised');
      fetchAll();
      fetchStats();
    } catch { toast.error('Failed to mark revised'); }
  };

  const diffColor = (d: string) => DIFFICULTIES.find(x => x.value === d)?.color ?? 'text-gray-500';

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interview Vault</h1>
          <p className="text-muted-foreground">Master your interview preparation</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Question</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Favorites', value: stats.favorites, color: 'text-yellow-500' },
            { label: 'Due for Revision', value: stats.dueForRevision, color: 'text-orange-500' },
            { label: 'Categories', value: stats.byCategory?.length ?? 0, color: '' },
          ].map(s => (
            <Card key={s.label}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search questions, answers, tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({questions.length})</TabsTrigger>
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.value} value={c.value}>
              {c.label} ({questions.filter(q => q.category === c.value).length})
            </TabsTrigger>
          ))}
          <TabsTrigger value="favorites"><Star className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="due"><Clock className="w-4 h-4" /></TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No questions found</p>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Your First Question</Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {filtered.map(q => (
                <AccordionItem key={q.id} value={q.id} className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start justify-between w-full pr-4 gap-2">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-medium ${diffColor(q.difficulty)}`}>{q.difficulty}</span>
                          <Badge variant="outline" className="text-xs">{q.category}</Badge>
                          {q.revisionCount > 0 && <Badge variant="secondary" className="text-xs">×{q.revisionCount}</Badge>}
                        </div>
                        <p className="font-medium text-sm">{q.question}</p>
                      </div>
                      <button
                        className="shrink-0 p-1 rounded hover:bg-secondary"
                        onClick={e => toggleFavorite(q.id, e)}
                      >
                        <Star className={`w-4 h-4 ${q.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4 pb-4">
                    {q.shortAnswer && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Short Answer</h4>
                        <p className="text-sm">{q.shortAnswer}</p>
                      </div>
                    )}
                    {q.detailedAnswer && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Detailed Answer</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.detailedAnswer}</p>
                      </div>
                    )}
                    {q.notes && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</h4>
                        <p className="text-sm text-muted-foreground italic">{q.notes}</p>
                      </div>
                    )}
                    {q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {q.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => markRevised(q.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />Mark Revised
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(q)}>
                        <Edit2 className="w-4 h-4 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(q.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />Delete
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Question' : 'Add Interview Question'}</DialogTitle>
            <DialogDescription>Store interview Q&A for revision</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Question *</Label>
              <Textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Explain the difference between REST and GraphQL" rows={2} required />
            </div>
            <div>
              <Label>Short Answer</Label>
              <Textarea value={form.shortAnswer} onChange={e => setForm({ ...form, shortAnswer: e.target.value })} placeholder="Brief 2-3 sentence answer" rows={3} />
            </div>
            <div>
              <Label>Detailed Answer</Label>
              <Textarea value={form.detailedAnswer} onChange={e => setForm({ ...form, detailedAnswer: e.target.value })} placeholder="Complete explanation with examples" rows={5} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Tips, resources, follow-up questions" rows={2} />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="api, rest, architecture" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save Changes' : 'Add Question'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Question?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
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
