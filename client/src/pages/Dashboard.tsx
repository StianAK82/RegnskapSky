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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Clients Card */}
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Totalt klienter</CardTitle>
                  <Users className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalClients || 0}</div>
                  <p className="text-xs opacity-80">Aktive klientkontoer</p>
                </CardContent>
              </Card>

              {/* Active Tasks Card */}
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktive oppgaver</CardTitle>
                  <CheckCircle className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.activeTasks || 0}</div>
                  <p className="text-xs opacity-80">Pågående arbeidsoppgaver</p>
                </CardContent>
              </Card>

              {/* Overdue Tasks Card */}
              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Forsinkede oppgaver</CardTitle>
                  <AlertTriangle className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.overdueTasks || 0}</div>
                  <p className="text-xs opacity-80">Krever umiddelbar oppmerksomhet</p>
                </CardContent>
              </Card>

              {/* Weekly Hours Card */}
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Timer denne uken</CardTitle>
                  <Clock className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.weeklyHours || 0}t</div>
                  <p className="text-xs opacity-80">Registrerte arbeidstimer</p>
                </CardContent>
              </Card>

              {/* Documents Processed Card */}
              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bilag behandlet</CardTitle>
                  <FileText className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.documentsProcessed || 0}</div>
                  <p className="text-xs opacity-80">Dokumenter AI-kategorisert</p>
                </CardContent>
              </Card>

              {/* Completed This Week Card */}
              <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ferdigstilt i uken</CardTitle>
                  <TrendingUp className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.completedThisWeek || 0}</div>
                  <p className="text-xs opacity-80">Oppgaver avsluttet</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Hurtighandlinger
                  </CardTitle>
                  <CardDescription>Vanlige oppgaver og handlinger</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all">
                      <Users className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Opprett klient</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Last opp bilag</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all">
                      <TrendingUp className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Generer rapport</span>
                    </button>
                    
                    <button className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all">
                      <AlertTriangle className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Spør AI</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* API Status Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    API Status
                  </CardTitle>
                  <CardDescription>Integrasjoner og tjenester</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fiken</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">Tilkoblet</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tripletex</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">Tilkoblet</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Brønnøysund</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">Aktiv</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">OpenAI</span>
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Begrenset</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity and Workload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Siste aktivitet
                  </CardTitle>
                  <CardDescription>Nylige handlinger og endringer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentClients.slice(0, 5).map((client: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{client.name}</p>
                            <p className="text-xs text-gray-500">Klient opprettet</p>
                          </div>
                        </div>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">Ny</Badge>
                      </div>
                    ))}
                    {recentClients.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Ingen nylig aktivitet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Employee Workload Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Ansatt-arbeidsbelastning
                  </CardTitle>
                  <CardDescription>Oppgavefordeling og timer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Gjennomsnittlig timer/uke</span>
                      <span className="font-medium">{Math.round((metrics?.weeklyHours || 0) / Math.max(1, recentClients.length))}t</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Aktive oppgaver</span>
                      <span className="font-medium">{metrics?.activeTasks || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Forsinkede oppgaver</span>
                      <Badge className={`text-xs ${(metrics?.overdueTasks || 0) > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
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