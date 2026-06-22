import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, Search, ExternalLink, Calendar, DollarSign, MapPin,
  Trash2, Edit2, Loader2, FileText, Upload, Star, X
} from 'lucide-react';
import { api } from '../lib/api';
import type { Job, JobStatus } from '../types';
import { JOB_STATUSES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

interface Resume {
  id: string; name: string; fileUrl: string; fileName: string;
  fileSize?: number; notes?: string; isDefault: boolean; createdAt: string;
}


export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Resume Library state
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeTab, setResumeTab] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = async () => {
    try { const r = await api.get('/jobs/resumes'); setResumes(r.data.data || []); }
    catch (_) {}
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', resumeName || file.name);
      await api.post('/jobs/resumes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Resume uploaded');
      setResumeName('');
      fetchResumes();
    } catch { toast.error('Upload failed'); }
    finally { setUploadingResume(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteResume = async (id: string) => {
    if (!confirm('Delete this resume?')) return;
    try { await api.delete(`/jobs/resumes/${id}`); toast.success('Resume deleted'); fetchResumes(); }
    catch { toast.error('Failed to delete resume'); }
  };

  const handleSetDefault = async (id: string) => {
    try { await api.patch(`/jobs/resumes/${id}`, { isDefault: true }); fetchResumes(); }
    catch { toast.error('Failed to set default'); }
  };

  // Search
  const [search, setSearch] = useState('');

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form Fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [status, setStatus] = useState<JobStatus>('APPLIED');
  const [appliedDate, setAppliedDate] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [notes, setNotes] = useState('');

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs', {
        params: { limit: 100 } // Fetch all jobs for kanban columns
      });
      setJobs(res.data.data.jobs || []);
    } catch (err) {
      toast.error('Failed to fetch jobs');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchJobs().finally(() => setLoading(false));
  }, []);

  const handleOpenAddModal = (initialStatus: JobStatus = 'APPLIED') => {
    setEditingJob(null);
    setCompany('');
    setRole('');
    setJobUrl('');
    setStatus(initialStatus);
    setAppliedDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setSalary('');
    setNotes('');
    setIsOpen(true);
  };

  const handleOpenEditModal = (j: Job) => {
    setEditingJob(j);
    setCompany(j.company);
    setRole(j.role);
    setJobUrl(j.jobUrl || '');
    setStatus(j.status);
    setAppliedDate(new Date(j.appliedDate).toISOString().split('T')[0]);
    setLocation(j.location || '');
    setSalary(j.salary || '');
    setNotes(j.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return toast.error('Company name is required');
    if (!role.trim()) return toast.error('Role name is required');

    const payload = {
      company,
      role,
      jobUrl: jobUrl || undefined,
      status,
      appliedDate: new Date(appliedDate).toISOString(),
      location: location || undefined,
      salary: salary || undefined,
      notes: notes || undefined,
    };

    try {
      if (editingJob) {
        await api.patch(`/jobs/${editingJob.id}`, payload);
        toast.success('Job details updated');
      } else {
        await api.post('/jobs', payload);
        toast.success('Job application logged');
      }
      setIsOpen(false);
      fetchJobs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job application?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Job application deleted');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to delete job application');
    }
  };

  const updateJobStatus = async (job: Job, newStatus: JobStatus) => {
    try {
      await api.patch(`/jobs/${job.id}`, { status: newStatus });
      toast.success(`Updated ${job.company} status to ${newStatus}`);
      fetchJobs();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Filter jobs by search
  const filteredJobs = jobs.filter(j =>
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    j.role.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase())
  );

  // Kanban Columns
  const columns: { label: string; status: JobStatus; color: string }[] = [
    { label: 'Wishlist', status: 'WISHLIST', color: 'border-t-muted' },
    { label: 'Applied', status: 'APPLIED', color: 'border-t-primary' },
    { label: 'Online Assessment', status: 'OA', color: 'border-t-blue-400' },
    { label: 'Interviewing', status: 'INTERVIEW', color: 'border-t-amber-400' },
    { label: 'Offer Received', status: 'OFFER', color: 'border-t-emerald-400' },
    { label: 'Selected / Hired', status: 'SELECTED', color: 'border-t-teal-400' },
    { label: 'Rejected', status: 'REJECTED', color: 'border-t-rose-400' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Job Applications</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your placement journey, offers, and interviewing pipelines</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={resumeTab ? 'default' : 'outline'}
            onClick={() => setResumeTab(v => !v)}
            className={cn('sm:w-auto', resumeTab && 'bg-primary text-primary-foreground')}
          >
            <FileText className="w-4 h-4 mr-2" /> Resume Library {resumes.length > 0 && `(${resumes.length})`}
          </Button>
          <Button onClick={() => handleOpenAddModal('APPLIED')} className="w-full sm:w-auto bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Log Application
          </Button>
        </div>
      </div>

      {/* Resume Library Panel */}
      {resumeTab && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Resume Library
            </h3>
            <button onClick={() => setResumeTab(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Section */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Resume Label</label>
              <Input value={resumeName} onChange={e => setResumeName(e.target.value)} placeholder="e.g. SWE Internship Resume 2025" className="bg-secondary/30" />
            </div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingResume} className="bg-primary text-primary-foreground shrink-0">
              {uploadingResume ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload PDF
            </Button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
          </div>

          {/* Resume List */}
          {resumes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
              No resumes uploaded yet. Upload your first resume above.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumes.map(r => (
                <div key={r.id} className={cn(
                  'bg-secondary/30 border rounded-lg p-3 flex flex-col gap-2 group transition-colors',
                  r.isDefault ? 'border-primary/50' : 'border-border'
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleSetDefault(r.id)} title="Set as default" className="p-1 hover:bg-amber-500/10 rounded text-muted-foreground hover:text-amber-400">
                        <Star className={cn('w-3 h-3', r.isDefault && 'fill-amber-400 text-amber-400')} />
                      </button>
                      <a href={r.fileUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button onClick={() => handleDeleteResume(r.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{r.fileName}</span>
                    {r.fileSize && <span>· {(r.fileSize / 1024).toFixed(0)} KB</span>}
                  </div>
                  {r.isDefault && (
                    <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 w-fit">
                      <Star className="w-2.5 h-2.5 mr-1 fill-primary" /> Default Resume
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Filter */}
      <div className="flex gap-3 items-center bg-card border border-border p-4 rounded-lg max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, role, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
      </div>

      {/* Kanban Board Layout */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {columns.map(col => {
            const colJobs = filteredJobs.filter(j => j.status === col.status);
            return (
              <div key={col.status} className="w-72 shrink-0 flex flex-col gap-3 bg-secondary/10 p-3 rounded-xl border border-border">
                {/* Column Title */}
                <div className={cn("border-t-2 pt-2 px-1 flex items-center justify-between", col.color)}>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px] bg-secondary/60">{colJobs.length}</Badge>
                </div>

                {/* Column Items */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[65vh] pr-1 min-h-[200px] scrollbar-thin">
                  {colJobs.map(job => (
                    <div
                      key={job.id}
                      className="bg-card border border-border rounded-lg p-3.5 flex flex-col gap-2.5 hover:border-muted-foreground/30 transition-all group relative"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-foreground leading-snug">{job.company}</h4>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                            <button onClick={() => handleOpenEditModal(job)} className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(job.id)} className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{job.role}</p>
                      </div>

                      {/* Details row */}
                      <div className="space-y-1 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                        {job.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        {job.salary && (
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-3 h-3 shrink-0" />
                            <span>{job.salary}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>Applied: {new Date(job.appliedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Notes snippet */}
                      {job.notes && (
                        <p className="text-[9px] text-muted-foreground bg-secondary/50 p-1.5 rounded border border-border/30 line-clamp-2 leading-relaxed">
                          {job.notes}
                        </p>
                      )}

                      {/* Status quick switcher dropdown */}
                      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
                        {job.jobUrl ? (
                          <a href={job.jobUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5 font-medium">
                            Link <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">No link</span>
                        )}
                        <select
                          value={job.status}
                          onChange={e => updateJobStatus(job, e.target.value as JobStatus)}
                          className="bg-secondary text-[9px] border border-border rounded px-1.5 py-0.5 text-foreground cursor-pointer focus:outline-none"
                        >
                          {JOB_STATUSES.map(st => (
                            <option key={st} value={st}>{st.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {/* Empty state within column */}
                  {colJobs.length === 0 && (
                    <button
                      onClick={() => handleOpenAddModal(col.status)}
                      className="w-full py-6 text-center border border-dashed border-border/50 rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all text-xs flex flex-col items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log job here</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Job Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit Application Details' : 'Log Job Application'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
                <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role / Position *</label>
                <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as JobStatus)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
                >
                  {JOB_STATUSES.map(st => (
                    <option key={st} value={st}>{st.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Applied Date</label>
                <Input type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Location (Optional)</label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mountain View, CA" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Salary / Package (Optional)</label>
                <Input value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. $140,000 / year" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Application URL (Optional)</label>
              <Input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="https://careers.google.com/..." />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes / Status Logs</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Recruiter reachout on LinkedIn, OA links sent..."
                rows={3}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingJob ? 'Save Changes' : 'Log Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
