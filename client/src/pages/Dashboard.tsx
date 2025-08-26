import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/AppShell";
import DashboardClientTasks from "@/components/dashboard/DashboardClientTasks";
import { 
  Users, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Shield,
  Building2,
  PieChart
} from "lucide-react";

// Component for showing client distribution by accounting system
function AccountingSystemDistribution() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Calculate distribution by accounting system
  const distribution = React.useMemo(() => {
    const systems: Record<string, number> = {};
    
    console.log('Accounting system distribution - clients:', clients);
    
    clients.forEach((client: any) => {
      const system = client.accountingSystem || 'Ikke satt';
      systems[system] = (systems[system] || 0) + 1;
    });

    console.log('Accounting system distribution - systems:', systems);

    // Sort by count descending
    return Object.entries(systems)
      .map(([system, count]) => ({ system, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  const totalClients = clients.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <PieChart className="h-5 w-5 text-gray-600" />
            Regnskapssystem fordeling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <PieChart className="h-5 w-5 text-gray-600" />
          Regnskapssystem fordeling
        </CardTitle>
        <CardDescription className="text-gray-600">
          Oversikt over klienter per regnskapssystem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {distribution.map(({ system, count }) => {
            const percentage = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
            
            return (
              <div 
                key={system} 
                className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{system}</div>
                      <div className="text-xs text-gray-500">{percentage}% av alle klienter</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">klienter</div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {totalClients === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>Ingen klienter registrert ennå</p>
            </div>
          )}
        </div>
        
        {totalClients > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Totalt antall klienter:</span>
              <span className="font-medium text-gray-900">{totalClients}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for showing completed activities (admin only)
function CompletedActivities() {
  const { data: completedTasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks', { status: 'completed', limit: 10 }],
    queryFn: async () => {
      const response = await fetch('/api/tasks?status=completed&limit=10', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch completed tasks');
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            Fullførte aktiviteter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <CheckCircle className="h-5 w-5 text-gray-600" />
          Fullførte aktiviteter
        </CardTitle>
        <CardDescription className="text-gray-600">Siste fullførte oppgaver</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {completedTasks.length > 0 ? (
            completedTasks.map((task: any) => {
              const assignedUser = users.find((u: any) => u.id === task.assignedTo);
              return (
                <div key={task.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="font-medium text-sm text-gray-900">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Fullført av: {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Ukjent'}
                  </div>
                  {task.completedAt && (
                    <div className="text-xs text-gray-400">
                      {new Date(task.completedAt).toLocaleDateString('nb-NO')}
                    </div>
                  )}
                  {task.timeSpent && (
                    <div className="text-xs text-blue-600 mt-1">
                      {task.timeSpent} timer
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-sm text-gray-500">Ingen fullførte oppgaver</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardMetrics {
  totalClients: number;
  activeTasks: number;
  overdueTasks: number;
  weeklyHours: number;
  documentsProcessed: number;
  completedThisWeek?: number;
  pendingApprovals?: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  // Simple dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: !!user,
  });

  // Recent clients
  const { data: recentClients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  // Get tasks for client overview
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  // Group tasks by client
  const clientTaskSummary = recentClients.map(client => {
    const clientTasks = allTasks.filter(task => task.clientId === client.id);
    const pendingTasks = clientTasks.filter(task => task.status !== 'ferdig').length;
    const overdueTasks = clientTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'ferdig'
    ).length;
    
    return {
      ...client,
      totalTasks: clientTasks.length,
      pendingTasks,
      overdueTasks
    };
  });

  if (metricsLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Velkommen tilbake, {user?.firstName}!
          </p>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Tasks Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive oppgaver</p>
                <p className="text-2xl font-bold">{metrics?.activeTasks || 0}</p>
                <p className="text-xs text-gray-500">Pågående</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          {/* Overdue Tasks Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Forsinkede</p>
                <p className="text-2xl font-bold text-amber-600">{metrics?.overdueTasks || 0}</p>
                <p className="text-xs text-gray-500">Krever handling</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </Card>

          {/* Weekly Hours Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Timer/uke</p>
                <p className="text-2xl font-bold">{metrics?.weeklyHours || 0}t</p>
                <p className="text-xs text-gray-500">Registrert</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          {/* Completed Activities Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fullførte aktiviteter</p>
                <p className="text-2xl font-bold">{metrics?.activeTasks || 0}</p>
                <p className="text-xs text-gray-500">Siste måned</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <TrendingUp className="h-5 w-5 text-gray-600" />
                  Hurtighandlinger
                </CardTitle>
                <CardDescription className="text-gray-600">Vanlige oppgaver og handlinger</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group h-[100px]">
                    <Users className="h-6 w-6 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Opprett klient</span>
                  </button>
                  
                  <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group h-[100px]">
                    <TrendingUp className="h-6 w-6 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Generer rapport</span>
                  </button>
                  
                  <button 
                    onClick={() => window.open('https://www.verified.eu/no', '_blank')}
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group h-[100px]"
                  >
                    <Shield className="h-6 w-6 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">AML/KYC</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Accounting System Distribution */}
          <section>
            <AccountingSystemDistribution />
          </section>
        </div>

        {/* Client Tasks Overview */}
        <div>
          <DashboardClientTasks />
        </div>

        {/* Task Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                Oppgaveoversikt
              </CardTitle>
              <CardDescription className="text-gray-600">Status på pågående arbeid</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(recentClients) && recentClients.length > 0 ? recentClients.slice(0, 5).map((client: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500">Klient opprettet</p>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs">Ny</Badge>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Ingen nylige aktiviteter</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                Oppgaver
              </CardTitle>
              <CardDescription className="text-gray-600">Ventende og aktive oppgaver</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-700">Aktive oppgaver</span>
                  <span className="font-medium text-gray-900">{metrics?.activeTasks || 0}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-700">Forsinkede oppgaver</span>
                  <Badge className={`text-xs border ${(metrics?.overdueTasks || 0) > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {metrics?.overdueTasks || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-700">Timer denna uke</span>
                  <span className="font-medium text-gray-900">{metrics?.weeklyHours || 0}t</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}