import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface TimeEntry {
  id: string;
  description: string;
  timeSpent: number;
  date: string;
  billable: boolean;
  clientId: string;
  userId: string;
  user?: { firstName: string; lastName: string };
  client?: { name: string };
}

interface Client {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Get time entries with filters
  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/reports/time', startDate, endDate, selectedClient, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedClient !== 'all' && { clientId: selectedClient }),
        ...(selectedEmployee !== 'all' && { userId: selectedEmployee })
      });
      
      const response = await apiRequest('GET', `/api/reports/time?${params}`);
      return response.json();
    }
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients').then(res => res.json())
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees').then(res => res.json())
  });

  // Calculate summary statistics
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.timeSpent, 0);
  const billableHours = timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.timeSpent, 0);
  const uniqueClients = new Set(timeEntries.map(e => e.clientId)).size;

  // Group by client
  const clientSummary = timeEntries.reduce((acc, entry) => {
    const clientName = entry.client?.name || 'Ukjent klient';
    if (!acc[clientName]) {
      acc[clientName] = { total: 0, billable: 0, entries: 0 };
    }
    acc[clientName].total += entry.timeSpent;
    if (entry.billable) acc[clientName].billable += entry.timeSpent;
    acc[clientName].entries += 1;
    return acc;
  }, {} as Record<string, { total: number; billable: number; entries: number }>);

  // Group by employee
  const employeeSummary = timeEntries.reduce((acc, entry) => {
    const employeeName = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Ukjent ansatt';
    if (!acc[employeeName]) {
      acc[employeeName] = { total: 0, billable: 0, entries: 0 };
    }
    acc[employeeName].total += entry.timeSpent;
    if (entry.billable) acc[employeeName].billable += entry.timeSpent;
    acc[employeeName].entries += 1;
    return acc;
  }, {} as Record<string, { total: number; billable: number; entries: number }>);

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: 'excel',
        ...(selectedClient !== 'all' && { clientId: selectedClient }),
        ...(selectedEmployee !== 'all' && { userId: selectedEmployee })
      });
      
      const response = await apiRequest('GET', `/api/reports/time/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timerapport_${startDate}_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Eksport fullført',
          description: 'Timerapport lastet ned som Excel-fil'
        });
      }
    } catch (error) {
      toast({
        title: 'Eksport feilet',
        description: 'Kunne ikke eksportere timerapport',
        variant: 'destructive'
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: 'pdf',
        ...(selectedClient !== 'all' && { clientId: selectedClient }),
        ...(selectedEmployee !== 'all' && { userId: selectedEmployee })
      });
      
      const response = await apiRequest('GET', `/api/reports/time/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timerapport_${startDate}_${endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Eksport fullført',
          description: 'Timerapport lastet ned som PDF-fil'
        });
      }
    } catch (error) {
      toast({
        title: 'Eksport feilet',
        description: 'Kunne ikke eksportere timerapport',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="Rapporter" 
          subtitle="Timerapporter og analyser" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtrer rapporter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fra dato</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Til dato</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Klient</label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle klienter</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ansatt</label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle ansatte</SelectItem>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end space-x-2">
                  <Button onClick={handleExportExcel} variant="outline" size="sm">
                    Excel
                  </Button>
                  <Button onClick={handleExportPDF} variant="outline" size="sm">
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">Totale timer</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{billableHours.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">Fakturerbare timer</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{uniqueClients}</div>
                <p className="text-sm text-muted-foreground">Aktive klienter</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{timeEntries.length}</div>
                <p className="text-sm text-muted-foreground">Tidsregistreringer</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <Tabs defaultValue="by-client" className="space-y-4">
            <TabsList>
              <TabsTrigger value="by-client">Per klient</TabsTrigger>
              <TabsTrigger value="by-employee">Per ansatt</TabsTrigger>
              <TabsTrigger value="detailed">Detaljert liste</TabsTrigger>
            </TabsList>

            <TabsContent value="by-client">
              <Card>
                <CardHeader>
                  <CardTitle>Timer per klient</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(clientSummary).map(([clientName, stats]) => (
                      <div key={clientName} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{clientName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {stats.entries} registreringer
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{stats.total.toFixed(1)} timer</div>
                          <Badge variant="outline">
                            {stats.billable.toFixed(1)} fakturerbart
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="by-employee">
              <Card>
                <CardHeader>
                  <CardTitle>Timer per ansatt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(employeeSummary).map(([employeeName, stats]) => (
                      <div key={employeeName} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{employeeName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {stats.entries} registreringer
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{stats.total.toFixed(1)} timer</div>
                          <Badge variant="outline">
                            {stats.billable.toFixed(1)} fakturerbart
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detailed">
              <Card>
                <CardHeader>
                  <CardTitle>Detaljert timeføring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Dato</th>
                          <th className="text-left p-2">Ansatt</th>
                          <th className="text-left p-2">Klient</th>
                          <th className="text-left p-2">Beskrivelse</th>
                          <th className="text-right p-2">Timer</th>
                          <th className="text-center p-2">Fakturerbar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeEntries.map(entry => (
                          <tr key={entry.id} className="border-b">
                            <td className="p-2">
                              {new Date(entry.date).toLocaleDateString('no-NO')}
                            </td>
                            <td className="p-2">
                              {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Ukjent'}
                            </td>
                            <td className="p-2">
                              {entry.client?.name || 'Ukjent'}
                            </td>
                            <td className="p-2 max-w-xs truncate">
                              {entry.description}
                            </td>
                            <td className="p-2 text-right">
                              {entry.timeSpent.toFixed(1)}
                            </td>
                            <td className="p-2 text-center">
                              {entry.billable ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">Ja</Badge>
                              ) : (
                                <Badge variant="outline">Nei</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}