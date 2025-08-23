import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Users, 
  Clock, 
  CheckSquare, 
  Plus, 
  ExternalLink, 
  Edit, 
  Trash2,
  Calendar,
  Timer,
  BarChart3,
  Shield,
  UserCheck
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  orgNumber: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  accountingSystem?: string;
  accountingSystemUrl?: string;
  notes: string;
  isActive: boolean;
}

interface ClientResponsible {
  id: string;
  clientId: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ClientTask {
  id: string;
  clientId: string;
  taskName: string;
  taskType: 'standard' | 'custom';
  description: string;
  dueDate: string;
  repeatInterval?: string;
  status: 'ikke_startet' | 'pågår' | 'ferdig';
  assignedTo?: string;
}

interface TimeEntry {
  id: string;
  clientId: string;
  userId: string;
  taskId?: string;
  description: string;
  timeSpent: number;
  date: string;
}

const ACCOUNTING_SYSTEMS = [
  { value: 'fiken', label: 'Fiken', url: 'https://fiken.no' },
  { value: 'tripletex', label: 'Tripletex', url: 'https://tripletex.no' },
  { value: 'unimicro', label: 'Unimicro', url: 'https://unimicro.no' },
  { value: 'poweroffice', label: 'PowerOffice', url: 'https://poweroffice.no' },
  { value: 'conta', label: 'Conta', url: 'https://conta.no' },
  { value: 'annet', label: 'Annet', url: '' }
];

const STANDARD_TASKS = [
  'Bokføring',
  'MVA',
  'Lønn',
  'Bankavstemming',
  'Kontoavstemming'
];

const REPEAT_INTERVALS = [
  { value: 'daglig', label: 'Daglig' },
  { value: 'ukentlig', label: 'Ukentlig' },
  { value: 'månedlig', label: 'Månedlig' },
  { value: 'årlig', label: 'Årlig' }
];

export default function ClientDetail() {
  const [, params] = useRoute('/clients/:id');
  const clientId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [timeEntryData, setTimeEntryData] = useState({
    description: '',
    timeSpent: '',
    date: new Date().toISOString().split('T')[0],
    taskId: ''
  });

  const [taskData, setTaskData] = useState({
    taskName: '',
    taskType: 'standard' as 'standard' | 'custom',
    description: '',
    dueDate: '',
    repeatInterval: '',
    assignedTo: ''
  });

  const [clientUpdates, setClientUpdates] = useState({
    accountingSystem: '',
    accountingSystemUrl: ''
  });

  // Queries
  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}`).then(res => res.json()),
    enabled: !!clientId
  });

  const { data: responsibles = [] } = useQuery({
    queryKey: ['/api/clients', clientId, 'responsibles'],
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}/responsibles`).then(res => res.json()),
    enabled: !!clientId
  });

  const { data: clientTasks = [], isLoading: isTasksLoading, error: tasksError } = useQuery({
    queryKey: ['/api/clients', clientId, 'tasks'],
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}/tasks`).then(res => res.json()),
    enabled: !!clientId
  });


  const { data: timeEntries = [] } = useQuery({
    queryKey: ['/api/reports/time'],
    queryFn: () => apiRequest('GET', `/api/reports/time?clientId=${clientId}`).then(res => res.json()),
    enabled: !!clientId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('GET', '/api/users').then(res => res.json())
  });

  // Mutations
  const updateClientMutation = useMutation({
    mutationFn: (updates: any) => apiRequest('PATCH', `/api/clients/${clientId}`, updates).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({ title: 'Klient oppdatert', description: 'Klientinformasjon ble oppdatert' });
    },
    onError: () => {
      toast({ title: 'Feil', description: 'Kunne ikke oppdatere klient', variant: 'destructive' });
    }
  });

  const addTimeEntryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/time-entries', data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/time'] });
      setIsTimeModalOpen(false);
      setTimeEntryData({ description: '', timeSpent: '', date: new Date().toISOString().split('T')[0], taskId: '' });
      toast({ title: 'Timer registrert', description: 'Timeregistrering ble lagt til' });
    },
    onError: () => {
      toast({ title: 'Feil', description: 'Kunne ikke registrere timer', variant: 'destructive' });
    }
  });

  const addClientTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/clients/${clientId}/tasks`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'tasks'] });
      setIsTaskModalOpen(false);
      setTaskData({
        taskName: '',
        taskType: 'standard',
        description: '',
        dueDate: '',
        repeatInterval: '',
        assignedTo: ''
      });
      toast({ title: 'Oppgave opprettet', description: 'Ny oppgave ble lagt til' });
    },
    onError: () => {
      toast({ title: 'Feil', description: 'Kunne ikke opprette oppgave', variant: 'destructive' });
    }
  });

  useEffect(() => {
    if (client) {
      setClientUpdates({
        accountingSystem: client.accountingSystem || '',
        accountingSystemUrl: client.accountingSystemUrl || ''
      });
    }
  }, [client]);

  const handleAccountingSystemChange = (value: string) => {
    const system = ACCOUNTING_SYSTEMS.find(s => s.value === value);
    setClientUpdates({
      accountingSystem: value,
      accountingSystemUrl: value === 'annet' ? clientUpdates.accountingSystemUrl : (system?.url || '')
    });
  };

  const saveAccountingSystem = () => {
    updateClientMutation.mutate(clientUpdates);
  };

  const handleTimeSubmit = () => {
    if (!timeEntryData.description || !timeEntryData.timeSpent) {
      toast({ title: 'Feil', description: 'Beskrivelse og timer er påkrevd', variant: 'destructive' });
      return;
    }

    addTimeEntryMutation.mutate({
      clientId,
      ...timeEntryData,
      timeSpent: parseFloat(timeEntryData.timeSpent),
      date: new Date(timeEntryData.date).toISOString()
    });
  };

  const handleTaskSubmit = () => {
    if (!taskData.taskName) {
      toast({ title: 'Feil', description: 'Oppgavenavn er påkrevd', variant: 'destructive' });
      return;
    }

    addClientTaskMutation.mutate({
      ...taskData,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null
    });
  };

  const openAccountingSystem = () => {
    if (client?.accountingSystem && client.accountingSystemUrl) {
      window.open(client.accountingSystemUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Klient ikke funnet</h2>
          <Link to="/clients">
            <Button>Tilbake til klienter</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/clients">
            <Button variant="outline" size="sm">← Tilbake</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">Org.nr: {client.orgNumber}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsTimeModalOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Registrer timer
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="responsibles">Ansvarlige</TabsTrigger>
          <TabsTrigger value="tasks">Oppgaver</TabsTrigger>
          <TabsTrigger value="time">Timeføring</TabsTrigger>
          <TabsTrigger value="reports">Rapporter</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Klientinformasjon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Navn</Label>
                  <p className="font-medium">{client.name}</p>
                </div>
                <div>
                  <Label>Kontaktperson</Label>
                  <p>{client.contactPerson || 'Ikke angitt'}</p>
                </div>
                <div>
                  <Label>E-post</Label>
                  <p>{client.email || 'Ikke angitt'}</p>
                </div>
                <div>
                  <Label>Telefon</Label>
                  <p>{client.phone || 'Ikke angitt'}</p>
                </div>
                <div>
                  <Label>Adresse</Label>
                  <p>{client.address || 'Ikke angitt'}</p>
                </div>
              </CardContent>
            </Card>


            {/* Accounting System */}
            <Card>
              <CardHeader>
                <CardTitle>Regnskapssystem</CardTitle>
                <CardDescription>
                  Velg hvilket regnskapssystem klienten bruker
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>System</Label>
                  <Select value={clientUpdates.accountingSystem} onValueChange={handleAccountingSystemChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg regnskapssystem" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNTING_SYSTEMS.map((system) => (
                        <SelectItem key={system.value} value={system.value}>
                          {system.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {clientUpdates.accountingSystem === 'annet' && (
                  <div>
                    <Label>Tilpasset URL</Label>
                    <Input
                      value={clientUpdates.accountingSystemUrl}
                      onChange={(e) => setClientUpdates(prev => ({
                        ...prev,
                        accountingSystemUrl: e.target.value
                      }))}
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button onClick={saveAccountingSystem} disabled={updateClientMutation.isPending}>
                    Lagre system
                  </Button>
                  {client.accountingSystemUrl && (
                    <Button variant="outline" onClick={openAccountingSystem}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Åpne system
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="tasks" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Klientoppgaver</h3>
            <div className="flex space-x-2">
              <Button 
                onClick={() => window.open('https://www.verified.eu/no', '_blank')}
                variant="outline"
                data-testid="button-aml-kyc"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Utfør AML/KYC
              </Button>
              <Button onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ny oppgave
              </Button>
            </div>
          </div>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
            Debug: clientId={clientId}, isTasksLoading={String(isTasksLoading)}, tasksLength={clientTasks.length}
          </div>

          {isTasksLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : tasksError ? (
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium mb-2 text-red-600">Feil ved lasting av oppgaver</h3>
                <p className="text-muted-foreground">
                  {tasksError.message || 'Kunne ikke laste oppgaver'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {clientTasks.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Ingen oppgaver</h3>
                    <p className="text-muted-foreground">
                      Denne klienten har ingen oppgaver ennå. Klikk "Ny oppgave" for å legge til en oppgave.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                clientTasks.map((task: ClientTask) => (
                  <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{task.taskName}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        {task.dueDate && (
                          <p className="text-sm text-muted-foreground">
                            Frist: {new Date(task.dueDate).toLocaleDateString('no-NO')}
                          </p>
                        )}
                      </div>
                      <Badge variant={task.status === 'ferdig' ? 'default' : 'secondary'}>
                        {task.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <h3 className="text-lg font-semibold">Timeføring</h3>
          
          <div className="grid gap-4">
            {timeEntries.map((entry: TimeEntry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{entry.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('no-NO')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entry.timeSpent} timer
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="responsibles" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Oppdragsansvarlige</h3>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Legg til ansvarlig
            </Button>
          </div>

          <div className="grid gap-4">
            {responsibles.map((responsible: ClientResponsible) => (
              <Card key={responsible.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {responsible.user?.firstName} {responsible.user?.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">{responsible.user?.email}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <h3 className="text-lg font-semibold">Rapporter</h3>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4" />
                <p>Rapportering kommer snart</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Time Entry Modal */}
      <Dialog open={isTimeModalOpen} onOpenChange={setIsTimeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrer timer</DialogTitle>
            <DialogDescription>
              Registrer arbeidstimer for denne klienten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Beskrivelse av arbeidet</Label>
              <Textarea
                value={timeEntryData.description}
                onChange={(e) => setTimeEntryData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Hva har du jobbet med?"
              />
            </div>
            <div>
              <Label>Antall timer</Label>
              <Input
                type="number"
                step="0.25"
                value={timeEntryData.timeSpent}
                onChange={(e) => setTimeEntryData(prev => ({ ...prev, timeSpent: e.target.value }))}
                placeholder="0.5"
              />
            </div>
            <div>
              <Label>Dato</Label>
              <Input
                type="date"
                value={timeEntryData.date}
                onChange={(e) => setTimeEntryData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsTimeModalOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleTimeSubmit} disabled={addTimeEntryMutation.isPending}>
                Registrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny oppgave</DialogTitle>
            <DialogDescription>
              Opprett en ny oppgave for denne klienten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type oppgave</Label>
              <Select value={taskData.taskType} onValueChange={(value: 'standard' | 'custom') => setTaskData(prev => ({ ...prev, taskType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard oppgave</SelectItem>
                  <SelectItem value="custom">Tilpasset oppgave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Oppgavenavn</Label>
              {taskData.taskType === 'standard' ? (
                <Select value={taskData.taskName} onValueChange={(value) => setTaskData(prev => ({ ...prev, taskName: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg standard oppgave" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_TASKS.map((task) => (
                      <SelectItem key={task} value={task}>
                        {task}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={taskData.taskName}
                  onChange={(e) => setTaskData(prev => ({ ...prev, taskName: e.target.value }))}
                  placeholder="Skriv inn oppgavenavn"
                />
              )}
            </div>

            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={taskData.description}
                onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivelse av oppgaven"
              />
            </div>

            <div>
              <Label>Frist</Label>
              <Input
                type="date"
                value={taskData.dueDate}
                onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>Gjentagelse</Label>
              <Select value={taskData.repeatInterval} onValueChange={(value) => setTaskData(prev => ({ ...prev, repeatInterval: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg gjentagelse (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleTaskSubmit} disabled={addClientTaskMutation.isPending}>
                Opprett oppgave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}