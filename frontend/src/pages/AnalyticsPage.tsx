import React, { useEffect, useState } from 'react';
import {
  BarChart as ReChartsBarChart, Bar, LineChart as ReChartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Clock, Code2, Loader2, Save
} from 'lucide-react';
import { api } from '../lib/api';
import type { ProductivityLog, AnalyticsSnapshot } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export function AnalyticsPage() {
  const [prodLogs, setProdLogs] = useState<ProductivityLog[]>([]);
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields for Daily Productivity Logger
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studyMinutes, setStudyMinutes] = useState<number>(120);
  const [codingMinutes, setCodingMinutes] = useState<number>(180);
  const [projectMinutes, setProjectMinutes] = useState<number>(60);
  const [readingMinutes, setReadingMinutes] = useState<number>(30);
  const [notes, setNotes] = useState('');

  const fetchAnalyticsData = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const params = {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };

      const [prodRes, snapRes] = await Promise.all([
        api.get('/analytics/productivity', { params }),
        api.get('/analytics/snapshots', { params }),
      ]);

      setProdLogs(prodRes.data.data || []);
      setSnapshots(snapRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load analytics charts');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnalyticsData().finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      date: new Date(date).toISOString(),
      studyMinutes: Number(studyMinutes),
      codingMinutes: Number(codingMinutes),
      projectMinutes: Number(projectMinutes),
      readingMinutes: Number(readingMinutes),
      notes: notes || undefined,
    };

    try {
      await api.post('/analytics/productivity', payload);
      toast.success('Productivity log saved successfully');
      // Trigger a snapshot refresh as well since productivity might affect it
      await api.post('/analytics/snapshots/trigger', { date: new Date(date).toISOString() });
      fetchAnalyticsData();
    } catch (err) {
      toast.error('Failed to save productivity log');
    }
  };

  // Process data for Recharts
  const chartData = prodLogs.map(log => ({
    dateStr: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    'Study': log.studyMinutes,
    'Coding': log.codingMinutes,
    'Projects': log.projectMinutes,
    'Reading': log.readingMinutes,
    total: log.studyMinutes + log.codingMinutes + log.projectMinutes + log.readingMinutes
  }));

  const snapshotData = snapshots.map(snap => ({
    dateStr: new Date(snap.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    'DSA Solved': snap.dsaSolved,
    'DSA Revisions': snap.revisionsCount,
    'GitHub Commits': snap.githubCommits,
    'Tasks Completed': snap.tasksCompleted,
    'Jobs Applied': snap.jobsApplied,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Visualize your productivity, DSA revisions, coding hours, and placement metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity Log Form */}
        <div className="lg:col-span-1 bg-card border border-border p-5 rounded-xl h-fit">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" /> Daily Productivity Logger
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Study (min)</label>
                <Input type="number" min="0" value={studyMinutes} onChange={e => setStudyMinutes(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Coding (min)</label>
                <Input type="number" min="0" value={codingMinutes} onChange={e => setCodingMinutes(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Projects (min)</label>
                <Input type="number" min="0" value={projectMinutes} onChange={e => setProjectMinutes(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Reading (min)</label>
                <Input type="number" min="0" value={readingMinutes} onChange={e => setReadingMinutes(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes / Accomplishments</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Log daily learnings, milestones, accomplishments..."
                rows={3}
                className="w-full p-2.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none"
              />
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground font-medium text-xs py-2 h-9">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Log
            </Button>
          </form>
        </div>

        {/* Charts Panel */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* Productivity Chart Card */}
              <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Productivity Breakdown (Last 30 Days)
                </h3>
                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                    No productivity logs in range. Submit a log in the panel to begin.
                  </div>
                ) : (
                  <div className="h-64 text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d36" />
                        <XAxis dataKey="dateStr" stroke="#718096" />
                        <YAxis stroke="#718096" />
                        <Tooltip contentStyle={{ backgroundColor: '#171923', borderColor: '#2a2d36' }} />
                        <Legend />
                        <Bar dataKey="Coding" stackId="a" fill="#4f8cff" />
                        <Bar dataKey="Study" stackId="a" fill="#6366f1" />
                        <Bar dataKey="Projects" stackId="a" fill="#ec4899" />
                        <Bar dataKey="Reading" stackId="a" fill="#14b8a6" />
                      </ReChartsBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Progress Milestones Snapshots Chart Card */}
              <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-primary" /> Daily Activity Milestones (Last 30 Days)
                </h3>
                {snapshotData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                    No milestone logs in range. Update tasks, solve DSA or log commits to see data.
                  </div>
                ) : (
                  <div className="h-64 text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsLineChart data={snapshotData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d36" />
                        <XAxis dataKey="dateStr" stroke="#718096" />
                        <YAxis stroke="#718096" />
                        <Tooltip contentStyle={{ backgroundColor: '#171923', borderColor: '#2a2d36' }} />
                        <Legend />
                        <Line type="monotone" dataKey="GitHub Commits" stroke="#f97316" strokeWidth={2} />
                        <Line type="monotone" dataKey="DSA Solved" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="Tasks Completed" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="Jobs Applied" stroke="#a855f7" strokeWidth={2} />
                      </ReChartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
