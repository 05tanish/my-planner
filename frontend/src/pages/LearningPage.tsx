import React, { useEffect, useState } from 'react';
import {
  GraduationCap, Plus, Search, ExternalLink, Calendar, Clock,
  Trash2, Edit2, Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import type { LearningEntry, LearningCategory, LearningResourceType } from '../types';
import { LEARNING_CATEGORIES, LEARNING_TYPES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function LearningPage() {
  const [entries, setEntries] = useState<LearningEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LearningEntry | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LearningCategory>('BACKEND');
  const [type, setType] = useState<LearningResourceType>('NOTE');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [durationMin, setDurationMin] = useState<number>(30);
  const [tagsInput, setTagsInput] = useState('');

  const fetchEntries = async () => {
    try {
      const params: Record<string, string> = {
        limit: '100'
      };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedType) params.type = selectedType;

      const res = await api.get('/learning', { params });
      setEntries(res.data.data.entries || []);
    } catch (err) {
      toast.error('Failed to load learning hub logs');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEntries().finally(() => setLoading(false));
  }, [search, selectedCategory, selectedType]);

  const handleOpenAddModal = () => {
    setEditingEntry(null);
    setTitle('');
    setCategory('BACKEND');
    setType('NOTE');
    setContent('');
    setUrl('');
    setDurationMin(30);
    setTagsInput('');
    setIsOpen(true);
  };

  const handleOpenEditModal = (entry: LearningEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setCategory(entry.category);
    setType(entry.type);
    setContent(entry.content || '');
    setUrl(entry.url || '');
    setDurationMin(entry.durationMin || 30);
    setTagsInput(entry.tags?.join(', ') || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');

    const payload = {
      title,
      category,
      type,
      content: content || undefined,
      url: url || undefined,
      durationMin: Number(durationMin) || undefined,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (editingEntry) {
        await api.patch(`/learning/${editingEntry.id}`, payload);
        toast.success('Learning entry updated');
      } else {
        await api.post('/learning', payload);
        toast.success('Learning log created successfully');
      }
      setIsOpen(false);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this learning entry?')) return;
    try {
      await api.delete(`/learning/${id}`);
      toast.success('Learning entry deleted');
      fetchEntries();
    } catch (err) {
      toast.error('Failed to delete learning entry');
    }
  };

  const getCategoryColor = (cat: LearningCategory) => {
    return {
      BACKEND: 'border-l-indigo-500 text-indigo-400 bg-indigo-400/5',
      DEVOPS: 'border-l-sky-500 text-sky-400 bg-sky-400/5',
      BLOCKCHAIN: 'border-l-purple-500 text-purple-400 bg-purple-400/5',
      AUTOMATION: 'border-l-amber-500 text-amber-400 bg-amber-400/5',
      SYSTEM_DESIGN: 'border-l-pink-500 text-pink-400 bg-pink-400/5',
      AI: 'border-l-teal-500 text-teal-400 bg-teal-400/5'
    }[cat];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Learning Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Log and track study topics, resource articles, videos, and hours logged</p>
        </div>
        <Button onClick={handleOpenAddModal} className="w-full sm:w-auto bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Log Study Session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card border border-border p-4 rounded-lg">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search study logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto shrink-0">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
          >
            <option value="">All Categories</option>
            {LEARNING_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
          >
            <option value="">All Types</option>
            {LEARNING_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Grid of logs */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-lg text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No study logs matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => (
            <div
              key={entry.id}
              className={cn(
                "bg-card border border-border border-l-4 rounded-lg p-4 flex flex-col justify-between gap-3 group hover:border-primary/40 transition-colors",
                getCategoryColor(entry.category)
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {entry.type.replace('_', ' ')}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                    <button onClick={() => handleOpenEditModal(entry)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-foreground leading-snug">{entry.title}</h4>

                {entry.content && (
                  <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                    {entry.content}
                  </p>
                )}

                {/* Tags */}
                {entry.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {entry.tags.map(t => (
                      <span key={t} className="text-[9px] bg-secondary/80 px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  {entry.durationMin && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" /> {entry.durationMin} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {entry.url && (
                  <a href={entry.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5 font-semibold">
                    Resource <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Study Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Study Session' : 'Log Study Session'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Session / Topic Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dockerize Backend APIs" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as LearningCategory)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {LEARNING_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as LearningResourceType)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {LEARNING_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Duration (Minutes)</label>
                <Input type="number" min="1" value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. docker, cicd" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">URL (Optional)</label>
              <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/..." />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Key Learnings / Notes</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write down brief session learnings, commands, etc."
                rows={3}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingEntry ? 'Save Changes' : 'Log Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
