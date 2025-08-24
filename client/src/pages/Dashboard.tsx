import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { DashboardClientTasks } from "@/components/dashboard/DashboardClientTasks";
import { 
  Users, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Shield
} from "lucide-react";

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
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="md:ml-64">
          <TopBar title="Dashboard" />
          <main className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar title="Dashboard" />
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Velkommen tilbake, {user?.firstName}!
              </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Clients Card */}
              <Card className="bg-white border border-gray-200/70 dark:border-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Totalt klienter</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalClients || 0}</p>
                    <p className="text-xs text-gray-500">Aktive klienter</p>
                  </div>
                  <Users className="h-5 w-5 text-gray-500" />
                </div>
              </Card>

              {/* Active Tasks Card */}
              <Card className="bg-white border border-gray-200/70 dark:border-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Aktive oppgaver</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.activeTasks || 0}</p>
                    <p className="text-xs text-gray-500">Pågående</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-gray-500" />
                </div>
              </Card>

              {/* Overdue Tasks Card */}
              <Card className="bg-white border border-gray-200/70 dark:border-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Forsinkede</p>
                    <p className="text-2xl font-bold text-amber-600">{metrics?.overdueTasks || 0}</p>
                    <p className="text-xs text-gray-500">Krever handling</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              </Card>

              {/* Weekly Hours Card */}
              <Card className="bg-white border border-gray-200/70 dark:border-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Timer/uke</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.weeklyHours || 0}t</p>
                    <p className="text-xs text-gray-500">Registrert</p>
                  </div>
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
              </Card>

              {/* Documents Processed Card */}
              <Card className="bg-white border border-gray-200/70 dark:border-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Bilag</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.documentsProcessed || 0}</p>
                    <p className="text-xs text-gray-500">AI-behandlet</p>
                  </div>
                  <FileText className="h-5 w-5 text-gray-500" />
                </div>
              </Card>

              {/* Completed This Week Card */}
              <Card className="bg-white border border-gray-200/70 dark:border-gray-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Ferdigstilt</p>
                    <p className="text-2xl font-bold text-green-600">{metrics?.completedThisWeek || 0}</p>
                    <p className="text-xs text-gray-500">Denne uke</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </Card>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <Card className="lg:col-span-2 bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <TrendingUp className="h-5 w-5 text-gray-600" />
                    Hurtighandlinger
                  </CardTitle>
                  <CardDescription className="text-gray-600">Vanlige oppgaver og handlinger</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <button className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group min-h-[80px] sm:min-h-[100px]">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1 sm:mb-2 group-hover:text-gray-600" />
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">Opprett klient</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group min-h-[80px] sm:min-h-[100px]">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1 sm:mb-2 group-hover:text-gray-600" />
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">Last opp bilag</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group min-h-[80px] sm:min-h-[100px]">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1 sm:mb-2 group-hover:text-gray-600" />
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">Generer rapport</span>
                    </button>
                    
                    <button 
                      onClick={() => window.open('https://www.verified.eu/no', '_blank')}
                      className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group min-h-[80px] sm:min-h-[100px]"
                    >
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1 sm:mb-2 group-hover:text-gray-600" />
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">AML/KYC</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* API Status Panel */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <CheckCircle className="h-5 w-5 text-gray-600" />
                    API Status
                  </CardTitle>
                  <CardDescription className="text-gray-600">Integrasjoner og tjenester</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Fiken</span>
                    <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">Tilkoblet</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Tripletex</span>
                    <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">Tilkoblet</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Brønnøysund</span>
                    <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">Aktiv</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">OpenAI</span>
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">Begrenset</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Client Tasks Overview - Enhanced */}
            <div className="mt-8">
              <DashboardClientTasks />
            </div>

            {/* Recent Activity and Task Summary */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Clock className="h-5 w-5 text-gray-600" />
                    Siste aktivitet
                  </CardTitle>
                  <CardDescription className="text-gray-600">Nylige handlinger og endringer</CardDescription>
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
              <Card className="bg-white border border-gray-200">
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
        </main>
      </div>
    </div>
  );
}