import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  amlStatus: 'pending' | 'approved' | 'rejected';
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
  contactPerson: z.string().optional(),
  amlStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function Clients() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await apiRequest('POST', '/api/clients', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsCreateOpen(false);
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
      toast({
        title: 'Klient oppdatert',
        description: 'Klientinformasjon ble oppdatert',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke oppdatere klient',
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
      contactPerson: '',
      amlStatus: 'pending',
      notes: '',
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      orgNumber: client.orgNumber || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      contactPerson: client.contactPerson || '',
      amlStatus: client.amlStatus,
      notes: client.notes || '',
    });
  };

  const handleCreateNew = () => {
    setEditingClient(null);
    form.reset({
      name: '',
      orgNumber: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      amlStatus: 'pending',
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="Klienter" 
          subtitle="Administrer dine klienter og deres informasjon" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
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
            
            <Dialog open={isCreateOpen || !!editingClient} onOpenChange={(open) => {
              if (!open) {
                setIsCreateOpen(false);
                setEditingClient(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateNew} className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-plus mr-2"></i>
                  Ny klient
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? 'Rediger klient' : 'Opprett ny klient'}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreateOpen(false);
                          setEditingClient(null);
                        }}
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
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Clients Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      {getAMLStatusBadge(client.amlStatus)}
                    </div>
                    {client.orgNumber && (
                      <p className="text-sm text-gray-500">Org.nr: {client.orgNumber}</p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {client.contactPerson && (
                        <p className="text-sm">
                          <i className="fas fa-user text-gray-400 mr-2"></i>
                          {client.contactPerson}
                        </p>
                      )}
                      
                      {client.email && (
                        <p className="text-sm">
                          <i className="fas fa-envelope text-gray-400 mr-2"></i>
                          {client.email}
                        </p>
                      )}
                      
                      {client.phone && (
                        <p className="text-sm">
                          <i className="fas fa-phone text-gray-400 mr-2"></i>
                          {client.phone}
                        </p>
                      )}
                      
                      {client.notes && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {client.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <span className="text-xs text-gray-500">
                        Opprettet {new Date(client.createdAt).toLocaleDateString('nb-NO')}
                      </span>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/clients/${client.id}`)}
                        >
                          <i className="fas fa-eye mr-1"></i>
                          Vis detaljer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Rediger
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
