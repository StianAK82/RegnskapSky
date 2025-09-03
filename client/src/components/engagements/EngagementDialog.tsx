import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, FileText, Download } from 'lucide-react';

// Define engagement schema based on the specification
const engagementSchema = z.object({
  systemName: z.string().optional(),
  licenseHolder: z.enum(['client', 'firm']).optional(),
  adminAccess: z.boolean().default(false),
  signatories: z.array(z.object({
    role: z.enum(['client_representative', 'responsible_accountant', 'managing_director']),
    name: z.string().min(1, 'Navn er påkrevd'),
    title: z.string().optional(),
    email: z.string().email('Ugyldig e-post'),
    phone: z.string().optional(),
  })),
  scopes: z.array(z.object({
    scopeKey: z.enum(['bookkeeping', 'year_end', 'payroll', 'invoicing', 'mva', 'period_reports', 'project', 'other']),
    frequency: z.enum(['løpende', 'månedlig', 'kvartalsvis', 'årlig', 'ved_behov']),
    comments: z.string().optional(),
  })),
  pricing: z.array(z.object({
    area: z.enum(['bookkeeping', 'year_end', 'payroll', 'invoicing', 'mva', 'period_reports', 'project', 'other']),
    model: z.enum(['fixed', 'hourly', 'volume']),
    hourlyRateExVat: z.number().optional(),
    minTimeUnitMinutes: z.number().default(15),
    rushMarkupPercent: z.number().default(50),
    fixedAmountExVat: z.number().optional(),
    fixedPeriod: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
    volumeUnitLabel: z.string().optional(),
    volumeUnitPriceExVat: z.number().optional(),
    systemCostsNote: z.string().optional(),
  })),
  dpas: z.array(z.object({
    processorName: z.string().min(1, 'Navn på databehandler er påkrevd'),
    country: z.string().min(1, 'Land er påkrevd'),
    transferBasis: z.string().min(1, 'Overføringsgrunnlag er påkrevd'),
  })),
});

type EngagementFormData = z.infer<typeof engagementSchema>;

