import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  startDate: string;
  salary?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const employeeSchema = z.object({
  firstName: z.string().min(1, 'Fornavn er påkrevd'),
  lastName: z.string().min(1, 'Etternavn er påkrevd'),
  email: z.string().email('Ugyldig e-postadresse'),
  phone: z.string().optional(),
  position: z.string().min(1, 'Stilling er påkrevd'),
  department: z.string().optional(),
  startDate: z.string().min(1, 'Startdato er påkrevd'),
  salary: z.number().positive().optional(),
  notes: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const DEPARTMENTS = [
  { value: 'Regnskap', label: 'Regnskap' },
  { value: 'Lønn', label: 'Lønn' },
  { value: 'Revisjon', label: 'Revisjon' },
  { value: 'Rådgivning', label: 'Rådgivning' },
  { value: 'Administrasjon', label: 'Administrasjon' },
  { value: 'IT', label: 'IT' },
];

const POSITIONS = [
  { value: 'Regnskapsfører', label: 'Regnskapsfører' },
  { value: 'Oppdragsansvarlig', label: 'Oppdragsansvarlig' },
  { value: 'Revisor', label: 'Revisor' },
  { value: 'Lønnskonsulent', label: 'Lønnskonsulent' },
  { value: 'Rådgiver', label: 'Rådgiver' },
  { value: 'Daglig leder', label: 'Daglig leder' },
  { value: 'Intern medarbeider', label: 'Intern medarbeider' },
];

export default function Employees() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const response = await apiRequest('POST', '/api/employees', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: 'Ansatt opprettet',
        description: 'Ny ansatt opprettet og kan nå brukes som oppdragsansvarlig',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke opprette ansatt',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeFormData> }) => {
      const response = await apiRequest('PUT', `/api/employees/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setEditingEmployee(null);
      toast({
        title: 'Ansatt oppdatert',
        description: 'Ansattinformasjon ble oppdatert',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke oppdatere ansatt',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/employees/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Ansatt slettet',
        description: 'Ansatt ble slettet',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke slette ansatt',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      startDate: '',
      salary: undefined,
      notes: '',
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      position: employee.position,
      department: employee.department || '',
      startDate: employee.startDate,
      salary: employee.salary,
      notes: employee.notes || '',
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    if (confirm(`Er du sikker på at du vil slette ${employee.firstName} ${employee.lastName}?`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingEmployee(null);
    form.reset();
  };

  const filteredEmployees = employees?.filter(employee =>
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO');
  };

  const formatSalary = (salary?: number) => {
    if (!salary) return 'Ikke oppgitt';
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
    }).format(salary);
  };

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        <TopBar title="Ansatte" />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Ansatte</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Administrer ansatte i organisasjonen din
                </p>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary hover:bg-blue-700 w-full sm:w-auto" 
                    data-testid="button-create-employee"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    <span className="hidden sm:inline">Ny ansatt</span>
                    <span className="sm:hidden">Ny</span>
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEmployee ? 'Rediger ansatt' : 'Opprett ny ansatt'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fornavn *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Etternavn *</FormLabel>
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
                              <FormLabel>E-post *</FormLabel>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stilling *</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Velg stilling" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {POSITIONS.map((position) => (
                                    <SelectItem key={position.value} value={position.value}>
                                      {position.label}
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
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Avdeling</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Velg avdeling" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DEPARTMENTS.map((dept) => (
                                    <SelectItem key={dept.value} value={dept.value}>
                                      {dept.label}
                                    </SelectItem>
                                  ))}
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
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Startdato *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="salary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lønn (årlig)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
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
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={handleDialogClose}>
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
                          {editingEmployee ? 'Oppdater' : 'Opprett'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="flex justify-between items-center">
              <Input
                placeholder="Søk ansatte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm"
              />
            </div>

            {/* Employees Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <i className="fas fa-users text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Ingen ansatte funnet' : 'Ingen ansatte ennå'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm 
                      ? 'Prøv å justere søkekriteriene dine'
                      : 'Opprett din første ansatt for å komme i gang'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((employee) => (
                  <Card key={employee.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {employee.firstName[0]}{employee.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">{employee.position}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-envelope w-4 mr-2"></i>
                          <span>{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="fas fa-phone w-4 mr-2"></i>
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.department && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="fas fa-building w-4 mr-2"></i>
                            <span>{employee.department}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-calendar w-4 mr-2"></i>
                          <span>Startet: {formatDate(employee.startDate)}</span>
                        </div>
                        {employee.salary && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="fas fa-money-bill w-4 mr-2"></i>
                            <span>{formatSalary(employee.salary)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                          className="flex-1"
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Rediger
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(employee)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Slett
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}