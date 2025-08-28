import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Users, FileText } from 'lucide-react';
import { ExcelImportDialog } from '@/components/clients/ExcelImportDialog';

interface Client {
  id: string;
  name: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalAddress?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  contactPerson?: string;
  amlStatus: 'pending' | 'approved' | 'rejected';
  accountingSystem?: string;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  amlDocuments?: any;
  tasks?: any;
  responsiblePersonId?: string;
  recurringTasks?: any;
  hourlyReportNotes?: string;
  checklistStatus?: string;
  checklists?: any;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const clientSchema = z.object({
  name: z.string().min(1, 'Navn er påkrevd'),
  orgNumber: z.string().optional(),
  email: z.string().email('Ugyldig e-postadresse').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  postalCode: z.string().optional(), 
  city: z.string().optional(),
  contactPerson: z.string().optional(),
  amlStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  accountingSystem: z.string().optional(),
  kycStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  amlDocuments: z.any().optional(),
  tasks: z.array(z.string()).optional(),
  responsiblePersonId: z.string().transform(val => val === "" ? undefined : val).pipe(z.string().uuid().optional()),
  recurringTasks: z.any().optional(),
  hourlyReportNotes: z.string().optional(),
  checklistStatus: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

const ACCOUNTING_SYSTEMS = [
  { value: 'Fiken', label: 'Fiken' },
  { value: 'Tripletex', label: 'Tripletex' },
  { value: 'Unimicro', label: 'Unimicro' },
  { value: 'PowerOffice', label: 'PowerOffice' },
  { value: 'Conta', label: 'Conta' },
  { value: 'Other', label: 'Other' },
];

const TASK_OPTIONS = [
  { value: 'Bokføring', label: 'Bokføring', frequency: ['Daglig', 'Ukentlig', 'Månedlig'] },
  { value: 'MVA', label: 'MVA', frequency: ['2 vær mnd'] },
  { value: 'Lønn', label: 'Lønn', frequency: ['Månedlig'] },
  { value: 'Bankavstemming', label: 'Bankavstemming', frequency: ['Månedlig'] },
  { value: 'Kontoavstemming', label: 'Kontoavstemming', frequency: ['Månedlig', 'Kvartalsvis'] },
  { value: 'Aksjonær oppgave', label: 'Aksjonær oppgave', frequency: ['Årlig'] },
  { value: 'Skattemelding', label: 'Skattemelding', frequency: ['Årlig'] },
  { value: 'Årsoppgjør', label: 'Årsoppgjør', frequency: ['Årlig'] }
];

const TASK_FREQUENCIES = [
  { value: 'Daglig', label: 'Daglig' },
  { value: 'Ukentlig', label: 'Ukentlig' },
  { value: 'Månedlig', label: 'Månedlig' },
  { value: '2 vær mnd', label: '2 vær mnd' },
  { value: 'Kvartalsvis', label: 'Kvartalsvis' },
  { value: 'Årlig', label: 'Årlig' }
];

export default function Clients() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [registrationStep, setRegistrationStep] = useState(1); // Two-step registration
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoadingOrgData, setIsLoadingOrgData] = useState(false);
  const [taskSchedules, setTaskSchedules] = useState<Record<string, {
    enabled: boolean;
    frequency: string;
    assignedTo: string;
    dueDate: string;
  }>>({});
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('GET', '/api/users').then(res => res.json())
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees').then(res => res.json())
  });

  // Function to fetch company data from Brønnøysund
  const fetchCompanyData = async (orgNumber: string) => {
    if (!orgNumber || orgNumber.length !== 9) {
      toast({
        title: 'Ugyldig organisasjonsnummer',
        description: 'Organisasjonsnummer må være 9 siffer',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingOrgData(true);
    try {
      const response = await apiRequest('GET', `/api/bronnoyund/company/${orgNumber}`);
      const data = await response.json();
      
      if (response.ok) {
        setCompanyData(data);
        // Auto-fill form fields with comprehensive Brønnøysund data
        form.setValue('name', data.name || '');
        form.setValue('orgNumber', data.orgNumber || '');
        form.setValue('address', data.businessAddress || '');
        form.setValue('postalAddress', data.postalAddress || '');
        form.setValue('postalCode', data.postalCode || '');
        form.setValue('city', data.city || '');
        
        toast({
          title: 'Selskapsdata hentet',
          description: 'Informasjon fra Brønnøysundregistrene er fylt inn automatisk',
        });
      } else {
        toast({
          title: 'Feil ved henting',
          description: data.message || 'Kunne ikke hente selskapsdata',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Feil ved henting',
        description: 'Kunne ikke koble til Brønnøysundregistrene',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingOrgData(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await apiRequest('POST', '/api/clients', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsCreateOpen(false);
      setTaskSchedules({});
      toast({
        title: 'Klient opprettet',
        description: 'Ny klient ble opprettet successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke opprette klient',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientFormData> }) => {
      const response = await apiRequest('PUT', `/api/clients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setEditingClient(null);
      setTaskSchedules({});
      toast({
        title: 'Klient oppdatert',
        description: 'Klientinformasjon ble oppdatert',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne inte oppdatere klient',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      orgNumber: '',
      email: '',
      phone: '',
      address: '',
      postalAddress: '',
      postalCode: '',
      city: '',
      contactPerson: '',
      amlStatus: 'pending',
      accountingSystem: '',
      kycStatus: 'pending',
      amlDocuments: undefined,
      tasks: [],
      responsiblePersonId: undefined,
      recurringTasks: undefined,
      hourlyReportNotes: '',
      checklistStatus: '',
      notes: '',
    },
  });

  const saveTaskSchedulesMutation = useMutation({
    mutationFn: async ({ clientId, schedules }: { clientId: string; schedules: any }) => {
      const tasks = Object.entries(schedules)
        .filter(([, config]: [string, any]) => config.enabled)
        .map(([taskName, config]: [string, any]) => ({
          taskName,
          taskType: 'standard',
          description: `${config.frequency} ${taskName.toLowerCase()}`,
          dueDate: config.dueDate ? new Date(config.dueDate).toISOString() : null,
          repeatInterval: config.frequency.toLowerCase(),
          assignedTo: config.assignedTo || null,
          status: 'ikke_startet'
        }));

      const promises = tasks.map(task => 
        apiRequest('POST', `/api/clients/${clientId}/tasks`, task).then(res => res.json())
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Oppgaveplaner lagret",
        description: "Standardoppgaver er konfigurert for klienten."
      });
    },
    onError: () => {
      toast({ 
        title: 'Feil', 
        description: 'Kunne ikke lagre oppgaveplaner', 
        variant: 'destructive' 
      });
    }
  });

  const onSubmit = async (data: ClientFormData) => {
    // Transform empty string to undefined for responsiblePersonId
    const cleanedData = {
      ...data,
      responsiblePersonId: data.responsiblePersonId === '' ? undefined : data.responsiblePersonId
    };
    
    try {
      let clientId: string;
      
      if (editingClient) {
        await updateMutation.mutateAsync({ id: editingClient.id, data: cleanedData });
        clientId = editingClient.id;
      } else {
        const newClient = await createMutation.mutateAsync(cleanedData);
        clientId = newClient.id;
      }

      // Save task schedules if any are configured
      const enabledSchedules = Object.fromEntries(
        Object.entries(taskSchedules).filter(([, config]) => config.enabled)
      );
      
      if (Object.keys(enabledSchedules).length > 0) {
        await saveTaskSchedulesMutation.mutateAsync({ clientId, schedules: taskSchedules });
      }
      
    } catch (error) {
      // Error handling is done in individual mutations
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setRegistrationStep(2); // Go directly to step 2 for editing
    // Initialize task schedules for existing tasks
    const clientTasks = client.tasks || [];
    const initialSchedules: Record<string, any> = {};
    clientTasks.forEach((taskName: string) => {
      const taskOption = TASK_OPTIONS.find(t => t.value === taskName);
      if (taskOption) {
        initialSchedules[taskName] = {
          enabled: true,
          frequency: taskOption.frequency[0],
          assignedTo: client.responsiblePersonId || '',
          dueDate: ''
        };
      }
    });
    setTaskSchedules(initialSchedules);
    
    form.reset({
      name: client.name,
      orgNumber: client.orgNumber || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      postalAddress: client.postalAddress || '',
      postalCode: client.postalCode || '',
      city: client.city || '',
      contactPerson: client.contactPerson || '',
      amlStatus: client.amlStatus,
      accountingSystem: client.accountingSystem || '',
      kycStatus: client.kycStatus || 'pending',
      amlDocuments: client.amlDocuments,
      tasks: client.tasks || [],
      responsiblePersonId: client.responsiblePersonId || undefined,
      recurringTasks: client.recurringTasks,
      hourlyReportNotes: client.hourlyReportNotes || '',
      checklistStatus: client.checklistStatus || '',
      notes: client.notes || '',
    });
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingClient(null);
    setRegistrationStep(1);
    setCompanyData(null);
    setTaskSchedules({});
    form.reset();
  };

  const handleCreateNew = () => {
    setEditingClient(null);
    setTaskSchedules({});
    form.reset({
      name: '',
      orgNumber: '',
      email: '',
      phone: '',
      address: '',
      postalAddress: '',
      postalCode: '',
      city: '',
      contactPerson: '',
      amlStatus: 'pending',
      accountingSystem: '',
      kycStatus: 'pending',
      amlDocuments: undefined,
      tasks: [],
      responsiblePersonId: undefined,
      recurringTasks: undefined,
      hourlyReportNotes: '',
      checklistStatus: '',
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const getAMLStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Godkjent</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Avvist</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Venter</Badge>;
    }
  };

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.orgNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AppShell title="Klienter" subtitle="Administrer dine klienter og deres informasjon">
          {/* Search and Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Søk etter klienter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <ExcelImportDialog />
              
              <Button 
                onClick={handleCreateNew}
                className="bg-primary hover:bg-blue-700"
                data-testid="button-create-client"
              >
                <i className="fas fa-plus mr-2"></i>
                Ny klient
              </Button>
              
              <Dialog open={isCreateOpen || !!editingClient} onOpenChange={handleDialogClose}>
              
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    {editingClient ? 'Rediger klient' : `Opprett ny klient - Steg ${registrationStep} av 2`}
                    {!editingClient && (
                      <div className="flex space-x-2">
                        <div className={`w-3 h-3 rounded-full ${registrationStep === 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${registrationStep === 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      </div>
                    )}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Step 1: Basic Information + Organization Lookup */}
                    {(registrationStep === 1 && !editingClient) && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                          <h4 className="font-medium text-blue-800 mb-2">Steg 1: Grunnleggende informasjon</h4>
                          <p className="text-sm text-blue-600">Skriv inn organisasjonsnummer for å hente automatisk selskapsdata fra Brønnøysundregistrene.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="orgNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organisasjonsnummer (9 siffer)</FormLabel>
                                <div className="flex space-x-2">
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="123456789"
                                      maxLength={9}
                                    />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fetchCompanyData(field.value || '')}
                                    disabled={isLoadingOrgData || !field.value || field.value.length !== 9}
                                  >
                                    {isLoadingOrgData ? (
                                      <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                      <i className="fas fa-search"></i>
                                    )}
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Firmanavn *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Adresse</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {companyData && (
                          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                            <h4 className="font-medium text-green-800 mb-2">Selskapsdata hentet</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Organisasjonsform:</span> {companyData.organizationalForm}
                              </div>
                              <div>
                                <span className="font-medium">Registreringsdato:</span> {companyData.registrationDate}
                              </div>
                              {companyData.businessDescription && (
                                <div className="col-span-2">
                                  <span className="font-medium">Virksomhet:</span> {companyData.businessDescription}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button type="button" variant="outline" onClick={handleDialogClose}>
                            Avbryt
                          </Button>
                          <Button 
                            type="button" 
                            onClick={() => {
                              if (form.getValues('name')) {
                                setRegistrationStep(2);
                              } else {
                                toast({
                                  title: 'Manglende informasjon',
                                  description: 'Vennligst fyll inn firmanavn før du fortsetter',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            className="bg-primary hover:bg-blue-700"
                          >
                            Neste <i className="fas fa-arrow-right ml-2"></i>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Detailed Configuration */}
                    {(registrationStep === 2 || editingClient) && (
                      <div className="space-y-4">
                        {!editingClient && (
                          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                            <h4 className="font-medium text-green-800 mb-2">Steg 2: Detaljert konfigurasjon</h4>
                            <p className="text-sm text-green-600">Konfigurer regnskapssystem, oppgaver og ansvarlige personer.</p>
                          </div>
                        )}

                        {/* Tasks Section with Scheduling */}
                        <FormField
                          control={form.control}
                          name="tasks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-medium">Oppgaver</FormLabel>
                              <div className="space-y-3">
                                {TASK_OPTIONS.map((task) => (
                                  <div key={task.value} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Checkbox
                                        id={task.value}
                                        checked={field.value?.includes(task.value) || false}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...(field.value || []), task.value]);
                                            setTaskSchedules(prev => ({
                                              ...prev,
                                              [task.value]: {
                                                enabled: true,
                                                frequency: prev[task.value]?.frequency || task.frequency[0],
                                                assignedTo: prev[task.value]?.assignedTo || '',
                                                dueDate: prev[task.value]?.dueDate || ''
                                              }
                                            }));
                                          } else {
                                            field.onChange(field.value?.filter((t: string) => t !== task.value) || []);
                                            setTaskSchedules(prev => {
                                              const newSchedules = { ...prev };
                                              delete newSchedules[task.value];
                                              return newSchedules;
                                            });
                                          }
                                        }}
                                      />
                                      <Label htmlFor={task.value} className="font-medium flex-1">
                                        {task.label}
                                      </Label>
                                      <span className="text-xs text-gray-500">
                                        ({task.frequency.join(', ')})
                                      </span>
                                      <span className="text-sm font-medium">
                                        {field.value?.includes(task.value) ? 
                                          <span className="text-green-600">✓ Aktivt</span> : 
                                          <span className="text-gray-400">○ Inaktiv</span>
                                        }
                                      </span>
                                    </div>
                                    
                                    {field.value?.includes(task.value) && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                        <div>
                                          <Label className="text-sm font-medium">Frekvens</Label>
                                          <Select 
                                            value={taskSchedules[task.value]?.frequency || task.frequency[0]}
                                            onValueChange={(value) => {
                                              setTaskSchedules(prev => ({
                                                ...prev,
                                                [task.value]: {
                                                  ...prev[task.value],
                                                  frequency: value
                                                }
                                              }));
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {task.frequency.map(freq => (
                                                <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">Ansvarlig</Label>
                                          <Select 
                                            value={taskSchedules[task.value]?.assignedTo || ''}
                                            onValueChange={(value) => {
                                              setTaskSchedules(prev => ({
                                                ...prev,
                                                [task.value]: {
                                                  ...prev[task.value],
                                                  assignedTo: value
                                                }
                                              }));
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Velg person" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {employees.map((employee: any) => (
                                                <SelectItem key={employee.id} value={employee.id}>
                                                  {employee.firstName} {employee.lastName}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">Förfallodato</Label>
                                          <Input
                                            type="date"
                                            value={taskSchedules[task.value]?.dueDate || ''}
                                            onChange={(e) => {
                                              setTaskSchedules(prev => ({
                                                ...prev,
                                                [task.value]: {
                                                  ...prev[task.value],
                                                  dueDate: e.target.value
                                                }
                                              }));
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Firmanavn *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="orgNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organisasjonsnummer</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-post</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefon</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="contactPerson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Kontaktperson</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Adresseinformasjon</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Besøksadresse</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="postalAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Postadresse</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="postalCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Postnummer</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Sted</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Accounting System Selection */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Regnskapssystem</h4>
                          <FormField
                            control={form.control}
                            name="accountingSystem"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Velg regnskapssystem</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Velg regnskapssystem" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ACCOUNTING_SYSTEMS.map((system) => (
                                      <SelectItem key={system.value} value={system.value}>
                                        {system.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Task Configuration Section */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Oppgaver</h4>
                          <FormField
                            control={form.control}
                            name="tasks"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Velg oppgaver for klienten</FormLabel>
                                <div className="space-y-4">
                                  {TASK_OPTIONS.map((task) => (
                                    <div key={task.value} className="space-y-3 p-4 rounded border">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={task.value}
                                          checked={field.value?.includes(task.value) || false}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...(field.value || []), task.value]);
                                              setTaskSchedules(prev => ({
                                                ...prev,
                                                [task.value]: {
                                                  enabled: true,
                                                  frequency: prev[task.value]?.frequency || task.frequency[0],
                                                  assignedTo: prev[task.value]?.assignedTo || '',
                                                  dueDate: prev[task.value]?.dueDate || ''
                                                }
                                              }));
                                            } else {
                                              field.onChange(field.value?.filter((t: string) => t !== task.value) || []);
                                              setTaskSchedules(prev => {
                                                const newSchedules = { ...prev };
                                                delete newSchedules[task.value];
                                                return newSchedules;
                                              });
                                            }
                                          }}
                                        />
                                        <Label htmlFor={task.value} className="font-medium">{task.label}</Label>
                                        <span className="text-xs text-gray-500">({task.frequency.join(', ')})</span>
                                        {field.value?.includes(task.value) && (
                                          <span className="text-green-600 text-sm">✓ Inaktiv</span>
                                        )}
                                      </div>
                                      
                                      {field.value?.includes(task.value) && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6 p-4 bg-gray-50 rounded-lg border">
                                          <div className="col-span-full text-sm text-gray-700 font-medium mb-2">
                                            Planlegging for {task.label}
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Frekvens</Label>
                                            <Select 
                                              value={taskSchedules[task.value]?.frequency || task.frequency[0]}
                                              onValueChange={(value) => {
                                                setTaskSchedules(prev => ({
                                                  ...prev,
                                                  [task.value]: {
                                                    ...prev[task.value],
                                                    frequency: value
                                                  }
                                                }));
                                              }}
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {task.frequency.map(freq => (
                                                  <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Ansvarlig person</Label>
                                            <Select 
                                              value={taskSchedules[task.value]?.assignedTo || ''}
                                              onValueChange={(value) => {
                                                setTaskSchedules(prev => ({
                                                  ...prev,
                                                  [task.value]: {
                                                    ...prev[task.value],
                                                    assignedTo: value
                                                  }
                                                }));
                                              }}
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Velg ansvarlig" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {users.map((user: any) => (
                                                  <SelectItem key={user.id} value={user.id}>
                                                    {user.firstName} {user.lastName}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Neste forfallsdato</Label>
                                            <Input
                                              type="date"
                                              value={taskSchedules[task.value]?.dueDate || ''}
                                              onChange={(e) => {
                                                setTaskSchedules(prev => ({
                                                  ...prev,
                                                  [task.value]: {
                                                    ...prev[task.value],
                                                    dueDate: e.target.value
                                                  }
                                                }));
                                              }}
                                              className="w-full"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Responsible Person Selection */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Ansvarlig person</h4>
                          {employees.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                              <div className="flex">
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-yellow-800">
                                    Ingen ansatte registrert
                                  </h3>
                                  <div className="mt-2 text-sm text-yellow-700">
                                    <p>Du må opprette minst en ansatt før du kan registrere en klient.</p>
                                    <p className="mt-1">Gå til Ansatte-siden for å registrere en ansatt først.</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <FormField
                              control={form.control}
                              name="responsiblePersonId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Velg ansvarlig ansatt</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Velg ansvarlig ansatt" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">Ingen ansvarlig valgt</SelectItem>
                                      {employees.map((employee: any) => (
                                        <SelectItem key={employee.id} value={employee.id}>
                                          {employee.firstName} {employee.lastName}
                                          {employee.position && ` - ${employee.position}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>


                        {/* Basic Info (readonly in step 2) */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Firmanavn *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="orgNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organisasjonsnummer</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-post</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kontaktperson</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="amlStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AML-status</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Venter</SelectItem>
                                <SelectItem value="approved">Godkjent</SelectItem>
                                <SelectItem value="rejected">Avvist</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="accountingSystem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Regnskapssystem</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Velg regnskapssystem" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ACCOUNTING_SYSTEMS.map((system) => (
                                  <SelectItem key={system.value} value={system.value}>
                                    {system.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="kycStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>KYC-status</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Venter</SelectItem>
                                <SelectItem value="approved">Godkjent</SelectItem>
                                <SelectItem value="rejected">Avvist</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="responsiblePersonId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ansvarlig person</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Velg ansvarlig person" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Ingen ansvarlig</SelectItem>
                              {employees.map((employee: any) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName} - {employee.position}
                                </SelectItem>
                              ))}
                              {employees.length === 0 && (
                                <SelectItem value="disabled" disabled>
                                  Ingen ansatte registrert - opprett en ansatt først
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {employees.length === 0 && (
                            <p className="text-sm text-amber-600">
                              Du må opprette minst en ansatt først for å kunne velge ansvarlig person.
                            </p>
                          )}
                        </FormItem>
                      )}
                    />


                    <FormField
                      control={form.control}
                      name="hourlyReportNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeregistreringsnotater</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Notater for timeregistrering" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="checklistStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sjekkliststatus</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Status for klientsjekklliste" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notater</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                        <div className="flex justify-end space-x-2 pt-4">
                          {!editingClient && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setRegistrationStep(1)}
                            >
                              <i className="fas fa-arrow-left mr-2"></i> Tilbake
                            </Button>
                          )}
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleDialogClose}
                          >
                            Avbryt
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-primary hover:bg-blue-700"
                          >
                            {createMutation.isPending || updateMutation.isPending ? (
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                            ) : null}
                            {editingClient ? 'Oppdater' : 'Opprett'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Clients List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <i className="fas fa-users text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Ingen klienter funnet' : 'Ingen klienter ennå'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? 'Prøv å justere søkekriteriene dine'
                    : 'Opprett din første klient for å komme i gang'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={handleCreateNew} className="bg-primary hover:bg-blue-700">
                    <i className="fas fa-plus mr-2"></i>
                    Opprett klient
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <ClientListItem key={client.id} client={client} onEdit={handleEdit} />
              ))}
            </div>
          )}
    </AppShell>
  );
}


// List Item Component for List View
function ClientListItem({ client, onEdit }: { client: any; onEdit: (client: any) => void }) {
  const [bilagCount, setBilagCount] = useState<{ count: number; processed: number } | null>(null);
  const { toast } = useToast();
  
  // Fetch bilag count when component mounts
  useEffect(() => {
    const fetchBilagCount = async () => {
      try {
        const response = await apiRequest('GET', `/api/bilag-count/${client.id}`);
        if (response.ok) {
          const data = await response.json();
          setBilagCount(data);
        }
      } catch (error) {
        // Silently handle - not critical for display
      }
    };
    
    fetchBilagCount();
  }, [client.id]);

  // Accounting system URLs mapping
  const accountingSystemUrls = {
    fiken: "https://fiken.no",
    tripletex: "https://tripletex.no", 
    unimicro: "https://unimicro.no",
    poweroffice: "https://poweroffice.no",
    conta: "https://conta.no"
  };

  const handleAccountingSystemRedirect = () => {
    if (client.accountingSystem && accountingSystemUrls[client.accountingSystem as keyof typeof accountingSystemUrls]) {
      window.open(accountingSystemUrls[client.accountingSystem as keyof typeof accountingSystemUrls], '_blank');
    } else {
      toast({
        title: "Ingen URL",
        description: "Ingen URL er satt opp for dette regnskapssystemet",
        variant: "destructive"
      });
    }
  };

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 text-xs">✓ KYC OK</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 text-xs">✗ KYC Avvist</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">⏳ KYC Venter</Badge>;
    }
  };

  const getAMLStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 text-xs">✓ AML OK</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 text-xs">✗ AML Avvist</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">⏳ AML Venter</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left section - Client info */}
          <div className="flex items-center space-x-6 flex-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{client.name}</h3>
                <div className="flex space-x-2">
                  {getAMLStatusBadge(client.amlStatus)}
                  {getKYCStatusBadge(client.kycStatus)}
                </div>
              </div>
              {client.orgNumber && (
                <p className="text-sm text-gray-500 mt-1">Org.nr: {client.orgNumber}</p>
              )}
              {client.responsiblePersonFirstName && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <i className="fas fa-user-tie mr-2"></i>
                  {client.responsiblePersonFirstName} {client.responsiblePersonLastName}
                </div>
              )}
            </div>
            
            {/* Center section - Accounting system */}
            <div className="text-center">
              {client.accountingSystem ? (
                <button
                  onClick={handleAccountingSystemRedirect}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <i className="fas fa-calculator mr-2"></i>
                  {client.accountingSystem}
                  <i className="fas fa-external-link-alt ml-1 text-xs"></i>
                </button>
              ) : (
                <span className="text-gray-400 text-sm">Ingen system</span>
              )}
            </div>
            
            {/* Bilag count */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {bilagCount ? bilagCount.count : 0}
              </div>
              <div className="text-xs text-gray-500">
                {bilagCount && bilagCount.processed > 0 ? `${bilagCount.processed} behandlet` : 'behandlet'}
              </div>
            </div>
          </div>
          
          {/* Right section - Action buttons */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500">
              {new Date(client.createdAt).toLocaleDateString('nb-NO')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://www.verified.eu/no', '_blank')}
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              <i className="fas fa-shield-alt mr-1"></i>
              AML/KYC
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(client)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <i className="fas fa-edit mr-1"></i>
              Rediger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/client-detail/${client.id}`}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <i className="fas fa-tasks mr-1"></i>
              Oppgaver
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