interface EngagementDialogProps {
  clientId: string;
  clientName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const SCOPE_LABELS = {
  bookkeeping: 'Bokføring',
  year_end: 'Årsoppgjør',
  payroll: 'Lønn',
  invoicing: 'Fakturering',
  mva: 'MVA',
  period_reports: 'Perioderapporter',
  project: 'Prosjekt',
  other: 'Annet'
};

const FREQUENCY_LABELS = {
  løpende: 'Løpende',
  månedlig: 'Månedlig',
  kvartalsvis: 'Kvartalsvis',
  årlig: 'Årlig',
  ved_behov: 'Ved behov'
};

// Standard tasks available for all clients (hardcoded configuration)
const STANDARD_TASKS = [
  { name: 'Bokföring', frequency: ['Daglig', 'Ukentlig', 'Månedlig'] },
  { name: 'MVA', frequency: ['Månedlig', 'Kvartalsvis', '2 vær mnd'] },
  { name: 'Lønn', frequency: ['Månedlig'] },
  { name: 'Bankavstemming', frequency: ['Daglig', 'Ukentlig'] },
  { name: 'Kontoavstemming', frequency: ['Månedlig', 'Kvartalsvis'] },
  { name: 'Regnskapstemming', frequency: ['Månedlig'] }
];

export function EngagementDialog({ clientId, clientName, open, onOpenChange, trigger }: EngagementDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Internal state for when open/onOpenChange not provided
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = onOpenChange || setInternalOpen;

  // Debug logging for dialog state
  console.log('🔍 ENGAGEMENT DIALOG: Props changed -', { clientId, clientName, open, isOpen });
  
  useEffect(() => {
    console.log('🔍 ENGAGEMENT DIALOG: Dialog opened/closed -', { open, isOpen, clientId });
  }, [open, isOpen, clientId]);
  
  // Fetch full client data for auto-population - try from clients list first
  const { data: allClients } = useQuery({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get client from the existing clients query first as fallback
  const clientFromList = allClients?.find((c: any) => c.id === clientId);

  const { data: client, error: clientError, isLoading: clientLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: async () => {
      console.log('🔍 ENGAGEMENT: Starting to fetch client data for:', clientId);
      console.log('🔍 ENGAGEMENT: Fallback client from list:', clientFromList);
      
      // If we have fallback data, use it immediately to avoid API calls
      if (clientFromList) {
        console.log('🔍 ENGAGEMENT: Using client data from fallback immediately:', clientFromList);
        return clientFromList;
      }
      
      try {
        const response = await apiRequest('GET', `/api/clients/${clientId}`);
        if (!response.ok) {
          console.error('🔍 ENGAGEMENT: Client fetch failed with status:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const clientData = await response.json();
        console.log('🔍 ENGAGEMENT: Successfully fetched client data from API:', clientData);
        return clientData;
      } catch (error) {
        console.error('🔍 ENGAGEMENT: Failed to fetch client data:', error);
        throw error;
      }
    },
    enabled: !!clientId && !!isOpen,
    retry: 1
  });
  
  // Debug logging for client data state
  useEffect(() => {
    console.log('🔍 ENGAGEMENT CLIENT STATE:', {
      hasClient: !!client,
      clientLoading,
      clientError: clientError?.message,
      clientFromList: !!clientFromList,
      client: client
    });
  }, [client, clientLoading, clientError, clientFromList]);

  // Fetch client tasks for auto-populating scopes
  const { data: clientTasks } = useQuery({
    queryKey: [`/api/clients/${clientId}/tasks`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/clients/${clientId}/tasks`);
      const tasksData = await response.json();
      console.log('🔍 ENGAGEMENT: Fetched client tasks:', tasksData);
      return tasksData;
    },
    enabled: !!clientId && !!isOpen
  });

  // Fetch employees for populating responsible person info
  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employees');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Function to map task names to scope categories
  const mapTaskToScope = (taskName: string) => {
    const name = taskName.toLowerCase();
    if (name.includes('bokføring') || name.includes('kontoavstemming') || name.includes('bankavstemming')) {
      return 'bookkeeping';
    }
    if (name.includes('mva')) {
      return 'mva';
    }
    if (name.includes('lønn')) {
      return 'payroll';
    }
    if (name.includes('årsoppgjør')) {
      return 'year_end';
    }
    if (name.includes('faktur')) {
      return 'invoicing';
    }
    return 'other';
  };

  // Function to map repeatInterval to frequency
  const mapIntervalToFrequency = (repeatInterval: string) => {
    if (!repeatInterval) return 'ved_behov';
    const interval = repeatInterval.toLowerCase();
    if (interval.includes('daglig')) return 'løpende';
    if (interval.includes('månedlig')) return 'månedlig';
    if (interval.includes('kvartal')) return 'kvartalsvis';
    if (interval.includes('årlig')) return 'årlig';
    if (interval.includes('2 vær mnd')) return 'månedlig';
    return 'ved_behov';
  };

  const form = useForm<EngagementFormData>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      adminAccess: false,
      signatories: [{
        role: 'client_representative',
        name: '',
        email: '',
        phone: '',
        title: ''
      }],
      scopes: [],
      pricing: [],
      dpas: [{
        processorName: 'Zaldo AS',
        country: 'Norge',
        transferBasis: 'GDPR/EU'
      }]
    }
  });

  // Show error message if client loading failed
  useEffect(() => {
    if (clientError) {
      console.error('🔍 ENGAGEMENT: Client error:', clientError);
      toast({
        title: 'Feil ved henting av klientdata',
        description: `Kunne ikke hente klientinformasjon: ${clientError.message}`,
        variant: 'destructive',
      });
    }
  }, [clientError, toast]);

  // Auto-populate form with client data
  useEffect(() => {
    if (isOpen && client && form.getValues('scopes').length === 0) {
      console.log('🔧 ENGAGEMENT: Auto-populating form with client:', client);
      console.log('🔧 ENGAGEMENT: Client tasks:', clientTasks);
      
      // Small delay to ensure form is ready
      setTimeout(() => {
        // Auto-populate scopes based on client tasks first, fallback to standard tasks
        let autoScopes = [];
        
        if (clientTasks && clientTasks.length > 0) {
          // Use actual client tasks
          autoScopes = clientTasks.slice(0, 8).map((task: any) => {
            const scopeKey = mapTaskToScope(task.taskName || task.title || '');
            const frequency = mapIntervalToFrequency(task.repeatInterval || task.interval || '');
            
            return {
              scopeKey: scopeKey as any,
              frequency: frequency as any,
              comments: task.description || task.taskName || task.title || ''
            };
          });
        } else {
          // Fallback to standard tasks
          autoScopes = STANDARD_TASKS.map((task) => {
            const scopeKey = mapTaskToScope(task.name);
            const firstFreq = task.frequency[0];
            const frequency = mapIntervalToFrequency(firstFreq);
            
            return {
              scopeKey: scopeKey as any,
              frequency: frequency as any,
              comments: task.name
            };
          });
        }
        
        console.log('🔧 ENGAGEMENT: Setting scopes:', autoScopes);
        form.setValue('scopes', autoScopes, { shouldValidate: true });

        // Auto-populate system name if client has one
        if (client.accountingSystem) {
          console.log('🔧 ENGAGEMENT: Setting accounting system:', client.accountingSystem);
          // Map the system name to match dropdown options
          const systemMapping: Record<string, string> = {
            'tripletex': 'tripletex',
            'visma': 'visma_business', 
            'poweroffice': 'poweroffice_go',
            'fiken': 'fiken',
            'mamut': 'mamut_one'
          };
          const mappedSystem = systemMapping[client.accountingSystem.toLowerCase()] || client.accountingSystem;
          form.setValue('systemName', mappedSystem, { shouldValidate: true });
          console.log('🔧 ENGAGEMENT: Mapped system name to:', mappedSystem);
        }

        // Find responsible person from employees
        const responsiblePerson = employees?.find((emp: any) => emp.id === client.responsiblePersonId);
        console.log('🔧 ENGAGEMENT: Found responsible person:', responsiblePerson);

        // Auto-populate signatories with client and responsible person information
        const signatories = [];
        
        // Primary client representative
        signatories.push({
          role: 'client_representative' as const,
          name: client.contactPerson || client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          title: client.contactPerson ? 'Kontaktperson' : 'Representant'
        });

        // Add responsible accountant if available
        if (client.responsiblePersonId || client.engagementOwnerId) {
          signatories.push({
            role: 'responsible_accountant' as const,
            name: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : '',
            email: responsiblePerson?.email || '',
            phone: responsiblePerson?.phone || '',
            title: 'Oppdragsansvarlig regnskapsfører'
          });
        }

        console.log('🔧 ENGAGEMENT: Setting signatories:', signatories);
        form.setValue('signatories', signatories, { shouldValidate: true });

        // Auto-populate standard pricing
        const standardPricing = [{
          area: 'bookkeeping' as const,
          model: 'hourly' as const,
          hourlyRateExVat: 950,
          minTimeUnitMinutes: 15,
          rushMarkupPercent: 50
        }];
        
        form.setValue('pricing', standardPricing, { shouldValidate: true });
      }, 100);
    }
  }, [isOpen, client, clientTasks, employees, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setCurrentStep(1);
    }
  }, [isOpen, form]);

  const createEngagementMutation = useMutation({
    mutationFn: async (data: EngagementFormData) => {
      return apiRequest('POST', `/api/clients/${clientId}/engagements`, {
        ...data,
        status: 'draft',
        validFrom: new Date().toISOString(),
        includeStandardTerms: true,
        includeDpa: true,
        includeItBilag: true,
        version: 1
      });
    },
    onSuccess: () => {
      toast({
        title: 'Engasjement opprettet',
        description: 'Oppdragsavtale er opprettet i draft-status',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/engagements`] });
      form.reset();
      setCurrentStep(1);
      onOpenChange?.(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved opprettelse',
        description: error.message || 'Kunne ikke opprette engasjement',
        variant: 'destructive',
      });
    }
  });

