import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Alert {
  id: string;
  type: string;
  level: 'NORMAL' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  actionUrl?: string;
  dismissed: boolean;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'dismissed'>('active');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [activeTab]);

  const fetchAlerts = async () => {
    try {
      const response = await api.get(`/alerts?dismissed=${activeTab === 'dismissed'}`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/alerts/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/dismiss`);
      fetchAlerts();
      fetchStats();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const handleDismissAll = async () => {
    try {
      await api.post('/alerts/dismiss-all');
      fetchAlerts();
      fetchStats();
    } catch (error) {
      console.error('Failed to dismiss all alerts:', error);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      await api.post('/alerts/scan');
      fetchAlerts();
      fetchStats();
    } catch (error) {
      console.error('Failed to scan alerts:', error);
    } finally {
      setScanning(false);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'HIGH':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-500 bg-red-500/10';
      case 'HIGH':
        return 'border-orange-500 bg-orange-500/10';
      default:
        return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge className="bg-red-500">Critical</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500">High</Badge>;
      default:
        return <Badge className="bg-blue-500">Normal</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Smart notifications for tasks and goals</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleScan} disabled={scanning}>
            <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
            Scan Now
          </Button>
          {activeTab === 'active' && alerts.length > 0 && (
            <Button variant="outline" onClick={handleDismissAll}>
              Dismiss All
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {stats.byLevel?.find((l: any) => l.level === 'HIGH')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Normal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {stats.byLevel?.find((l: any) => l.level === 'NORMAL')?._count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="active">
            Active
            {stats && stats.total > 0 && (
              <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <p className="text-lg font-medium mb-2">
                  {activeTab === 'active' ? 'All Clear!' : 'No Dismissed Alerts'}
                </p>
                <p className="text-muted-foreground">
                  {activeTab === 'active' 
                    ? 'You have no active alerts. Great job staying on track!' 
                    : 'You haven\'t dismissed any alerts yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${getLevelColor(alert.level)}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getLevelIcon(alert.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{alert.title}</CardTitle>
                            {getLevelBadge(alert.level)}
                          </div>
                          <CardDescription>{alert.message}</CardDescription>
                          {alert.actionUrl && (
                            <Button
                              size="sm"
                              variant="link"
                              className="px-0 mt-2"
                              onClick={() => window.location.href = alert.actionUrl!}
                            >
                              Take Action →
                            </Button>
                          )}
                        </div>
                      </div>
                      {!alert.dismissed && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDismiss(alert.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
