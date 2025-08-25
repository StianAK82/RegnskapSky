import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface TimeEntry {
  id: string;
  description: string;
  timeSpent: string;
  date: string;
  billable: boolean;
  taskType: string | null;
  clientName: string;
  clientId: string;
  userName: string;
  userId: string;
  createdAt: string;
}

export default function Timer() {
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [searchDescription, setSearchDescription] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      
      const response = await fetch(`/api/time-entries?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    },
  });

  // Filter time entries based on selected filters
  const filteredEntries = timeEntries?.filter(entry => {
    const clientMatch = filterClient === 'all' || entry.clientId === filterClient;
    const employeeMatch = filterEmployee === 'all' || entry.userId === filterEmployee;
    const descriptionMatch = searchDescription === '' || 
      entry.description.toLowerCase().includes(searchDescription.toLowerCase());
    
    return clientMatch && employeeMatch && descriptionMatch;
  }) || [];

  // Get unique clients and employees for filter dropdowns
  const uniqueClients = Array.from(
    new Set(timeEntries?.map(entry => ({ id: entry.clientId, name: entry.clientName })) || [])
  ).filter(client => client.name);

  const uniqueEmployees = Array.from(
    new Set(timeEntries?.map(entry => ({ id: entry.userId, name: entry.userName })) || [])
  ).filter(employee => employee.name);

  // Calculate totals
  const totalHours = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.timeSpent || '0'), 0);
  const billableHours = filteredEntries
    .filter(entry => entry.billable)
    .reduce((sum, entry) => sum + parseFloat(entry.timeSpent || '0'), 0);

  const clearFilters = () => {
    setFilterClient('all');
    setFilterEmployee('all');
    setSearchDescription('');
    setDateFrom('');
    setDateTo('');
  };

  if (isLoading) {
    return (
      <AppShell title="Timer" subtitle="Oversikt over registrerte timer">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Laster timeregistreringer...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Timer" subtitle="Oversikt over registrerte timer">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Totale Timer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)} t</div>
            <p className="text-xs text-gray-500 mt-1">{filteredEntries.length} registreringer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Fakturerbare Timer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{billableHours.toFixed(2)} t</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((billableHours / totalHours) * 100) || 0}% av totalt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ikke-fakturerbare Timer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{(totalHours - billableHours).toFixed(2)} t</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(((totalHours - billableHours) / totalHours) * 100) || 0}% av totalt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtrer timeregistreringer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fra dato</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Til dato</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Klient</label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger data-testid="select-client-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle klienter</SelectItem>
                  {uniqueClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ansatt</label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger data-testid="select-employee-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle ansatte</SelectItem>
                  {uniqueEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Søk i beskrivelse</label>
              <Input
                type="text"
                placeholder="Søk..."
                value={searchDescription}
                onChange={(e) => setSearchDescription(e.target.value)}
                data-testid="input-search-description"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
                data-testid="button-clear-filters"
              >
                <i className="fas fa-times mr-2"></i>
                Nullstill filtre
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Timeregistreringer ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">Ingen timeregistreringer funnet</div>
              <p className="text-gray-400">Prøv å justere filtrene eller legg til nye timer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Dato</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Ansatt</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Klient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Beskrivelse</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Timer</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Fakturerbar</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50" data-testid={`row-time-entry-${entry.id}`}>
                      <td className="py-3 px-4 text-sm">
                        {new Date(entry.date).toLocaleDateString('nb-NO')}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {entry.userName || 'Ukjent bruker'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {entry.clientName || 'Ingen klient'}
                      </td>
                      <td className="py-3 px-4 text-sm max-w-xs">
                        <div className="truncate" title={entry.description}>
                          {entry.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {parseFloat(entry.timeSpent || '0').toFixed(2)}t
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          variant={entry.billable ? "default" : "secondary"}
                          className={entry.billable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {entry.billable ? 'Ja' : 'Nei'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-xs">
                          {entry.taskType === 'client_task' ? 'Klientoppgave' : 
                           entry.taskType === 'task' ? 'Oppgave' : 'Manuell'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}