import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, Activity, AlertTriangle, Shield, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, Search, Filter, Clock,
  LogIn, LogOut, UserPlus, Key, Plug, Briefcase, FileText, Zap,
  TrendingUp, BarChart3, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────

interface LogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, any> | null;
  level: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: { name: string } | null;
  };
}

interface LogStats {
  totalToday: number;
  totalWeek: number;
  errorCount: number;
  actionBreakdown: { action: string; count: number }[];
  dailyActivity: { day: string; count: number }[];
}

// ─── Action Metadata ────────────────────────────────────────

const ACTION_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  'auth.login':                 { icon: LogIn,      color: 'text-emerald-400',  label: 'Login' },
  'auth.logout':                { icon: LogOut,     color: 'text-zinc-400',     label: 'Logout' },
  'auth.register':              { icon: UserPlus,   color: 'text-blue-400',     label: 'Register' },
  'extension.token_generated':  { icon: Key,        color: 'text-amber-400',    label: 'Token Generated' },
  'extension.token_verify_failed': { icon: AlertTriangle, color: 'text-red-400', label: 'Token Verify Failed' },
  'extension.all_tokens_revoked':  { icon: Plug,    color: 'text-orange-400',   label: 'Tokens Revoked' },
  'job.import':                 { icon: Briefcase,  color: 'text-purple-400',   label: 'Job Imported' },
  'job.import_duplicate':       { icon: FileText,   color: 'text-zinc-500',     label: 'Duplicate Import' },
  'job.create':                 { icon: Briefcase,  color: 'text-indigo-400',   label: 'Job Created' },
  'job.update':                 { icon: FileText,   color: 'text-sky-400',      label: 'Job Updated' },
  'job.delete':                 { icon: Trash2,     color: 'text-red-400',      label: 'Job Deleted' },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || {
    icon: Zap,
    color: 'text-zinc-400',
    label: action.replace(/\./g, ' → '),
  };
}

const LEVEL_STYLES: Record<string, string> = {
  info:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  warn:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'auth', label: 'Auth' },
  { value: 'extension', label: 'Extension' },
  { value: 'job', label: 'Jobs' },
];

const LEVEL_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

// ─── Chart Colors ───────────────────────────────────────────

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#7c3aed',
  '#6d28d9', '#5b21b6',
];

// ─── Component ──────────────────────────────────────────────

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('all');
  const [level, setLevel] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Purge
  const [purging, setPurging] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '30' };
      if (search) params.action = search;
      if (entity !== 'all') params.entity = entity;
      if (level !== 'all') params.level = level;

      const res = await api.get('/logs', { params });
      setLogs(res.data.data.logs);
      setTotalPages(res.data.data.totalPages);
      setTotal(res.data.data.total);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, search, entity, level]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/logs/stats');
      setStats(res.data.data);
    } catch {
      // Stats are optional — don't block the page
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, entity, level]);

  const handlePurge = async () => {
    if (!confirm('Purge all activity logs older than 3 weeks?')) return;
    setPurging(true);
    try {
      const res = await api.delete('/logs/purge');
      toast.success(res.data.message || 'Purge complete');
      fetchLogs();
      fetchStats();
    } catch {
      toast.error('Failed to purge logs');
    } finally {
      setPurging(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const formatDay = (day: any) => {
    if (!day) return '';
    const d = new Date(day);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Activity Logs</h1>
              <p className="text-xs text-muted-foreground">
                System activity timeline • Auto-purges after 3 weeks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchLogs(); fetchStats(); }}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handlePurge}
              disabled={purging}
              className="h-8 text-xs gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {purging ? 'Purging...' : 'Purge Old'}
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Today</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '—' : stats?.totalToday ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Week</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '—' : stats?.totalWeek ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Errors</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '—' : stats?.errorCount ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Logged</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '—' : total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Activity Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Daily Activity (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {statsLoading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : stats?.dailyActivity && stats.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stats.dailyActivity} barCategoryGap="20%">
                    <XAxis
                      dataKey="day"
                      tickFormatter={formatDay}
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#e4e4e7',
                      }}
                      labelFormatter={formatDay}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {stats.dailyActivity.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>

          {/* Action Breakdown */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Top Actions (This Week)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {statsLoading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : stats?.actionBreakdown && stats.actionBreakdown.length > 0 ? (
                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                  {stats.actionBreakdown.map((item, i) => {
                    const cfg = getActionConfig(item.action);
                    const Icon = cfg.icon;
                    const maxCount = stats.actionBreakdown[0].count;
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.action} className="flex items-center gap-3">
                        <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-foreground truncate">{cfg.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-secondary/30 border-border"
            />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-36 h-8 text-xs bg-secondary/30 border-border">
              <Filter className="w-3 h-3 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-32 h-8 text-xs bg-secondary/30 border-border">
              <Shield className="w-3 h-3 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground">
            {total} total entries
          </span>
        </div>

        {/* ── Timeline ───────────────────────────────────────── */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading logs...</p>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ScrollText className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">No logs found</p>
                <p className="text-xs mt-1">Activity will appear here as events are recorded</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => {
                  const cfg = getActionConfig(log.action);
                  const Icon = cfg.icon;
                  const levelStyle = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.level === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                        log.level === 'warn' ? 'bg-amber-500/10 border border-amber-500/20' :
                        'bg-secondary/50 border border-border'
                      }`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-foreground">{cfg.label}</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border ${levelStyle}`}>
                            {log.level}
                          </Badge>
                          {log.entity && (
                            <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                              {log.entity}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{log.user.profile?.name || log.user.email}</span>
                          {log.metadata && (
                            <>
                              <span className="opacity-30">•</span>
                              <span className="truncate max-w-[300px] font-mono text-[10px] opacity-70">
                                {Object.entries(log.metadata)
                                  .filter(([k]) => !['userAgent'].includes(k))
                                  .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
                                  .join(' • ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 mt-1">
                        <Clock className="w-3 h-3" />
                        <span title={new Date(log.createdAt).toLocaleString()}>{formatTime(log.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Pagination ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-7 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground px-3">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-7 text-xs gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