  const finalizeEngagementMutation = useMutation({
    mutationFn: async (engagementId: string) => {
      return apiRequest('POST', `/api/engagements/${engagementId}/finalize`);
    },
    onSuccess: (data) => {
      toast({
        title: 'Oppdragsavtale ferdigstilt',
        description: 'PDF-er er generert og engagement er aktivt',
      });
      console.log('PDF URLs:', (data as any).pdfUrls);
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved ferdigstilling',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = async (data: EngagementFormData) => {
    setIsLoading(true);
    try {
      await createEngagementMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const addScope = () => {
    const scopes = form.getValues('scopes');
    form.setValue('scopes', [...scopes, {
      scopeKey: 'bookkeeping',
      frequency: 'månedlig',
      comments: ''
    }]);
  };

  const addPricing = () => {
    const pricing = form.getValues('pricing');
    form.setValue('pricing', [...pricing, {
      area: 'bookkeeping',
      model: 'hourly',
      hourlyRateExVat: 850,
      minTimeUnitMinutes: 15,
      rushMarkupPercent: 50
    }]);
  };

  const addSignatory = () => {
    const signatories = form.getValues('signatories');
    form.setValue('signatories', [...signatories, {
      role: 'responsible_accountant',
      name: '',
      email: '',
      phone: '',
      title: ''
    }]);
  };

  const removeItem = (field: string, index: number) => {
    const items = form.getValues(field as any);
    if (Array.isArray(items) && items.length > 1) {
      items.splice(index, 1);
      form.setValue(field as any, [...items]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opprett Oppdragsavtale</DialogTitle>
          <DialogDescription>
            Klient: <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step Navigation */}
            <div className="flex space-x-2 border-b pb-4">
              {[1, 2, 3, 4].map((step) => (
                <Button
                  key={step}
                  variant={currentStep === step ? 'default' : 'outline'}
                  size="sm"
                  type="button"
                  onClick={() => setCurrentStep(step)}
                >
                  {step === 1 && 'Grunnlag'}
                  {step === 2 && 'Omfang & Priser'}
                  {step === 3 && 'IT-systemer & DPA'}
                  {step === 4 && 'Oppsummering'}
                </Button>
              ))}
            </div>

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>IT-system og lisenshaver</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="systemName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System navn</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Velg regnskapssystem" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Fiken">Fiken</SelectItem>
                                <SelectItem value="Tripletex">Tripletex</SelectItem>
                                <SelectItem value="Unimicro">Unimicro</SelectItem>
                                <SelectItem value="Conta">Conta</SelectItem>
                                <SelectItem value="PowerOffice">PowerOffice</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="licenseHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lisenshaver</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Velg lisenshaver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">Kunde</SelectItem>
                                <SelectItem value="firm">Regnskapsfirma</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Admin-tilgang</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Signatories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Representanter / Signatar
                      <Button type="button" size="sm" onClick={addSignatory}>
                        <Plus className="h-4 w-4 mr-1" />
                        Legg til
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {form.watch('signatories').map((_, index) => (
                        <div key={index} className="border p-4 rounded-lg relative">
                          {form.watch('signatories').length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2"
                              onClick={() => removeItem('signatories', index)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`signatories.${index}.role`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rolle</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="client_representative">Klientrepresentant</SelectItem>
                                      <SelectItem value="responsible_accountant">Oppdragsansvarlig regnskapsfører</SelectItem>
                                      <SelectItem value="managing_director">Daglig leder</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`signatories.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Navn</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Fullt navn" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`signatories.${index}.email`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>E-post</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" placeholder="navn@firma.no" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`signatories.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tittel</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Stillingstittel" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Scope and Pricing */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Scopes */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-xl">
                      Omfang / Arbeidsområder
                      <Button type="button" size="sm" variant="outline" onClick={addScope}>
                        <Plus className="h-4 w-4 mr-2" />
                        Legg til område
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {form.watch('scopes').length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Ingen arbeidsområder lagt til enda</p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={addScope}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Legg til ditt første område
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Område</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Frekvens</th>
                              <th className="w-16 py-3 px-4"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {form.watch('scopes').map((_, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="py-4 px-4">
                                  <FormField
                                    control={form.control}
                                    name={`scopes.${index}.scopeKey`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <SelectTrigger className="border-0 shadow-none bg-transparent p-0 h-auto font-medium">
                                            <SelectValue placeholder="Velg område" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                                              <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="py-4 px-4">
                                  <FormField
                                    control={form.control}
                                    name={`scopes.${index}.frequency`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <SelectTrigger className="border-0 shadow-none bg-transparent p-0 h-auto text-gray-600">
                                            <SelectValue placeholder="Velg frekvens" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                                              <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="py-4 px-4 text-right">
                                  {form.watch('scopes').length > 1 && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                                      onClick={() => removeItem('scopes', index)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Honorar og betalingsbetingelser
                      <Button type="button" size="sm" onClick={addPricing}>
                        <Plus className="h-4 w-4 mr-1" />
                        Legg til prismodell
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {form.watch('pricing').map((_, index) => (
                        <div key={index} className="border p-4 rounded-lg relative">
                          {form.watch('pricing').length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2"
                              onClick={() => removeItem('pricing', index)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`pricing.${index}.area`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Område</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`pricing.${index}.model`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Prismodell</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hourly">Timepris</SelectItem>
                                      <SelectItem value="fixed">Fastpris</SelectItem>
                                      <SelectItem value="volume">Volum</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Conditional fields based on pricing model */}
                            {form.watch(`pricing.${index}.model`) === 'hourly' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`pricing.${index}.hourlyRateExVat`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Timesats (eks. mva)</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="number" onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`pricing.${index}.minTimeUnitMinutes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Min. tid (minutter)</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="number" defaultValue={15} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}

                            {form.watch(`pricing.${index}.model`) === 'fixed' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`pricing.${index}.fixedAmountExVat`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Fast beløp (eks. mva)</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="number" onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`pricing.${index}.fixedPeriod`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Periode</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="monthly">Månedlig</SelectItem>
                                          <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                                          <SelectItem value="yearly">Årlig</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: IT Systems & DPA */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Databehandleravtaler (DPA)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {form.watch('dpas').map((_, index) => (
                        <div key={index} className="border p-4 rounded-lg relative">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`dpas.${index}.processorName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Databehandler navn</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Navn på systemleverandør" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`dpas.${index}.country`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Land</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Norge" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`dpas.${index}.transferBasis`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Overføringsgrunnlag</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="GDPR/EU" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Betalingsbetingelser</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Betalingsfrist</FormLabel>
                        <Input defaultValue="14 dager" readOnly className="bg-gray-50" />
                      </div>
                      <div>
                        <FormLabel>Fakturafrekvens</FormLabel>
                        <Input defaultValue="Månedlig" readOnly className="bg-gray-50" />
                      </div>
                    </div>
                    <div>
                      <FormLabel>Forsinkelsesrente</FormLabel>
                      <Input defaultValue="Forsinkelsesrente etter forsinkelsesrenteloven" readOnly className="bg-gray-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Legal Terms & Summary */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Lovgrunnlag og juridiske vilkår</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Lovgrunnlag</h4>
                      <div className="text-sm space-y-1">
                        <p>• <strong>Regnskapsloven:</strong> Lov av 17. juli 1998 nr. 56</p>
                        <p>• <strong>Bokføringsloven:</strong> Lov av 19. november 2004 nr. 73</p>
                        <p>• <strong>Revisorloven:</strong> Lov av 15. januar 1999 nr. 2</p>
                        <p>• <strong>Merverdiavgiftsloven:</strong> Lov av 19. juni 2009 nr. 58</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Oppsigelse og avtalevilkår</h4>
                      <div className="text-sm space-y-2">
                        <p><strong>Oppsigelsestid:</strong> 3 måneder fra første i måneden</p>
                        <p><strong>Oppsigelsesrett:</strong> Begge parter kan si opp avtalen med 3 måneders skriftlig varsel</p>
                        <p><strong>Mislighold:</strong> Ved vesentlig mislighold kan avtalen sies opp med umiddelbar virkning</p>
                        <p><strong>Dokumentasjon:</strong> Klienten plikter å levere nødvendig dokumentasjon i henhold til norsk lov</p>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Ansvar og forsikring</h4>
                      <div className="text-sm space-y-1">
                        <p>• Regnskapsfører har yrkesansvarsforsikring</p>
                        <p>• Ansvar begrenses til direkte tap som følge av feil</p>
                        <p>• Ansvar gjelder ikke ved force majeure</p>
                        <p>• Klient har eget ansvar for å kontrollere rapporter</p>
                      </div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Taushetsplikt og personvern</h4>
                      <div className="text-sm space-y-1">
                        <p>• Regnskapsfører er underlagt lovbestemt taushetsplikt</p>
                        <p>• Personopplysninger behandles i henhold til GDPR</p>
                        <p>• Data lagres sikkert og slettes ved avtaleslutt</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Avtalesammendrag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium">Klient:</span>
                        <span>{clientName}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium">Regnskapssystem:</span>
                        <span>{form.watch('systemName') || 'Ikke valgt'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium">Omfang:</span>
                        <span>{form.watch('scopes').length} arbeidsområder</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-medium">Signatører:</span>
                        <span>{form.watch('signatories').length} personer</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Forrige
              </Button>
              
              <div className="flex space-x-2">
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                  >
                    Neste
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Oppretter...' : 'Opprett Oppdragsavtale'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}