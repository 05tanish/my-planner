import React, { useEffect, useState } from 'react';
import {
  Target, Plus, Search, Star, Pin, Trash2, Edit2, Loader2,
  ExternalLink, FileText, Download, X
} from 'lucide-react';
import { api } from '../lib/api';
import type { PlacementNote, PlacementSection, PlacementResourceType } from '../types';
import { PLACEMENT_SECTIONS } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function PlacementPage() {
  const [notes, setNotes] = useState<PlacementNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PlacementNote | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [section, setSection] = useState<PlacementSection>('DBMS');
  const [type, setType] = useState<PlacementResourceType>('NOTE');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      const params: Record<string, string> = {
        limit: '100'
      };
      if (search) params.search = search;
      if (selectedSection) params.section = selectedSection;
      if (selectedType) params.type = selectedType;

      const res = await api.get('/placement', { params });
      setNotes(res.data.data.notes || []);
    } catch (err) {
      toast.error('Failed to load placement prep notes');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotes().finally(() => setLoading(false));
  }, [search, selectedSection, selectedType]);

  const handleOpenAddModal = () => {
    setEditingNote(null);
    setTitle('');
    setSection('DBMS');
    setType('NOTE');
    setContent('');
    setFileUrl('');
    setTagsInput('');
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleOpenEditModal = (note: PlacementNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setSection(note.section);
    setType(note.type);
    setContent(note.content || '');
    setFileUrl(note.fileUrl || '');
    setTagsInput(note.tags?.join(', ') || '');
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Prep topic title is required');

    setSaving(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('section', section);
    formData.append('type', type);
    if (content) formData.append('content', content);
    if (tagsInput) formData.append('tags', tagsInput);

    if (selectedFile) {
      formData.append('attachment', selectedFile);
    } else if (fileUrl) {
      formData.append('fileUrl', fileUrl);
    }

    try {
      if (editingNote) {
        await api.patch(`/placement/${editingNote.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Prep topic updated');
      } else {
        await api.post('/placement', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Prep topic created successfully');
      }
      setIsOpen(false);
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save prep topic');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this placement prep entry?')) return;
    try {
      await api.delete(`/placement/${id}`);
      toast.success('Prep entry deleted');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to delete prep entry');
    }
  };

  const handleTogglePin = async (note: PlacementNote) => {
    try {
      await api.patch(`/placement/${note.id}`, { isPinned: !note.isPinned });
      toast.success(note.isPinned ? 'Prep topic unpinned' : 'Prep topic pinned');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to pin topic');
    }
  };

  const handleToggleFavorite = async (note: PlacementNote) => {
    try {
      await api.patch(`/placement/${note.id}`, { isFavorite: !note.isFavorite });
      toast.success(note.isFavorite ? 'Removed from favorites' : 'Marked as favorite');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to favorite topic');
    }
  };

  const handleGenerateSectionReport = async () => {
    if (!selectedSection) {
      return toast.info('Please select a specific section from filters to compile its study guide');
    }

    setGeneratingReport(true);
    try {
      const res = await api.get(`/placement/report`, {
        params: { section: selectedSection }
      });
      const { markdown, section: secName } = res.data.data;

      // Download file in browser
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DevOS_${secName}_Study_Guide.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${secName.replace('_', ' ')} study guide generated successfully`);
    } catch (err) {
      toast.error('Failed to generate study guide');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleGenerateSingleReport = async (noteId: string, titleStr: string) => {
    try {
      const res = await api.get(`/placement/${noteId}/report`);
      const { markdown } = res.data.data;
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DevOS_${titleStr.replace(/\s+/g, '_')}_Guide.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Single topic guide generated');
    } catch (err) {
      toast.error('Failed to generate report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Placement Prep</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Review core CS subjects (OS, DBMS, CN), Aptitude, HR interview experiences</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleGenerateSectionReport}
            disabled={generatingReport}
            variant="outline"
            className="w-full sm:w-auto border-border bg-secondary/30 hover:bg-secondary text-foreground text-xs font-semibold"
          >
            {generatingReport ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5" />
            )}
            Compile Study Guide
          </Button>
          <Button onClick={handleOpenAddModal} className="w-full sm:w-auto bg-primary text-primary-foreground text-xs font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Log Prep Topic
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card border border-border p-4 rounded-lg">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions, subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto shrink-0">
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
          >
            <option value="">All Subjects</option>
            {PLACEMENT_SECTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary transition-colors cursor-pointer"
          >
            <option value="">All Formats</option>
            <option value="NOTE">Note</option>
            <option value="PDF">PDF Reference</option>
            <option value="IMAGE">Image / Diagram</option>
            <option value="FLASHCARD">Flashcard</option>
            <option value="IMPORTANT_QUESTION">Imp Question</option>
          </select>
        </div>
      </div>

      {/* Grid of Placement prep notes */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-lg text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No prep notes logged matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => {
            const isFlashcard = note.type === 'FLASHCARD';
            return (
              <div
                key={note.id}
                className={cn(
                  "bg-card border border-border rounded-xl p-4 flex flex-col justify-between gap-4 hover:border-muted-foreground/30 transition-all group relative",
                  note.isPinned && "border-primary bg-secondary"
                )}
              >
                {/* Upper row: Topic details */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-[9px] uppercase">
                        {note.section.replace('_', ' ')}
                      </Badge>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border/50">
                        {note.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleTogglePin(note)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Pin Topic">
                        <Pin className={cn("w-3.5 h-3.5", note.isPinned ? "text-primary fill-primary" : "text-muted-foreground")} />
                      </button>
                      <button onClick={() => handleToggleFavorite(note)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Favorite Topic">
                        <Star className={cn("w-3.5 h-3.5", note.isFavorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
                      </button>
                      <button onClick={() => handleGenerateSingleReport(note.id, note.title)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Compile PDF/Markdown Report">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      </button>
                      <div className="w-px h-4 bg-border mx-0.5" />
                      <button onClick={() => handleOpenEditModal(note)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-foreground leading-snug">{note.title}</h4>

                  {note.content && (
                    <div className={cn(
                      "text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap p-2.5 rounded border border-border/30 bg-secondary/20",
                      isFlashcard && "bg-amber-400/5 border-amber-400/10 text-amber-100 font-mono"
                    )}>
                      {note.content}
                    </div>
                  )}

                  {/* Attachment Image Render */}
                  {note.fileUrl && (note.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || note.type === 'IMAGE') && (
                    <div className="h-32 w-full rounded-lg overflow-hidden border border-border/30 bg-secondary/10 relative shrink-0">
                      <img src={note.fileUrl} alt={note.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}

                  {/* Tags */}
                  {note.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {note.tags.map(t => (
                        <span key={t} className="text-[9px] bg-secondary/80 px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* File Reference URL */}
                {note.fileUrl && (
                  <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Attached Document</span>
                    <div className="flex gap-2">
                      <a href={note.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5 font-semibold">
                        Open reference <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <a href={note.fileUrl} download target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-all">
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log Prep Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Prep Resource' : 'Log Prep Resource'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Title / Question *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Explain ACID properties in DBMS" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">CS Subject / Section</label>
                <select
                  value={section}
                  onChange={e => setSection(e.target.value as PlacementSection)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {PLACEMENT_SECTIONS.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Resource Format / Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as PlacementResourceType)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  <option value="NOTE">Note</option>
                  <option value="PDF">PDF Reference</option>
                  <option value="IMAGE">Image / Diagram</option>
                  <option value="FLASHCARD">Flashcard Q&A</option>
                  <option value="IMPORTANT_QUESTION">Important Question</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. transactions, dbms" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Or Paste File Link</label>
                <Input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." disabled={!!selectedFile} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Upload Attachment / Image (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border border-border rounded-md bg-secondary/20 p-1"
                />
                {selectedFile && (
                  <button type="button" onClick={() => setSelectedFile(null)} className="p-1 hover:text-destructive text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Explanation / Answer</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write down subject notes, important algorithms, answers or formulas..."
                rows={4}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {editingNote ? 'Save Changes' : 'Log Prep Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
