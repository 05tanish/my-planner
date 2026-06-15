import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Award } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HabitStats {
  today: Record<string, { completed: boolean; count: number }>;
  month: Record<string, { totalDays: number; completedDays: number; totalCount: number }>;
  consistency: Record<string, number>;
}

const HABIT_TYPES = [
  { value: 'DSA', label: 'DSA Practice', icon: '🧠', color: 'bg-blue-500' },
  { value: 'CODING', label: 'Coding', icon: '💻', color: 'bg-green-500' },
  { value: 'READING', label: 'Reading', icon: '📚', color: 'bg-purple-500' },
  { value: 'EXERCISE', label: 'Exercise', icon: '💪', color: 'bg-red-500' },
  { value: 'JOB_APPLICATIONS', label: 'Job Apps', icon: '💼', color: 'bg-yellow-500' },
  { value: 'LEARNING', label: 'Learning', icon: '🎓', color: 'bg-indigo-500' },
  { value: 'COMMITS', label: 'Commits', icon: '🐙', color: 'bg-gray-500' },
];

export default function HabitsPage() {
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [selectedHabit, setSelectedHabit] = useState('DSA');
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedHabit) {
      fetchHeatmap(selectedHabit);
    }
  }, [selectedHabit]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/habits/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch habit stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatmap = async (habitType: string) => {
    try {
      const response = await api.get(`/habits/heatmap/${habitType}?months=6`);
      setHeatmapData(response.data);
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    }
  };

  const logHabit = async (habitType: string, count: number = 1) => {
    try {
      await api.post('/habits/log', { habitType, count });
      fetchStats();
      if (habitType === selectedHabit) {
        fetchHeatmap(habitType);
      }
    } catch (error) {
      console.error('Failed to log habit:', error);
    }
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getConsistencyLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading habits...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Habit Tracker</h1>
        <p className="text-muted-foreground">Build consistency with daily habits</p>
      </div>

      {/* Today's Habits */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Today's Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {HABIT_TYPES.map((habit) => {
            const todayData = stats?.today[habit.value];
            const completed = todayData?.completed || false;
            const count = todayData?.count || 0;

            return (
              <Card
                key={habit.value}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  completed ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => logHabit(habit.value, completed ? 0 : 1)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{habit.icon}</div>
                  <div className="text-sm font-medium mb-1">{habit.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {completed ? '✅ Done' : 'Tap to log'}
                  </div>
                  {count > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      {count}x
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Consistency Scores */}
      <div>
        <h2 className="text-xl font-semibold mb-4">30-Day Consistency</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {HABIT_TYPES.map((habit) => {
            const score = stats?.consistency[habit.value] || 0;

            return (
              <Card key={habit.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{habit.icon}</span>
                    <span className="truncate">{habit.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getConsistencyColor(score)}`}>
                    {score}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getConsistencyLabel(score)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Monthly Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">This Month</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HABIT_TYPES.map((habit) => {
            const monthData = stats?.month[habit.value];
            const completedDays = monthData?.completedDays || 0;
            const totalCount = monthData?.totalCount || 0;

            return (
              <Card key={habit.value}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{habit.icon}</span>
                    {habit.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Days Active</span>
                    <span className="text-lg font-bold">{completedDays}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Count</span>
                    <span className="text-lg font-bold">{totalCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg/Day</span>
                    <span className="text-lg font-bold">
                      {completedDays > 0 ? (totalCount / completedDays).toFixed(1) : '0'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Heatmap */}
      <Tabs value={selectedHabit} onValueChange={setSelectedHabit}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">6-Month Heatmap</h2>
          <TabsList>
            {HABIT_TYPES.map((habit) => (
              <TabsTrigger key={habit.value} value={habit.value}>
                {habit.icon}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {HABIT_TYPES.map((habit) => (
          <TabsContent key={habit.value} value={habit.value}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{habit.icon}</span>
                  {habit.label} Activity
                </CardTitle>
                <CardDescription>
                  Activity over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapData.length > 0 ? (
                  <div className="grid grid-cols-7 gap-2">
                    {heatmapData.slice(-180).map((day, idx) => {
                      const intensity = Math.min(day.count, 5);
                      const opacity = day.completed ? 0.2 + (intensity * 0.16) : 0.1;

                      return (
                        <div
                          key={idx}
                          className={`aspect-square rounded ${habit.color}`}
                          style={{ opacity }}
                          title={`${day.date}: ${day.count}x`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No data yet. Start logging to build your heatmap!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Habits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Object.values(stats?.today || {}).filter((h: any) => h.completed).length} / {HABIT_TYPES.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Habits completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average Consistency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(
                Object.values(stats?.consistency || {}).reduce((sum: number, s: any) => sum + s, 0) /
                  HABIT_TYPES.length
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4" />
              Best Habit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const bestHabit = Object.entries(stats?.consistency || {}).reduce(
                (best: any, [key, score]: any) =>
                  score > (best.score || 0) ? { key, score } : best,
                {}
              );
              const habit = HABIT_TYPES.find((h) => h.value === bestHabit.key);
              return (
                <>
                  <div className="text-2xl mb-1">{habit?.icon || '🏆'}</div>
                  <div className="text-lg font-bold">{habit?.label || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">{bestHabit.score || 0}% consistency</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
