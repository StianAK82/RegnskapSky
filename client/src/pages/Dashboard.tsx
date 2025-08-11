import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Download,
  Calendar,
  Shield,
  TrendingUp,
  PieChart
} from "lucide-react";
import { AdminBackupManager } from "@/components/AdminBackupManager";
import { CalendarIntegration } from "@/components/CalendarIntegration";

interface EnhancedMetrics {
  totalClients: number;
  activeTasks: number;
  overdueTasks: number;
  weeklyHours: number;
  documentsProcessed: number;
  kycPendingCount: number;
  amlStatusCounts: { pending: number; approved: number; rejected: number };
  employeeWorkload: Array<{ userId: string; userName: string; activeClients: number; weeklyHours: number }>;
  clientDistribution: Array<{ accountingSystem: string; count: number }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Enhanced dashboard metrics
  const { data: enhancedMetrics, isLoading: metricsLoading } = useQuery<EnhancedMetrics>({
    queryKey: ["/api/dashboard/enhanced-metrics"],
    enabled: !!user,
  });

  // Assigned clients (role-based)
  const { data: assignedClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients/assigned"],
    enabled: !!user,
  });

  const handleCalendarSync = async (provider: 'google' | 'outlook') => {
    setSyncingCalendar(true);
    try {
      const result = await apiRequest('/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      console.log('Calendar sync result:', result);
    } catch (error) {
      console.error('Calendar sync failed:', error);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'excel') => {
    try {
      const response = await fetch(`/api/admin/export/clients?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export.${format === 'csv' ? 'csv' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBackup = async (backupType: string) => {
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          backupType,
          dataTypes: ['clients', 'documents', 'time_entries', 'tasks']
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Backup result:', result);
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  if (metricsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Velkommen tilbake, {user?.firstName}! ({user?.role === 'admin' ? 'Administrator' : 'Ansatt'})
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCalendarSync('google')}
            disabled={syncingCalendar}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Sync Kalender
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportData('excel')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBackup('manual')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Backup
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="clients">Mine Klienter</TabsTrigger>
          {isAdmin && <TabsTrigger value="analytics">Analyse</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isAdmin ? 'Totale Klienter' : 'Mine Klienter'}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enhancedMetrics?.totalClients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Aktive klienter i systemet' : 'Tildelte klienter'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktive Oppgaver</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enhancedMetrics?.activeTasks || 0}</div>
                <p className="text-xs text-muted-foreground">Ventende oppgaver</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forsinkede</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {enhancedMetrics?.overdueTasks || 0}
                </div>
                <p className="text-xs text-muted-foreground">Forfalt frist</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uketimer</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enhancedMetrics?.weeklyHours || 0}t</div>
                <p className="text-xs text-muted-foreground">Denne uken</p>
              </CardContent>
            </Card>
          </div>

          {/* KYC/AML Status - Admin only */}
          {isAdmin && enhancedMetrics && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    KYC Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Ventende KYC</span>
                      <Badge variant="secondary">{enhancedMetrics.kycPendingCount}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    AML Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Ventende</span>
                      <Badge variant="secondary">{enhancedMetrics.amlStatusCounts.pending}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Godkjent</span>
                      <Badge className="bg-green-500">{enhancedMetrics.amlStatusCounts.approved}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Avvist</span>
                      <Badge variant="destructive">{enhancedMetrics.amlStatusCounts.rejected}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isAdmin ? 'Alle Klienter' : 'Mine Tildelte Klienter'}
              </CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'Oversikt over alle klienter i systemet'
                  : 'Klienter du er ansvarlig for'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : assignedClients.length === 0 ? (
                <p className="text-center text-muted-foreground p-8">
                  {isAdmin ? 'Ingen klienter funnet.' : 'Du har ingen tildelte klienter.'}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assignedClients.map((client: any) => (
                    <Card key={client.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <CardDescription>{client.email}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Org.nr:</span>
                            <span className="font-mono">{client.orgNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Regnskapssystem:</span>
                            <Badge variant="outline">
                              {client.accountingSystem || 'Ikke satt'}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>KYC Status:</span>
                            <Badge className={
                              client.kycStatus === 'verified' ? 'bg-green-500' :
                              client.kycStatus === 'rejected' ? 'bg-red-500' : 'bg-gray-500'
                            }>
                              {client.kycStatus === 'verified' ? 'Verifisert' :
                               client.kycStatus === 'rejected' ? 'Avvist' : 'Ventende'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Employee Workload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Ansatt Arbeidsbelastning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enhancedMetrics?.employeeWorkload.map((emp) => (
                      <div key={emp.userId} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{emp.userName}</span>
                          <div className="text-sm text-muted-foreground">
                            {emp.activeClients} klienter • {emp.weeklyHours}t/uke
                          </div>
                        </div>
                        <Progress value={Math.min(emp.weeklyHours / 40 * 100, 100)} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Client Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Regnskapssystem Fordeling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {enhancedMetrics?.clientDistribution.map((dist) => (
                      <div key={dist.accountingSystem} className="flex justify-between items-center">
                        <span className="font-medium">{dist.accountingSystem}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{dist.count}</Badge>
                          <div className="w-20 bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
                              style={{ 
                                width: `${(dist.count / (enhancedMetrics?.totalClients || 1)) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4">
            <Tabs defaultValue="backup" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="backup">Backup & Export</TabsTrigger>
                <TabsTrigger value="calendar">Kalender</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              
              <TabsContent value="backup" className="space-y-4">
                <AdminBackupManager onBackupComplete={(result) => console.log('Backup completed:', result)} />
              </TabsContent>
              
              <TabsContent value="calendar" className="space-y-4">
                <CalendarIntegration onSyncComplete={(result) => console.log('Calendar sync completed:', result)} />
              </TabsContent>
              
              <TabsContent value="system" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>
                      Systemhelse og integrasjoner
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Database</span>
                        <Badge className="bg-green-500">Aktiv</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Email (SendGrid)</span>
                        <Badge variant="secondary">Deaktivert</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Calendar Integration</span>
                        <Badge variant="outline">Tilgjengelig</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Brønnøysund API</span>
                        <Badge className="bg-green-500">Aktiv</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>RBAC System</span>
                        <Badge className="bg-green-500">Admin/Ansatt</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}