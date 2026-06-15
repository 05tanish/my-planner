import { useState, useEffect } from 'react';
import { Plus, Search, Users, Code, Trophy, Calendar, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface Hackathon {
  id: string;
  name: string;
  teamMembers: string[];
  idea?: string;
  techStack: string[];
  submissionLink?: string;
  githubUrl?: string;
  demoUrl?: string;
  deadline?: string;
  status: string;
  prize?: string;
  learnings?: string;
  notes?: string;
  createdAt: string;
}

const STATUSES = [
  { value: 'REGISTERED', label: 'Registered', color: 'bg-blue-500', icon: '📝' },
  { value: 'BUILDING', label: 'Building', color: 'bg-yellow-500', icon: '🔨' },
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-purple-500', icon: '✅' },
  { value: 'RESULTS_AWAITED', label: 'Results Awaited', color: 'bg-orange-500', icon: '⏳' },
  { value: 'WON', label: 'Won', color: 'bg-green-500', icon: '🏆' },
  { value: 'PARTICIPATED', label: 'Participated', color: 'bg-gray-500', icon: '✨' },
];

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [filteredHackathons, setFilteredHackathons] = useState<Hackathon[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    teamMembers: '',
    idea: '',
    techStack: '',
    deadline: '',
    status: 'REGISTERED',
  });

  useEffect(() => {
    fetchHackathons();
    fetchStats();
  }, []);

  useEffect(() => {
    filterHackathons();
  }, [hackathons, activeTab, searchQuery]);

  const fetchHackathons = async () => {
    try {
      const response = await api.get('/hackathons');
      setHackathons(response.data);
    } catch (error) {
      console.error('Failed to fetch hackathons:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/hackathons/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const filterHackathons = () => {
    let filtered = [...hackathons];

    if (activeTab !== 'all') {
      filtered = filtered.filter(h => h.status === activeTab.toUpperCase());
    }

    if (searchQuery) {
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredHackathons(filtered);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        teamMembers: formData.teamMembers.split(',').map(s => s.trim()).filter(Boolean),
        techStack: formData.techStack.split(',').map(s => s.trim()).filter(Boolean),
        deadline: formData.deadline ? new Date(formData.deadline) : null,
      };
      await api.post('/hackathons', payload);
      setIsCreateOpen(false);
      fetchHackathons();
      fetchStats();
      resetForm();
    } catch (error) {
      console.error('Failed to create hackathon:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      teamMembers: '',
      idea: '',
      techStack: '',
      deadline: '',
      status: 'REGISTERED',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusInfo?.color} variant="secondary">
        {statusInfo?.icon} {statusInfo?.label || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hackathon Hub</h1>
          <p className="text-muted-foreground">Track your hackathon journey</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Hackathon</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Hackathon</DialogTitle>
              <DialogDescription>Track a new hackathon</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Hack The North 2026"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Team Members (comma-separated)</Label>
                  <Input
                    value={formData.teamMembers}
                    onChange={(e) => setFormData({ ...formData, teamMembers: e.target.value })}
                    placeholder="Alice, Bob, Charlie"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>{status.icon} {status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Project Idea</Label>
                <Textarea
                  value={formData.idea}
                  onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                  placeholder="AI-powered code review assistant"
                  rows={2}
                />
              </div>
              <div>
                <Label>Tech Stack (comma-separated)</Label>
                <Input
                  value={formData.techStack}
                  onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                  placeholder="React, Node.js, OpenAI, PostgreSQL"
                />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Building</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-yellow-500">{stats.building}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Submitted</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-purple-500">{stats.submitted}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Won</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{stats.won}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Registered</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.registered}</div></CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hackathons by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value.toLowerCase()}>
                {status.icon} {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {STATUSES.map(status => (
            <TabsTrigger key={status.value} value={status.value.toLowerCase()}>{status.icon}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHackathons.map((hack) => (
              <Card key={hack.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{hack.name}</CardTitle>
                    {getStatusBadge(hack.status)}
                  </div>
                  {hack.idea && <CardDescription className="mt-2">{hack.idea}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {hack.teamMembers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{hack.teamMembers.length} members</span>
                    </div>
                  )}
                  {hack.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Code className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      {hack.techStack.slice(0, 3).map((tech, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{tech}</Badge>
                      ))}
                      {hack.techStack.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{hack.techStack.length - 3}</Badge>
                      )}
                    </div>
                  )}
                  {hack.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(hack.deadline), 'MMM dd, yyyy')}
                    </div>
                  )}
                  {hack.prize && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">{hack.prize}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {hack.githubUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={hack.githubUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {hack.demoUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={hack.demoUrl} target="_blank" rel="noopener noreferrer">
                          Demo
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
