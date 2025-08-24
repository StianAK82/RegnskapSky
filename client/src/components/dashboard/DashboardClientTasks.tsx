import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  User,
  Calendar
} from "lucide-react";

interface ClientWithSummary {
  id: string;
  name: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  openTasksCount: number;
  overdueTasksCount: number;
  payrollRunDay?: number;
  payrollRunTime?: string;
  engagementOwner?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export function DashboardClientTasks() {
  // Fetch clients with task summary
  const { data: clientsWithSummary = [], isLoading, error } = useQuery<ClientWithSummary[]>({
    queryKey: ["/api/clients", { include: "summary" }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token");
      
      const response = await fetch("/api/clients?include=summary", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        // Fallback to regular clients API if include=summary fails
        console.warn("Failed to fetch clients with summary, falling back to regular clients");
        const fallbackResponse = await fetch("/api/clients", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!fallbackResponse.ok) throw new Error("Failed to fetch clients");
        const clients = await fallbackResponse.json();
        
        // Return clients with default summary values
        return clients.map((client: any) => ({
          ...client,
          openTasksCount: 0,
          overdueTasksCount: 0,
          engagementOwner: null
        }));
      }
      
      return response.json();
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200/70 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Klient Oppgaver</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientsWithSummary.length === 0) {
    return (
      <Card className="bg-white border border-gray-200/70 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Klient Oppgaver</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Users className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p>Ingen klienter funnet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by overdue tasks first, then by open tasks
  const sortedClients = [...clientsWithSummary].sort((a, b) => {
    if (a.overdueTasksCount !== b.overdueTasksCount) {
      return b.overdueTasksCount - a.overdueTasksCount;
    }
    return b.openTasksCount - a.openTasksCount;
  });

  return (
    <Card className="bg-white border border-gray-200/70 rounded-xl shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Klient Oppgaver</CardTitle>
          <Badge variant="outline" className="text-xs">
            {clientsWithSummary.length} klienter
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Klient</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Oppdragsansvarlig</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-700">Åpne oppgaver</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-700">Forfalt</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Lønn</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client, index) => (
                  <tr 
                    key={client.id} 
                    className={`${index !== sortedClients.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}
                    data-testid={`row-client-${client.id}`}
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-900" data-testid={`text-client-name-${client.id}`}>
                          {client.name}
                        </div>
                        {client.orgNumber && (
                          <div className="text-sm text-gray-500">
                            Org.nr: {client.orgNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {client.engagementOwner ? (
                        <div className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span data-testid={`text-engagement-owner-${client.id}`}>
                            {client.engagementOwner.firstName} {client.engagementOwner.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Ikke tildelt</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {client.openTasksCount > 0 ? (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-open-tasks-${client.id}`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {client.openTasksCount}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {client.overdueTasksCount > 0 ? (
                        <Badge variant="destructive" className="text-xs" data-testid={`badge-overdue-tasks-${client.id}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {client.overdueTasksCount}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {client.payrollRunDay ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span>
                            {client.payrollRunDay}. hver måned
                            {client.payrollRunTime && ` kl ${client.payrollRunTime}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Ikke satt</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.location.href = `/clients/${client.id}`}
                        data-testid={`button-view-client-${client.id}`}
                      >
                        Vis detaljer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-4">
          {sortedClients.map((client) => (
            <Card 
              key={client.id} 
              className="border border-gray-100 shadow-none hover:shadow-sm transition-shadow"
              data-testid={`card-client-mobile-${client.id}`}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Client name and org number */}
                  <div>
                    <div className="font-medium text-gray-900" data-testid={`text-client-name-mobile-${client.id}`}>
                      {client.name}
                    </div>
                    {client.orgNumber && (
                      <div className="text-sm text-gray-500">
                        Org.nr: {client.orgNumber}
                      </div>
                    )}
                  </div>

                  {/* Task badges */}
                  <div className="flex gap-2">
                    {client.openTasksCount > 0 && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-open-tasks-mobile-${client.id}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {client.openTasksCount} åpne
                      </Badge>
                    )}
                    {client.overdueTasksCount > 0 && (
                      <Badge variant="destructive" className="text-xs" data-testid={`badge-overdue-tasks-mobile-${client.id}`}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {client.overdueTasksCount} forfalt
                      </Badge>
                    )}
                  </div>

                  {/* Engagement owner */}
                  {client.engagementOwner && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span data-testid={`text-engagement-owner-mobile-${client.id}`}>
                        {client.engagementOwner.firstName} {client.engagementOwner.lastName}
                      </span>
                    </div>
                  )}

                  {/* Payroll schedule */}
                  {client.payrollRunDay && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>
                        Lønn {client.payrollRunDay}. hver måned
                        {client.payrollRunTime && ` kl ${client.payrollRunTime}`}
                      </span>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.location.href = `/clients/${client.id}`}
                      data-testid={`button-view-client-mobile-${client.id}`}
                    >
                      Vis detaljer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}