import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export function EngagementDialog({ clientId, clientName, open, onOpenChange, trigger }: EngagementDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        processorName: 'Conta',
        country: 'Norge',
        transferBasis: 'N/A'
      }]
    }
  });

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
      console.log('PDF URLs:', data.pdfUrls);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opprett Oppdragsavtale</DialogTitle>
          <DialogDescription>
            Klient: <strong>{clientName}</strong> - Opprett en komplett oppdragsavtale etter Regnskap Norge-mal
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Omfang / Arbeidsområder
                      <Button type="button" size="sm" onClick={addScope}>
                        <Plus className="h-4 w-4 mr-1" />
                        Legg til område
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {form.watch('scopes').map((_, index) => (
                        <div key={index} className="border p-4 rounded-lg relative">
                          {form.watch('scopes').length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2"
                              onClick={() => removeItem('scopes', index)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`scopes.${index}.scopeKey`}
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
                              name={`scopes.${index}.frequency`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Frekvens</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
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

                            <FormField
                              control={form.control}
                              name={`scopes.${index}.comments`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Kommentarer</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Tilleggsinformasjon" />
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