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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator">Rapportgenerator</TabsTrigger>
            <TabsTrigger value="templates">Malede rapporter</TabsTrigger>
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
                        <Button variant="outline">
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