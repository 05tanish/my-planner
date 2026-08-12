import { useState } from 'react';
import { Image, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import type { Job } from '../types';

interface JobReviewModalProps {
  job: Job;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Job) => void;
}

export function JobReviewModal({ job, open, onClose, onSaved }: JobReviewModalProps) {
  const [title, setTitle] = useState(job.role || '');
  const [company, setCompany] = useState(job.company || '');
  const [location, setLocation] = useState(job.location || '');
  const [description, setDescription] = useState(job.description || '');
  const [skills, setSkills] = useState((job.skills || []).join(', '));
  const [employmentType, setEmploymentType] = useState(job.employmentType || '');
  const [experienceMin, setExperienceMin] = useState(job.experienceMin?.toString() || '');
  const [experienceMax, setExperienceMax] = useState(job.experienceMax?.toString() || '');
  const [salaryMin, setSalaryMin] = useState(job.salaryMin?.toString() || '');
  const [salaryMax, setSalaryMax] = useState(job.salaryMax?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !company.trim()) {
      toast.error('Title and Company are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        role: title.trim(),
        company: company.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        employmentType: employmentType.trim() || null,
        experienceMin: experienceMin ? parseInt(experienceMin) : null,
        experienceMax: experienceMax ? parseInt(experienceMax) : null,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        extractionStatus: 'MANUALLY_COMPLETED',
      };

      const res = await api.patch(`/jobs/${job.id}`, payload);
      toast.success('Job updated successfully');
      onSaved(res.data.data);
      onClose();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Review Captured Job
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-0 h-[70vh]">
          {/* Left: Screenshot */}
          <div className="md:w-1/2 border-r border-white/10 overflow-auto bg-black/20 p-4">
            {job.screenshotUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Image className="w-3.5 h-3.5" />
                  <span>Captured Screenshot</span>
                </div>
                <img
                  src={job.screenshotUrl}
                  alt="Job page screenshot"
                  className="w-full rounded-lg border border-white/10 shadow-lg"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Image className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No screenshot available</p>
                {job.sourceUrl && (
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-violet-400 hover:underline"
                  >
                    Open original job page ↗
                  </a>
                )}
              </div>
            )}

            {/* Source Info */}
            <div className="mt-4 space-y-1 text-xs text-zinc-500">
              {job.source && <p>Source: <span className="text-zinc-300 capitalize">{job.source}</span></p>}
              {job.capturedAt && <p>Captured: {new Date(job.capturedAt).toLocaleString()}</p>}
              {job.extractionMethod && <p>Method: {job.extractionMethod.replace('_', ' ')}</p>}
              {job.extractionConfidence !== undefined && job.extractionConfidence !== null && (
                <p>Confidence: {Math.round(job.extractionConfidence * 100)}%</p>
              )}
              {job.extractionError && (
                <p className="text-red-400">Error: {job.extractionError}</p>
              )}
            </div>
          </div>

          {/* Right: Edit Form */}
          <div className="md:w-1/2 overflow-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Job Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Backend Developer" />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Company *</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. ABC Technologies" />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bangalore, India" />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Employment Type</label>
              <Input value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} placeholder="e.g. Full-time" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Min Experience (yrs)</label>
                <Input type="number" value={experienceMin} onChange={(e) => setExperienceMin(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Max Experience (yrs)</label>
                <Input type="number" value={experienceMax} onChange={(e) => setExperienceMax(e.target.value)} placeholder="5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Min Salary</label>
                <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Max Salary</label>
                <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Skills (comma separated)</label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Node.js, React, PostgreSQL" />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Job description..."
                rows={5}
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !title.trim() || !company.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save & Complete Review
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
