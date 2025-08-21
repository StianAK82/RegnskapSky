import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { 
  Users, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp
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

  if (metricsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Dashboard" />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Dashboard" />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Velkommen tilbake, {user?.firstName}!
              </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Total Clients Card */}
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Totalt klienter</CardTitle>
                  <Users className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics?.totalClients || 0}</div>
                  <p className="text-xs text-gray-500">Aktive klientkontoer</p>
                </CardContent>
              </Card>

              {/* Active Tasks Card */}
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Aktive oppgaver</CardTitle>
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics?.activeTasks || 0}</div>
                  <p className="text-xs text-gray-500">Pågående arbeidsoppgaver</p>
                </CardContent>
              </Card>

              {/* Overdue Tasks Card */}
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Forsinkede oppgaver</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{metrics?.overdueTasks || 0}</div>
                  <p className="text-xs text-gray-500">Krever oppmerksomhet</p>
                </CardContent>
              </Card>

              {/* Weekly Hours Card */}
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Timer denne uken</CardTitle>
                  <Clock className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics?.weeklyHours || 0}t</div>
                  <p className="text-xs text-gray-500">Registrerte timer</p>
                </CardContent>
              </Card>

              {/* Documents Processed Card */}
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Bilag behandlet</CardTitle>
                  <FileText className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metrics?.documentsProcessed || 0}</div>
                  <p className="text-xs text-gray-500">AI-kategorisert</p>
                </CardContent>
              </Card>

              {/* Completed This Week Card */}
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Ferdigstilt i uken</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics?.completedThisWeek || 0}</div>
                  <p className="text-xs text-gray-500">Oppgaver avsluttet</p>
                </CardContent>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group">
                      <Users className="h-8 w-8 text-gray-400 mb-3 group-hover:text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 text-center">Opprett klient</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group">
                      <FileText className="h-8 w-8 text-gray-400 mb-3 group-hover:text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 text-center">Last opp bilag</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group">
                      <TrendingUp className="h-8 w-8 text-gray-400 mb-3 group-hover:text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 text-center">Generer rapport</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group">
                      <AlertTriangle className="h-8 w-8 text-gray-400 mb-3 group-hover:text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 text-center">Spør AI</span>
                    </button>
                      <AlertTriangle className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Spør AI</span>
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

            {/* Recent Activity and Workload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
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
                    {recentClients.slice(0, 5).map((client: any, index: number) => (
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
                    ))}
                    {recentClients.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Ingen nylig aktivitet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Employee Workload Summary */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <TrendingUp className="h-5 w-5 text-gray-600" />
                    Ansatt-arbeidsbelastning
                  </CardTitle>
                  <CardDescription className="text-gray-600">Oppgavefordeling og timer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-700">Gjennomsnittlig timer/uke</span>
                      <span className="font-medium text-gray-900">{Math.round((metrics?.weeklyHours || 0) / Math.max(1, recentClients.length))}t</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-700">Aktive oppgaver</span>
                      <span className="font-medium text-gray-900">{metrics?.activeTasks || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-700">Forsinkede oppgaver</span>
                      <Badge className={`text-xs border ${(metrics?.overdueTasks || 0) > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {metrics?.overdueTasks || 0}
                      </Badge>
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