import { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import {
  FileText, Search, Plus, Star, Pin, Archive, Trash2, Folder, Tag, Save,
  ArrowLeft, Loader2, Upload, Filter
} from 'lucide-react';
import { api } from '../lib/api';
import type { Note } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const PRESET_CATEGORIES = [
  'DSA', 'Placement', 'Backend', 'Frontend', 'System Design',
  'DevOps', 'AI/ML', 'Database', 'Blockchain', 'Interview', 'Imported', 'Other'
];

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Selected note
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'favorites' | 'archived'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Editor form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<string | undefined>('');
  const [folderPath, setFolderPath] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const fetchNotes = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filter === 'pinned') params.pinned = 'true';
      if (filter === 'favorites') params.favorite = 'true';
      if (filter === 'archived') params.archived = 'true';
      if (selectedTag) params.tag = selectedTag;
      if (selectedCategory) params.category = selectedCategory;

      const res = await api.get('/notes', { params });
      const list = res.data.data.notes || [];
      setNotes(list);

      // If no note is selected and we have notes, auto-select the first one
      if (list.length > 0 && !selectedNote) {
        handleSelectNote(list[0]);
      }
    } catch (err) {
      toast.error('Failed to load notes');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotes().finally(() => setLoading(false));
  }, [search, filter, selectedTag, selectedCategory]);

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setFolderPath(note.folderPath || '');
    setTagsInput(note.tags?.map(t => t.tag).join(', ') || '');
    const cat = note.category || '';
    setCategory(cat);
    if (cat && !PRESET_CATEGORIES.includes(cat)) {
      setIsCustomCategory(true);
      setCustomCategory(cat);
    } else {
      setIsCustomCategory(false);
      setCustomCategory('');
    }
  };

  const handleCreateNote = async () => {
    try {
      const res = await api.post('/notes', {
        title: 'Untitled Note',
        content: '# Untitled Note\nStart writing...',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
      });
      const newNote = res.data.data;
      toast.success('Note created');
      setSelectedNote(newNote);
      setTitle(newNote.title);
      setContent(newNote.content);
      setFolderPath('');
      setTagsInput('');
      setCategory('');
      setIsCustomCategory(false);
      setCustomCategory('');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to create note');
    }
  };

  const handleImportNote = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const res = await api.post('/notes/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newNote = res.data.data;
      toast.success('Note imported successfully');
      setSelectedNote(newNote);
      setTitle(newNote.title);
      setContent(newNote.content);
      setFolderPath(newNote.folderPath || '');
      setTagsInput(newNote.tags?.map((t: any) => t.tag).join(', ') || '');
      setCategory(newNote.category || '');
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to import note');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const getEffectiveCategory = () => {
    if (isCustomCategory) return customCategory.trim() || undefined;
    return category || undefined;
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    try {
      const payload = {
        title,
        content: content || '',
        folderPath: folderPath || undefined,
        category: getEffectiveCategory(),
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      };
      const res = await api.patch(`/notes/${selectedNote.id}`, payload);
      toast.success('Note saved');
      setSelectedNote(res.data.data);
      fetchNotes();
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const handleTogglePin = async () => {
    if (!selectedNote) return;
    try {
      const res = await api.patch(`/notes/${selectedNote.id}`, { isPinned: !selectedNote.isPinned });
      toast.success(selectedNote.isPinned ? 'Note unpinned' : 'Note pinned');
      setSelectedNote(res.data.data);
      fetchNotes();
    } catch (err) {
      toast.error('Failed to toggle pin');
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedNote) return;
    try {
      const res = await api.patch(`/notes/${selectedNote.id}`, { isFavorite: !selectedNote.isFavorite });
      toast.success(selectedNote.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      setSelectedNote(res.data.data);
      fetchNotes();
    } catch (err) {
      toast.error('Failed to toggle favorite');
    }
  };

  const handleToggleArchive = async () => {
    if (!selectedNote) return;
    try {
      await api.patch(`/notes/${selectedNote.id}`, { isArchived: !selectedNote.isArchived });
      toast.success(selectedNote.isArchived ? 'Note unarchived' : 'Note archived');
      setSelectedNote(null);
      fetchNotes();
    } catch (err) {
      toast.error('Failed to toggle archive');
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!confirm('Are you sure you want to permanently delete this note?')) return;
    try {
      await api.delete(`/notes/${selectedNote.id}`);
      toast.success('Note deleted');
      setSelectedNote(null);
      fetchNotes();
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  // Collect all unique tags from notes for filtering
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags?.map(t => t.tag) || [])));

  // Collect unique categories from notes
  const allCategories = Array.from(new Set(notes.map(n => n.category).filter(Boolean)));

  return (
    <div className="flex h-[calc(100vh-80px)] border border-border rounded-xl bg-card overflow-hidden">
      {/* Sidebar - list of notes */}
      <div className={cn(
        "w-full md:w-80 border-r border-border flex flex-col h-full shrink-0",
        selectedNote && "hidden md:flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" /> Notes
            </h3>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-secondary relative"
                title="Import Markdown/HTML Note"
                disabled={importing}
                onClick={() => document.getElementById('note-import-file')?.click()}
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                )}
              </Button>
              <input
                id="note-import-file"
                type="file"
                accept=".md,.markdown,.html,.htm"
                onChange={handleImportNote}
                className="hidden"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-secondary" onClick={handleCreateNote} title="New Note">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-secondary/30"
            />
          </div>

          {/* Filter options */}
          <div className="flex gap-1 bg-secondary/50 p-0.5 rounded-md text-xs">
            {(['all', 'pinned', 'favorites', 'archived'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedTag(''); }}
                className={cn(
                  'flex-1 py-1 rounded text-center capitalize transition-colors',
                  filter === f ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {allCategories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="flex-1 text-xs bg-secondary border border-border text-foreground rounded-md px-2 h-7 outline-none focus:border-primary cursor-pointer"
              >
                <option value="">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat!}>{cat}</option>
                ))}
                {!allCategories.includes('Other') && <option value="Other">Other</option>}
              </select>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  title="Clear category filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Note Tags filter row */}
        {allTags.length > 0 && (
          <div className="px-4 py-2 border-b border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <button
              onClick={() => setSelectedTag('')}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-all shrink-0',
                !selectedTag ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border transition-all shrink-0',
                  selectedTag === tag ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border p-2 space-y-1 scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-muted-foreground">No notes found.</p>
            </div>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={cn(
                  'w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-all',
                  selectedNote?.id === note.id ? 'bg-secondary' : 'hover:bg-secondary/40'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs text-foreground truncate">{note.title || 'Untitled Note'}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.isPinned && <Pin className="w-3 h-3 text-primary" />}
                    {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {note.content?.replace(/[#*`_-]/g, '') || 'Empty note'}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-1">
                    {note.category && (
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 text-[9px] font-medium">
                        {note.category}
                      </span>
                    )}
                    {note.folderPath && (
                      <span className="flex items-center gap-0.5 bg-secondary/80 px-1.5 py-0.5 rounded border border-border">
                        <Folder className="w-2.5 h-2.5" /> {note.folderPath}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor Main Pane */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-card overflow-hidden",
        !selectedNote && "hidden md:flex items-center justify-center p-8 text-center"
      )}>
        {selectedNote ? (
          <>
            {/* Editor Topbar */}
            <div className="p-3 border-b border-border flex items-center justify-between gap-3 bg-secondary/20">
              {/* Back button for mobile view */}
              <Button size="icon" variant="ghost" className="h-8 w-8 md:hidden" onClick={() => setSelectedNote(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className="flex-1 max-w-xs md:max-w-md">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-transparent border-none focus-visible:ring-0 text-sm font-semibold text-foreground px-1 h-8"
                  placeholder="Note Title"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleTogglePin} title="Pin Note">
                  <Pin className={cn("w-4 h-4", selectedNote.isPinned && "text-primary fill-primary")} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleToggleFavorite} title="Favorite Note">
                  <Star className={cn("w-4 h-4", selectedNote.isFavorite && "text-amber-400 fill-amber-400")} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleToggleArchive} title="Archive Note">
                  <Archive className={cn("w-4 h-4", selectedNote.isArchived && "text-primary fill-primary")} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete} title="Delete Note">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground h-8 px-3">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                </Button>
              </div>
            </div>

            {/* Note Details (Folder, Category, Tags) */}
            <div className="p-3 border-b border-border bg-secondary/10 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Folder path (e.g. DSA/Trees)"
                  value={folderPath}
                  onChange={e => setFolderPath(e.target.value)}
                  className="h-7 text-xs bg-transparent border-none focus-visible:ring-0 px-1 py-0"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Tags (comma-separated)"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="h-7 text-xs bg-transparent border-none focus-visible:ring-0 px-1 py-0"
                />
              </div>
              {/* Category - dropdown with custom option */}
              <div className="flex items-center gap-2 text-xs">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {isCustomCategory ? (
                  <div className="flex-1 flex gap-1">
                    <Input
                      placeholder="Custom category name"
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="h-7 text-xs flex-1 bg-transparent border-none focus-visible:ring-0 px-1 py-0"
                    />
                    <button
                      onClick={() => { setIsCustomCategory(false); setCustomCategory(''); setCategory(''); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                      title="Back to presets"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setIsCustomCategory(true);
                        setCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="flex-1 h-7 text-xs bg-transparent border-none text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="">No Category</option>
                    {PRESET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Custom category...</option>
                  </select>
                )}
              </div>
            </div>

            {/* Rich Markdown Editor */}
            <div className="flex-1 overflow-hidden" data-color-mode="dark">
              <MDEditor
                value={content}
                onChange={setContent}
                preview="live"
                height="100%"
                className="border-none rounded-none !h-full"
              />
            </div>
          </>
        ) : (
          <div className="max-w-xs">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-medium text-foreground text-sm mb-1">No Note Selected</h4>
            <p className="text-xs text-muted-foreground mb-4">Select an existing note from the sidebar or create a new one to start writing.</p>
            <Button onClick={handleCreateNote} className="bg-primary text-primary-foreground text-xs h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
