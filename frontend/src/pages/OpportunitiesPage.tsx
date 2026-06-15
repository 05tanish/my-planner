import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
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

interface Opportunity {
  id: string;
  name: string;
  category: string;
  organization?: string;
  description?: string;
  url?: string;
  deadline?: string;
  status: string;
  applicationStage?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
}

const CATEGORIES = [
  { value: 'INTERNSHIP', label: 'Internship', icon: '💼' },
  { value: 'HACKATHON', label: 'Hackathon', icon: '🏆' },
  { value: 'FELLOWSHIP', label: 'Fellowship', icon: '🎓' },
  { value: 'OPEN_SOURCE_PROGRAM', label: 'Open Source', icon: '🌍' },
  { value: 'MENTORSHIP', label: 'Mentorship', icon: '👨‍🏫' },
  { value: 'CONFERENCE', label: 'Conference', icon: '🎤' },
];

const STATUSES = [
  { value: 'DISCOVERED', label: 'Discovered', color: 'bg-gray-500' },
  { value: 'INTERESTED', label: 'Interested', color: 'bg-blue-500' },
  { value: 'APPLIED', label: 'Applied', color: 'bg-yellow-500' },
  { value: 'ACCEPTED', label: 'Accepted', color: 'bg-green-500' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-500' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-purple-500' },
];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpps, setFilteredOpps] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'INTERNSHIP',
    organization: '',
    description: '',
    url: '',
    deadline: '',
    status: 'DISCOVERED',
    tags: '',
  });

  useEffect(() => {
    fetchOpportunities();
    fetchStats();
  }, []);

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, activeTab, searchQuery]);

  const fetchOpportunities = async () => {
    try {
      const response = await api.get('/opportunities');
      setOpportunities(response.data);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/opportunities/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];

    if (activeTab !== 'all') {
      filtered = filtered.filter(o => o.category === activeTab.toUpperCase());
    }

    if (searchQuery) {
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.organization?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOpps(filtered);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      };
      await api.post('/opportunities', payload);
      setIsCreateOpen(false);
      fetchOpportunities();
      fetchStats();
      resetForm();
    } catch (error) {
      console.error('Failed to create opportunity:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'INTERNSHIP',
      organization: '',
      description: '',
      url: '',
      deadline: '',
      status: 'DISCOVERED',
      tags: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusInfo?.color} variant="secondary">
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.icon || '📌';
  };

  const isDeadlineSoon = (deadline?: string) => {
    if (!deadline) return false;
    const daysUntil = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunity Radar</h1>
          <p className="text-muted-foreground">Track internships, programs, and opportunities</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Opportunity</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Opportunity</DialogTitle>
              <DialogDescription>Track a new opportunity</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Google Summer of Code 2026"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.icon} {cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Organization</Label>
                <Input
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Google"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://summerofcode.withgoogle.com"
                />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="open-source, summer, remote"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byStatus?.find((s: any) => s.status === 'APPLIED')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.byStatus?.find((s: any) => s.status === 'ACCEPTED')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-orange-500">{stats.upcoming}</div></CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities by name or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value.toLowerCase()}>
                {cat.icon} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value.toLowerCase()}>{cat.icon}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpps.map((opp) => (
              <Card key={opp.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(opp.category)}</span>
                        {opp.name}
                      </CardTitle>
                      {opp.organization && (
                        <CardDescription className="mt-1">{opp.organization}</CardDescription>
                      )}
                    </div>
                    {getStatusBadge(opp.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {opp.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                  )}
                  
                  {opp.deadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className={isDeadlineSoon(opp.deadline) ? 'text-orange-500 font-medium' : ''}>
                        {format(new Date(opp.deadline), 'MMM dd, yyyy')}
                      </span>
                      {isDeadlineSoon(opp.deadline) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                    </div>
                  )}

                  {opp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {opp.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {opp.url && (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <a href={opp.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Details
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
