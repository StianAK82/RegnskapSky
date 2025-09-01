import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { FileSpreadsheet, Download, Filter, Play, Settings } from 'lucide-react';

// Component for completed tasks report
function CompletedTasksReport() {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { data: completedTasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks/completed', startDate, endDate, selectedClient, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedClient !== 'all' && { clientId: selectedClient }),
        ...(selectedEmployee !== 'all' && { employeeId: selectedEmployee })
      });
      const response = await apiRequest('GET', `/api/tasks/completed?${params}`);
      return response.json();
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients').then(res => res.json())
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees').then(res => res.json())
  });

  const totalTimeSpent = completedTasks.reduce((sum: number, task: any) => sum + (task.timeSpent || 0), 0);
  const averageTimePerTask = completedTasks.length > 0 ? totalTimeSpent / completedTasks.length : 0;

  const handleDownloadCSV = () => {
    const headers = ['Oppgave', 'Beskrivelse', 'Klient', 'Ansvarlig', 'Fullført dato', 'Timer brukt', 'Notater'];
    const csvContent = [
      headers.join(','),
      ...completedTasks.map((task: any) => [
        `"${task.title}"`,
        `"${task.description || ''}"`,
        `"${clients.find((c: any) => c.id === task.clientId)?.name || 'Ikke angitt'}"`,
        `"${employees.find((e: any) => e.id === task.assignedTo)?.firstName} ${employees.find((e: any) => e.id === task.assignedTo)?.lastName || 'Ikke angitt'}"`,
        `"${new Date(task.completedAt).toLocaleDateString('nb-NO')}"`,
        task.timeSpent || 0,
        `"${task.completionNotes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utforte_oppgaver_${startDate}_til_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter utførte oppgaver</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  {clients.map((client: any) => (
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
                  {employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
            <p className="text-gray-600">Utførte oppgaver</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{(typeof totalTimeSpent === 'number' ? totalTimeSpent : 0).toFixed(1)}t</div>
            <p className="text-gray-600">Totalt timer brukt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-600">{(typeof averageTimePerTask === 'number' ? averageTimePerTask : 0).toFixed(1)}t</div>
            <p className="text-gray-600">Gjennomsnitt per oppgave</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Utførte oppgaver</CardTitle>
            <Button onClick={handleDownloadCSV} variant="outline">
              <i className="fas fa-download mr-2"></i>
              Last ned CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse border rounded p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : completedTasks.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-tasks text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen utførte oppgaver</h3>
              <p className="text-gray-500">Ingen oppgaver ble fullført i den valgte perioden</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTasks.map((task: any) => {
                const client = clients.find((c: any) => c.id === task.clientId);
                const employee = employees.find((e: any) => e.id === task.assignedTo);
                
                return (
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        {task.description && (
                          <p className="text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          {client && (
                            <span>
                              <i className="fas fa-building mr-1"></i>
                              {client.name}
                            </span>
                          )}
                          {employee && (
                            <span>
                              <i className="fas fa-user mr-1"></i>
                              {employee.firstName} {employee.lastName}
                            </span>
                          )}
                          <span>
                            <i className="fas fa-clock mr-1"></i>
                            {task.timeSpent || 0} timer
                          </span>
                          <span>
                            <i className="fas fa-calendar mr-1"></i>
                            {new Date(task.completedAt).toLocaleDateString('nb-NO')}
                          </span>
                        </div>
                        {task.completionNotes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <strong>Notater:</strong> {task.completionNotes}
                          </div>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-800">Fullført</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ReportSpec {
  id: string;
  title: string;
  description: string;
  tidsrom: {
    start: string;
    slutt: string;
  };
  filtere: string[];
  gruppering: string[];
  kpier: string[];
  sortering: string;
  limit?: number;
  format: 'CSV' | 'Tabell' | 'JSON';
}

interface ReportResult {
  title: string;
  description: string;
  spec: ReportSpec;
  data: any[];
  totals: Record<string, number>;
  csv: string;
  sql: string;
  variants: string[];
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
  const [activeTab, setActiveTab] = useState('generator');
  const [reportQuery, setReportQuery] = useState('');
  const [currentReport, setCurrentReport] = useState<ReportResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quick report filters
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

  // Predefined report templates
  const reportTemplates = [
    {
      id: 'time-by-client',
      title: 'Timer per klient',
      description: 'Oversikt over timer registrert per klient i valgt periode',
      query: 'Generer en rapport over timer per klient for siste måned, gruppert etter klient og ansatt'
    },
    {
      id: 'billable-analysis',
      title: 'Fakturerbar analyse',
      description: 'Analyse av fakturerbare vs ikke-fakturerbare timer',
      query: 'Vis fakturerbare timer vs ikke-fakturerbare timer per ansatt for siste måned'
    },
    {
      id: 'employee-productivity',
      title: 'Ansattproduktivitet',
      description: 'Produktivitetsrapport per ansatt',
      query: 'Generer produktivitetsrapport per ansatt med utnyttelsesgrad og fakturerbare timer'
    },
    {
      id: 'project-profitability',
      title: 'Prosjektlønnsomhet',
      description: 'Lønnsomhetsanalyse per prosjekt/klient',
      query: 'Analyser lønnsomhet per klient med timer, kostnader og margin'
    }
  ];

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/reports/generate', {
        query,
        tidsrom: { start: startDate, slutt: endDate },
        filters: {
          ...(selectedClient !== 'all' && { clientId: selectedClient }),
          ...(selectedEmployee !== 'all' && { employeeId: selectedEmployee })
        }
      });
      return response.json();
    },
    onSuccess: (data: ReportResult) => {
      setCurrentReport(data);
      setIsGenerating(false);
      toast({
        title: 'Rapport generert',
        description: 'Rapporten har blitt generert og er klar for visning.',
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: 'Feil ved generering',
        description: 'Kunne ikke generere rapport: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients').then(res => res.json())
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees').then(res => res.json())
  });

  const handleGenerateReport = (query: string) => {
    setReportQuery(query);
    setIsGenerating(true);
    generateReportMutation.mutate(query);
  };

  const handleDownloadCSV = () => {
    if (!currentReport) return;
    
    const blob = new Blob([currentReport.csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport.title.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Rapporter" subtitle="Generer og analyser rapporter fra systemdata">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generator">Rapportgenerator</TabsTrigger>
            <TabsTrigger value="templates">Rapport maler</TabsTrigger>
            <TabsTrigger value="completed-tasks">Utførte oppgaver</TabsTrigger>
            <TabsTrigger value="results">Resultater</TabsTrigger>
          </TabsList>

          {/* Report Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Rapportgenerator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fra dato</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Til dato</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client">Klient filter</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle klienter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle klienter</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="employee">Ansatt filter</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle ansatte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle ansatte</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="query">Rapportforespørsel</Label>
                  <Textarea
                    id="query"
                    placeholder="Beskriv rapporten du vil generere, f.eks: 'Generer en rapport over timer per klient for siste måned, gruppert etter klient og ansatt med totalsummer'"
                    value={reportQuery}
                    onChange={(e) => setReportQuery(e.target.value)}
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Du kan spørre om timeregistrering, fakturerbar analyse, produktivitet, eller lønnsomhet per klient/ansatt.
                  </p>
                </div>

                <Button 
                  onClick={() => handleGenerateReport(reportQuery)}
                  disabled={!reportQuery.trim() || isGenerating}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Genererer rapport...' : 'Generer rapport'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                  setReportQuery(template.query);
                  setActiveTab('generator');
                }}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm">{template.description}</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Bruk mal
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Completed Tasks Tab */}
          <TabsContent value="completed-tasks" className="space-y-6">
            <CompletedTasksReport />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {currentReport ? (
              <div className="space-y-6">
                {/* Report Header */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{currentReport.title}</CardTitle>
                        <p className="text-gray-600 mt-1">{currentReport.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownloadCSV}>
                          <Download className="h-4 w-4 mr-2" />
                          Last ned CSV
                        </Button>
                        <Button variant="outline" onClick={() => {
                          // Convert CSV to Excel-compatible format
                          const csvData = currentReport.csv;
                          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${currentReport.title.replace(/\s+/g, '_')}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        }}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Eksporter Excel
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(currentReport.totals).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </div>
                          <div className="text-sm text-gray-500">{key}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Report Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rapportdata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {currentReport.data.length > 0 && Object.keys(currentReport.data[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentReport.data.slice(0, 20).map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).map((cell: any, cellIndex) => (
                                <TableCell key={cellIndex}>
                                  {typeof cell === 'number' ? cell.toFixed(2) : cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {currentReport.data.length > 20 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Viser de første 20 radene av {currentReport.data.length} totalt. Last ned CSV for full data.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SQL/Pseudocode */}
                <Card>
                  <CardHeader>
                    <CardTitle>SQL/Pseudokode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                      <code>{currentReport.sql}</code>
                    </pre>
                  </CardContent>
                </Card>

                {/* Suggested Variants */}
                <Card>
                  <CardHeader>
                    <CardTitle>Foreslåtte varianter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentReport.variants.map((variant, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="text-sm">{variant}</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleGenerateReport(variant)}
                          >
                            Generer
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">Ingen rapport generert ennå. Gå til Rapportgenerator for å lage en rapport.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}