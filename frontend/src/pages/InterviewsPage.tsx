import { useState, useEffect } from 'react';
import { Plus, Search, Star, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function InterviewsPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<InterviewQuestion[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    category: 'BACKEND',
    question: '',
    shortAnswer: '',
    detailedAnswer: '',
    notes: '',
    tags: '',
    difficulty: 'MEDIUM',
  });

  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, activeCategory, searchQuery]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/interviews');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/interviews/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    // Filter by category
    if (activeCategory !== 'all' && activeCategory !== 'favorites' && activeCategory !== 'due') {
      filtered = filtered.filter(q => q.category === activeCategory);
    }

    // Filter favorites
    if (activeCategory === 'favorites') {
      filtered = filtered.filter(q => q.isFavorite);
    }

    // Filter due for revision
    if (activeCategory === 'due') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(q => 
        !q.lastRevisedAt || new Date(q.lastRevisedAt) < sevenDaysAgo
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.shortAnswer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredQuestions(filtered);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      };
      await api.post('/interviews', payload);
      setIsCreateOpen(false);
      fetchQuestions();
      fetchStats();
      resetForm();
    } catch (error) {
      console.error('Failed to create question:', error);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      await api.post(`/interviews/${id}/favorite`);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const markRevised = async (id: string) => {
    try {
      await api.post(`/interviews/${id}/revise`);
      fetchQuestions();
      fetchStats();
    } catch (error) {
      console.error('Failed to mark revised:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'BACKEND',
      question: '',
      shortAnswer: '',
      detailedAnswer: '',
      notes: '',
      tags: '',
      difficulty: 'MEDIUM',
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    return DIFFICULTIES.find(d => d.value === difficulty)?.color || 'text-gray-500';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading interviews...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interview Vault</h1>
          <p className="text-muted-foreground">Master your interview preparation</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Interview Question</DialogTitle>
              <DialogDescription>Store questions and answers for revision</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(diff => (
                        <SelectItem key={diff.value} value={diff.value}>{diff.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="question">Question *</Label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Explain the difference between REST and GraphQL"
                  rows={2}
                  required
                />
              </div>
              <div>
                <Label htmlFor="shortAnswer">Short Answer</Label>
                <Textarea
                  id="shortAnswer"
                  value={formData.shortAnswer}
                  onChange={(e) => setFormData({ ...formData, shortAnswer: e.target.value })}
                  placeholder="Brief 2-3 sentence answer"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="detailedAnswer">Detailed Answer</Label>
                <Textarea
                  id="detailedAnswer"
                  value={formData.detailedAnswer}
                  onChange={(e) => setFormData({ ...formData, detailedAnswer: e.target.value })}
                  placeholder="Complete explanation with examples"
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional tips or resources"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="api, rest, architecture"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Question</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.favorites}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Due for Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.dueForRevision}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byCategory.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions, answers, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="BACKEND">Backend</TabsTrigger>
          <TabsTrigger value="DEVOPS">DevOps</TabsTrigger>
          <TabsTrigger value="BLOCKCHAIN">Blockchain</TabsTrigger>
          <TabsTrigger value="HR">HR</TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="due">
            <Clock className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No questions found</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredQuestions.map((question) => (
                <AccordionItem
                  key={question.id}
                  value={question.id}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start justify-between w-full pr-4">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {question.category}
                          </Badge>
                          {question.revisionCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Revised {question.revisionCount}x
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{question.question}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(question.id);
                        }}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            question.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''
                          }`}
                        />
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {question.shortAnswer && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Short Answer:</h4>
                        <p className="text-sm text-muted-foreground">{question.shortAnswer}</p>
                      </div>
                    )}
                    {question.detailedAnswer && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Detailed Answer:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {question.detailedAnswer}
                        </p>
                      </div>
                    )}
                    {question.notes && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Notes:</h4>
                        <p className="text-sm text-muted-foreground italic">{question.notes}</p>
                      </div>
                    )}
                    {question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {question.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markRevised(question.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Revised
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
