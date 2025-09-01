import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAuth } from '@/hooks/use-auth';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate?: string;
  assignedTo?: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
}

const taskSchema = z.object({
  title: z.string().min(1, 'Tittel er påkrevd'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
});

const completionSchema = z.object({
  timeSpent: z.string().min(1, 'Timer er påkrevd').refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Timer må være et gyldig tall større enn 0'
  }),
  completionNotes: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;
type CompletionFormData = z.infer<typeof completionSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function Tasks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active'); // Changed default to 'active' to hide completed
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'oppdragsansvarlig';

  const { data: allTasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Filter tasks based on user role and visibility settings
  const tasks = allTasks?.filter(task => {
    // Role-based filtering: non-admin users only see their own tasks
    if (!isAdmin && task.assignedTo && task.assignedTo !== user?.id) {
      return false;
    }
    
    // Status filtering
    if (!showCompleted && task.status === 'completed') {
      return false;
    }
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && task.status === 'completed') {
        return false;
      }
      if (filterStatus !== 'active' && filterStatus !== task.status) {
        return false;
      }
    }
    
    // Priority filtering
    if (filterPriority !== 'all' && task.priority !== filterPriority) {
      return false;
    }
    
    return true;
  }) || [];

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await apiRequest('POST', '/api/tasks', {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsCreateOpen(false);
      toast({
        title: 'Oppgave opprettet',
        description: 'Ny oppgave ble opprettet successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke opprette oppgave',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskFormData> }) => {
      const response = await apiRequest('PUT', `/api/tasks/${id}`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setEditingTask(null);
      toast({
        title: 'Oppgave oppdatert',
        description: 'Oppgaveinformasjon ble oppdatert',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke oppdatere oppgave',
        variant: 'destructive',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompletionFormData }) => {
      const response = await apiRequest('PUT', `/api/tasks/${id}/complete`, {
        timeSpent: Number(data.timeSpent),
        completionNotes: data.completionNotes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setCompletingTask(null);
      completionForm.reset();
      toast({ 
        title: 'Oppgave fullført',
        description: 'Oppgaven ble markert som fullført og tid ble registrert'
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Feil ved fullføring av oppgave',
        description: error.message || 'Kunne ikke fullføre oppgave',
        variant: 'destructive'
      });
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, assignedTo }: { taskId: string; assignedTo: string }) => {
      const response = await apiRequest('PUT', `/api/tasks/${taskId}`, { assignedTo });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Oppgave tildelt',
        description: 'Oppgaven har blitt tildelt',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke tildele oppgaven',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
      assignedTo: '',
      clientId: '',
    },
  });

  const completionForm = useForm<CompletionFormData>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      timeSpent: '',
      completionNotes: '',
    },
  });

  const onSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onCompleteSubmit = (data: CompletionFormData) => {
    if (completingTask) {
      completeMutation.mutate({ id: completingTask.id, data });
    }
  };

  const handleMarkComplete = (task: Task) => {
    setCompletingTask(task);
    completionForm.reset();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status === 'overdue' ? 'pending' : task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo || '',
      clientId: task.clientId || '',
    });
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    form.reset({
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
      assignedTo: user?.id || '',
      clientId: '',
    });
    setIsCreateOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Fullført</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">Pågår</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Forfalt</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Venter</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Høy</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Lav</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date() && task.status === 'pending';
  };

  const filteredTasks = tasks?.filter(task => {
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'overdue' && isOverdue(task)) ||
      (filterStatus !== 'overdue' && task.status === filterStatus);
    
    const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
    
    return statusMatch && priorityMatch;
  }) || [];

  const canCreateEdit = user?.role && ['admin', 'oppdragsansvarlig'].includes(user.role);

  return (
    <AppShell title="Oppgaver" subtitle="Administrer oppgaver og fremdrift">
      <div className="space-y-6">
        {/* View Selector */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <a 
              href="/client-tasks-overview"
              className="px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-white transition-colors"
              data-testid="link-client-view"
            >
              Klient Oppgaver
            </a>
            <button 
              className="px-3 py-2 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm"
              data-testid="button-tasks-view"
            >
              Alle Oppgaver
            </button>
          </div>
        </div>

        {/* Filters and Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4 items-center">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktive</SelectItem>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="pending">Venter</SelectItem>
                  <SelectItem value="in_progress">Pågår</SelectItem>
                  <SelectItem value="completed">Fullført</SelectItem>
                  <SelectItem value="overdue">Forfalt</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prioriteter</SelectItem>
                  <SelectItem value="high">Høy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Lav</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-completed"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  data-testid="checkbox-show-completed"
                />
                <label htmlFor="show-completed" className="text-sm text-gray-700">
                  Vis fullførte
                </label>
              </div>
            </div>
            
            {isAdmin && (
              <Dialog open={isCreateOpen || !!editingTask} onOpenChange={(open) => {
                if (!open) {
                  setIsCreateOpen(false);
                  setEditingTask(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreateNew} className="bg-primary hover:bg-blue-700">
                    <i className="fas fa-plus mr-2"></i>
                    Ny oppgave
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTask ? 'Rediger oppgave' : 'Opprett ny oppgave'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tittel *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beskrivelse</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioritet</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Lav</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">Høy</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pending">Venter</SelectItem>
                                  <SelectItem value="in_progress">Pågår</SelectItem>
                                  <SelectItem value="completed">Fullført</SelectItem>
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
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frist</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Klient</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Velg klient" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clients?.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsCreateOpen(false);
                            setEditingTask(null);
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
                          {editingTask ? 'Oppdater' : 'Opprett'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <i className="fas fa-tasks text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen oppgaver</h3>
                <p className="text-gray-500 mb-4">
                  {filterStatus !== 'all' || filterPriority !== 'all' 
                    ? 'Ingen oppgaver samsvarer med de valgte filtrene'
                    : 'Opprett din første oppgave for å komme i gang'
                  }
                </p>
                {canCreateEdit && filterStatus === 'all' && filterPriority === 'all' && (
                  <Button onClick={handleCreateNew} className="bg-primary hover:bg-blue-700">
                    <i className="fas fa-plus mr-2"></i>
                    Opprett oppgave
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const taskIsOverdue = isOverdue(task);
                const client = clients?.find(c => c.id === task.clientId);
                
                return (
                  <Card key={task.id} className={`hover:shadow-md transition-shadow ${taskIsOverdue ? 'border-l-4 border-red-400' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                            {getStatusBadge(taskIsOverdue ? 'overdue' : task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                          
                          {task.description && (
                            <p className="text-gray-600 mb-3">{task.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {task.dueDate && (
                              <span className={taskIsOverdue ? 'text-red-600 font-medium' : ''}>
                                <i className="fas fa-calendar mr-1"></i>
                                Frist: {new Date(task.dueDate).toLocaleDateString('nb-NO')}
                              </span>
                            )}
                            
                            {client && (
                              <span>
                                <i className="fas fa-building mr-1"></i>
                                {client.name}
                              </span>
                            )}
                            
                            {isAdmin ? (
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-user mr-1"></i>
                                <span className="text-sm">Ansvarlig:</span>
                                <Select 
                                  value={task.assignedTo || ''} 
                                  onValueChange={(value) => assignTaskMutation.mutate({ taskId: task.id, assignedTo: value })}
                                >
                                  <SelectTrigger className="w-32 h-6 text-xs">
                                    <SelectValue placeholder="Velg ansvarlig" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Ikke tildelt</SelectItem>
                                    {employees?.map((employee) => (
                                      <SelectItem key={employee.id} value={employee.id}>
                                        {employee.firstName} {employee.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <span>
                                <i className="fas fa-user mr-1"></i>
                                {task.assignedTo === user?.id ? 'Meg' : 
                                 employees?.find(e => e.id === task.assignedTo)?.firstName + ' ' + 
                                 employees?.find(e => e.id === task.assignedTo)?.lastName || 'Ikke tildelt'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Rediger
                            </Button>
                          )}
                          {task.status !== 'completed' && (task.assignedTo === user?.id || isAdmin) && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleMarkComplete(task)}
                              data-testid={`button-complete-task-${task.id}`}
                            >
                              <i className="fas fa-check mr-1"></i>
                              Marker som utført
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Task Completion Modal */}
          <Dialog open={!!completingTask} onOpenChange={(open) => {
            if (!open) {
              setCompletingTask(null);
              completionForm.reset();
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Marker oppgave som fullført</DialogTitle>
              </DialogHeader>
              
              {completingTask && (
                <div className="mb-4">
                  <p className="font-medium text-gray-900">{completingTask.title}</p>
                  {completingTask.description && (
                    <p className="text-sm text-gray-600 mt-1">{completingTask.description}</p>
                  )}
                </div>
              )}

              <Form {...completionForm}>
                <form onSubmit={completionForm.handleSubmit(onCompleteSubmit)} className="space-y-4">
                  <FormField
                    control={completionForm.control}
                    name="timeSpent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timer brukt *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.25" 
                            min="0.25"
                            placeholder="f.eks. 2.5"
                            data-testid="input-time-spent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={completionForm.control}
                    name="completionNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kommentarer (valgfritt)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3} 
                            placeholder="Eventuelle notater om oppgaven..."
                            data-testid="textarea-completion-notes"
                          />
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
                        setCompletingTask(null);
                        completionForm.reset();
                      }}
                      data-testid="button-cancel-completion"
                    >
                      Avbryt
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={completeMutation.isPending}
                      data-testid="button-confirm-completion"
                    >
                      {completeMutation.isPending ? 'Lagrer...' : 'Marker som fullført'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    );
  }
