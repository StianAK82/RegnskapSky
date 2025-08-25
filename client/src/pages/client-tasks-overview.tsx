import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  Search, 
  Clock, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  Eye,
  CheckCircle
} from 'lucide-react';

interface ClientTaskOverview {
  id: string;
  name: string;
  orgNumber?: string;
  responsibleFirstName?: string;
  responsibleLastName?: string;
  openTasks: number;
  overdueTasks: number;
  thisMonthTasks: number;
}

export default function ClientTasksOverview() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clientsOverview = [], isLoading } = useQuery<ClientTaskOverview[]>({
    queryKey: ['/api/clients/task-overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients/task-overview');
      if (!response.ok) {
        throw new Error('Failed to fetch clients overview');
      }
      return response.json();
    }
  });

  const filteredClients = clientsOverview.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.orgNumber && client.orgNumber.includes(searchTerm))
  );

  const totalOpenTasks = clientsOverview.reduce((sum, client) => sum + client.openTasks, 0);
  const totalOverdueTasks = clientsOverview.reduce((sum, client) => sum + client.overdueTasks, 0);
  const totalThisMonthTasks = clientsOverview.reduce((sum, client) => sum + client.thisMonthTasks, 0);

  return (
    <AppShell title="Oppgaver" subtitle="Oversikt over alle oppgaver og status">
      <div className="space-y-6">
        {/* View Selector */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button 
              className="px-3 py-2 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm"
              data-testid="button-client-view"
            >
              Klient Oppgaver
            </button>
            <a 
              href="/tasks"
              className="px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-white transition-colors"
              data-testid="link-tasks-view"
            >
              Alle Oppgaver
            </a>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Totalt klienter</p>
                  <p className="text-2xl font-bold text-gray-900">{clientsOverview.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Åpne oppgaver</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOpenTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Forsinkede</p>
                  <p className="text-2xl font-bold text-red-600">{totalOverdueTasks}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Denne måneden</p>
                  <p className="text-2xl font-bold text-gray-900">{totalThisMonthTasks}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Søk etter klient eller org.nr..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredClients.length} av {clientsOverview.length} klienter
          </div>
        </div>

        {/* Client Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Klient Oppgaver
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-16 rounded" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Ingen klienter funnet' : 'Ingen klienter ennå'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Prøv å justere søkekriteriene dine' : 'Opprett din første klient for å komme i gang'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-2 font-medium text-gray-700">Klient</th>
                      <th className="text-left py-4 px-2 font-medium text-gray-700">Oppdragsansvarlig</th>
                      <th className="text-center py-4 px-2 font-medium text-gray-700">Åpne oppgaver</th>
                      <th className="text-center py-4 px-2 font-medium text-gray-700">Forfalt</th>
                      <th className="text-center py-4 px-2 font-medium text-gray-700">Denne månedens oppgaver</th>
                      <th className="text-center py-4 px-2 font-medium text-gray-700">Lønn</th>
                      <th className="text-center py-4 px-2 font-medium text-gray-700">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div>
                            <div className="font-medium text-gray-900">{client.name}</div>
                            {client.orgNumber && (
                              <div className="text-sm text-gray-500">Org.nr: {client.orgNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-sm text-gray-700">
                            {client.responsibleFirstName && client.responsibleLastName 
                              ? `${client.responsibleFirstName} ${client.responsibleLastName}`
                              : 'Ikke tildelt'
                            }
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {client.openTasks}
                          </Badge>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <Badge 
                            variant="outline" 
                            className={client.overdueTasks > 0 
                              ? "bg-red-50 text-red-700 border-red-200" 
                              : "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          >
                            {client.overdueTasks}
                          </Badge>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {client.thisMonthTasks}
                          </Badge>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Ikke satt
                          </Badge>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              asChild
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Link href={`/clients/${client.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Vis detaljer
                              </Link>
                            </Button>
                            {(client.openTasks > 0 || client.overdueTasks > 0) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Utfør
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}