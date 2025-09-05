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
  UserCheck,
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { EngagementDialog } from '@/components/engagements/EngagementDialog';
import { normalizeFrequency, nextOccurrence, TaskFrequency } from '../../../shared/frequency';

// Simple download button component  
function DownloadButton({ clientId, engagementId, clientName }: { clientId: string, engagementId: string, clientName?: string }) {
  const { toast } = useToast();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Force alert to confirm button works
    alert('🔧 DownloadButton clicked! Check console for details.');
    console.log('🔧 DownloadButton clicked:', { clientId, engagementId });
    
    const authToken = localStorage.getItem('auth_token');
    const token = localStorage.getItem('token'); 
    const finalToken = authToken || token;
    
    console.log('🔧 Token found:', finalToken ? 'YES' : 'NO');
    console.log('🔧 Token value (first 20 chars):', finalToken ? finalToken.substring(0, 20) + '...' : 'NONE');
    
    if (!finalToken) {
      console.log('🔧 No token found - showing error');
      alert('🔧 ERROR: No token found!');
      toast({
        title: "Ikke innlogget",
        description: "Du må være innlogget for å laste ned oppdragsavtale",
        variant: "destructive",
      });
      return;
    }
    
    const downloadUrl = `/api/clients/${clientId}/engagements/${engagementId}/pdf?token=${encodeURIComponent(finalToken)}`;
    console.log('🔧 Opening URL:', downloadUrl);
    alert('🔧 About to open URL: ' + downloadUrl);
    
    // Force navigation
    window.location.href = downloadUrl;
    console.log('🔧 window.location.href set');
    
    toast({
      title: "Nedlasting startet", 
      description: `Oppdragsavtale for ${clientName} blir lastet ned`,
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      type="button"
      style={{ backgroundColor: 'red', color: 'white' }}
    >
      <Download className="h-4 w-4 mr-1" />
      🔧 TEST Last ned
    </Button>
  );
}

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
  amlStatus: 'pending' | 'approved' | 'rejected';
  kycStatus: 'pending' | 'approved' | 'rejected';
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
  { name: 'Bokføring', frequency: ['Daglig', 'Ukentlig', 'Månedlig'] },
  { name: 'MVA', frequency: ['2 vær mnd', 'Kvartalsvis'] },
  { name: 'Lønn', frequency: ['Månedlig'] },
  { name: 'Bankavstemming', frequency: ['Daglig', 'Ukentlig', 'Månedlig'] },
  { name: 'Kontoavstemming', frequency: ['Månedlig', 'Kvartalsvis'] },
  { name: 'Aksjonær oppgave', frequency: ['Årlig'] },
  { name: 'Skattemelding', frequency: ['Årlig'] },
  { name: 'Årsoppgjør', frequency: ['Årlig'] }
];

const REPEAT_INTERVALS = [
  { value: 'daglig', label: 'Daglig' },
  { value: 'ukentlig', label: 'Ukentlig' },
  { value: 'månedlig', label: 'Månedlig' },
  { value: '2 vær mnd', label: '2 vær mnd' },
  { value: 'kvartalsvis', label: 'Kvartalsvis' },
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

  const [standardTaskSchedules, setStandardTaskSchedules] = useState<Record<string, {
    enabled: boolean;
    frequency: string;
    dueDate: string;
    assignedTo: string;
    nextDueDate?: string;
  }>>({});

  const [clientUpdates, setClientUpdates] = useState({
    accountingSystem: '',
    accountingSystemUrl: '',
    amlStatus: 'pending' as 'pending' | 'approved' | 'rejected',
    kycStatus: 'pending' as 'pending' | 'approved' | 'rejected'
  });

  const [isAddResponsibleOpen, setIsAddResponsibleOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

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
    queryFn: async () => {
      console.log(`🔍 FRONTEND: Fetching tasks for client ${clientId}`);
      const response = await apiRequest('GET', `/api/clients/${clientId}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch client tasks');
      }
      const data = await response.json();
      console.log(`🔍 FRONTEND: Got ${data.length} tasks:`, data);
      return data;
    },
    enabled: !!clientId,
    retry: 1,
    staleTime: 0, // Always refetch
    gcTime: 0     // Don't cache (renamed from cacheTime in v5)
  });


  const { data: timeEntries = [] } = useQuery({
    queryKey: ['/api/reports/time'],
    queryFn: () => apiRequest('GET', `/api/reports/time?clientId=${clientId}`).then(res => res.json()),
    enabled: !!clientId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: () => apiRequest('GET', '/api/employees').then(res => res.json())
  });

  const { data: engagements = [], refetch: refetchEngagements, isLoading: engagementsLoading } = useQuery({
    queryKey: ['/api/clients', clientId, 'engagements'],
    queryFn: async () => {
      console.log('🔄 Fetching engagements for client:', clientId);
      const response = await apiRequest('GET', `/api/clients/${clientId}/engagements`);
      const data = await response.json();
      console.log('✅ Engagements data received:', data);
      return data;
    },
    enabled: !!clientId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0  // Don't cache (renamed from cacheTime in v5)
  });


  // Sync standardTaskSchedules with existing clientTasks AND missing standard tasks (preserve user changes)
  useEffect(() => {
    setStandardTaskSchedules(prevSchedules => {
      const schedules: Record<string, any> = {};
      
      // First, add all existing client tasks
      if (clientTasks && clientTasks.length > 0) {
        clientTasks.forEach((task: any) => {
          // Find the standard task template to get correct frequency options
          const standardTask = STANDARD_TASKS.find(t => t.name === task.taskName);
          const validFrequency = standardTask?.frequency.includes(task.repeatInterval) 
            ? task.repeatInterval 
            : standardTask?.frequency[0] || 'Månedlig';
          
          // Preserve user changes if they exist, otherwise use DB data
          const existingUserConfig = prevSchedules[task.taskName];
          
          schedules[task.taskName] = {
            enabled: existingUserConfig?.enabled !== undefined ? existingUserConfig.enabled : true,
            frequency: existingUserConfig?.frequency || validFrequency,
            dueDate: existingUserConfig?.dueDate || (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''),
            // AUTO-ASSIGN to client's responsible person if no assignment exists
            assignedTo: existingUserConfig?.assignedTo || task.assignedTo || client?.responsiblePersonId || '',
            nextDueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
          };
        });
      }
      
      // Then, add any missing standard tasks that aren't in client tasks yet
      STANDARD_TASKS.forEach((standardTask) => {
        if (!schedules[standardTask.name]) {
          const existingUserConfig = prevSchedules[standardTask.name];
          schedules[standardTask.name] = {
            enabled: existingUserConfig?.enabled !== undefined ? existingUserConfig.enabled : false, // Default disabled for new tasks
            frequency: existingUserConfig?.frequency || standardTask.frequency[0],
            dueDate: existingUserConfig?.dueDate || '',
            // AUTO-ASSIGN to client's responsible person for new tasks
            assignedTo: existingUserConfig?.assignedTo || client?.responsiblePersonId || '',
            nextDueDate: ''
          };
          console.log(`📝 TASK SCHEDULES: Added missing standard task ${standardTask.name} with responsible person: ${client?.responsiblePersonId}`);
        }
      });
      
      console.log('🛠️ TASK SCHEDULES: Built schedules for tasks:', Object.keys(schedules));
      return schedules;
    });
  }, [clientTasks, client]);

  // Mutations
  const updateClientMutation = useMutation({
    mutationFn: (updates: any) => apiRequest('PATCH', `/api/clients/${clientId}`, updates).then(res => res.json()),
    onSuccess: () => {
      // Invalidate all client-related queries globally
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: 'Klient oppdatert', description: 'Klientinformasjon ble oppdatert globalt' });
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
      queryClient.invalidateQueries({ queryKey: ['/api/clients/task-overview'] });
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

  // Use shared frequency normalization - NO MORE LOCAL MAPPING!
  const mapFrequencyToInterval = (frequency: string): string => {
    const normalized = normalizeFrequency(frequency);
    return normalized; // Direct mapping from shared module
  };

  // Calculate next due date using shared frequency module + Norwegian compliance rules
  const calculateNextDueDate = (frequency: string, taskIndex: number = 0, taskName: string = ''): Date => {
    const normalizedFreq = normalizeFrequency(frequency);
    
    // Special Norwegian compliance rules override shared module for specific cases
    if (taskName === 'MVA' && normalizedFreq === 'bi-monthly') {
      // MVA is always on the 10th of every 2nd month
      const baseDate = new Date();
      baseDate.setDate(10); // Always 10th
      
      // Calculate next MVA period (starting from next available period)
      const currentMonth = baseDate.getMonth();
      let nextMvaMonth;
      
      // MVA periods: Jan, Mar, May, Jul, Sep, Nov (every 2nd month)
      const mvaMonths = [0, 2, 4, 6, 8, 10]; // Jan=0, Mar=2, May=4, Jul=6, Sep=8, Nov=10
      
      // Find next available MVA month
      nextMvaMonth = mvaMonths.find(month => month > currentMonth);
      if (!nextMvaMonth) {
        // If no month left this year, start with January next year
        nextMvaMonth = 0;
        baseDate.setFullYear(baseDate.getFullYear() + 1);
      }
      
      // Add taskIndex * 2 months for staggering
      const targetMonth = nextMvaMonth + (taskIndex * 2);
      const yearsToAdd = Math.floor(targetMonth / 12);
      const finalMonth = targetMonth % 12;
      
      baseDate.setMonth(finalMonth);
      baseDate.setFullYear(baseDate.getFullYear() + yearsToAdd);
      
      return baseDate;
    }
    
    if (taskName === 'Lønn' && normalizedFreq === 'monthly') {
      // Lønn is always on the 5th of every month (Norwegian payroll standard)
      const baseDate = new Date();
      baseDate.setDate(5); // Always 5th
      baseDate.setMonth(baseDate.getMonth() + 1 + taskIndex); // Every month, staggered
      return baseDate;
    }
    
    // Use shared frequency module for standard date calculation
    const baseStartDate = new Date();
    try {
      const nextDate = nextOccurrence(normalizedFreq, baseStartDate, new Date());
      
      // Apply task index staggering for multiple tasks of same type
      const staggeredDate = new Date(nextDate);
      switch (normalizedFreq) {
        case 'daily':
          staggeredDate.setDate(staggeredDate.getDate() + taskIndex);
          break;
        case 'weekly':
          staggeredDate.setDate(staggeredDate.getDate() + (taskIndex * 7));
          break;
        case 'monthly':
          staggeredDate.setDate(staggeredDate.getDate() + (taskIndex * 7));
          break;
        case 'bi-monthly':
          staggeredDate.setDate(staggeredDate.getDate() + (taskIndex * 14));
          break;
        case 'quarterly':
          staggeredDate.setDate(staggeredDate.getDate() + (taskIndex * 30));
          break;
        case 'yearly':
          staggeredDate.setDate(staggeredDate.getDate() + (taskIndex * 30));
          break;
        default:
          staggeredDate.setDate(staggeredDate.getDate() + (taskIndex * 7));
      }
      
      return staggeredDate;
    } catch (error) {
      console.warn(`⚠️ Error calculating next occurrence for ${frequency}:`, error);
      // Fallback to simple monthly calculation
      const fallbackDate = new Date();
      fallbackDate.setMonth(fallbackDate.getMonth() + 1);
      fallbackDate.setDate(fallbackDate.getDate() + (taskIndex * 7));
      return fallbackDate;
    }
  };

  const saveStandardTasksMutation = useMutation({
    mutationFn: async (schedules: any) => {
      const enabledTasks = Object.entries(schedules)
        .filter(([, config]: [string, any]) => config.enabled);

      const promises = enabledTasks.map(async ([taskName, config]: [string, any]) => {
        // Find ALL existing tasks for this client/taskName combination
        const existingTasks = clientTasks.filter((task: any) => 
          task.taskName === taskName && task.clientId === clientId
        );

        if (existingTasks.length > 0) {
          // UPDATE ALL existing tasks of this type with staggered due dates
          console.log(`🔄 UPDATING ${existingTasks.length} existing ${taskName} tasks with STAGGERED due dates`);
          
          const updatePromises = existingTasks.map(async (task: any, taskIndex: number) => {
            // Calculate staggered due date for each task with Norwegian compliance
            const staggeredDueDate = calculateNextDueDate(config.frequency, taskIndex, taskName);
            console.log(`📅 Task ${taskIndex + 1} of ${existingTasks.length} - ${taskName} (${config.frequency}): ${staggeredDueDate.toISOString()}`);

            const taskData = {
              taskName,
              taskType: 'standard',
              description: `${config.frequency} ${taskName.toLowerCase()}`,
              dueDate: staggeredDueDate.toISOString(),
              interval: mapFrequencyToInterval(config.frequency),
              repeatInterval: config.frequency,
              // Auto-assign to responsible person if no specific assignment
              assignedTo: config.assignedTo || client?.responsiblePersonId || null,
              status: task.status || 'ikke_startet' // Preserve existing status
            };

            console.log(`📤 UPDATING task ID: ${task.id}`);
            return apiRequest('PATCH', `/api/tasks/${task.id}`, taskData)
              .then(res => {
                console.log(`✅ PATCH ${task.id}: ${res.status} ${res.statusText}`);
                return res.json();
              })
              .catch(error => {
                console.error(`❌ PATCH ERROR for ${task.id}:`, error);
                throw error;
              });
          });
          
          return Promise.all(updatePromises);
        } else {
          // CREATE new task if none exist
          const newDueDate = calculateNextDueDate(config.frequency, 0, taskName);
          console.log(`✅ CREATING new task: ${taskName} (${config.frequency}): ${newDueDate.toISOString()}`);
          
          const taskData = {
            taskName,
            taskType: 'standard',
            description: `${config.frequency} ${taskName.toLowerCase()}`,
            dueDate: newDueDate.toISOString(),
            interval: mapFrequencyToInterval(config.frequency),
            repeatInterval: config.frequency,
            // Auto-assign to responsible person if no specific assignment
            assignedTo: config.assignedTo || client?.responsiblePersonId || null,
            status: 'ikke_startet'
          };

          return apiRequest('POST', `/api/clients/${clientId}/tasks`, taskData)
            .then(res => res.json());
        }
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate all task-related queries GLOBALLY to ensure system-wide updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients/task-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      
      // Force refetch of ALL related data for global consistency
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/tasks'] }),
        queryClient.refetchQueries({ queryKey: ['/api/tasks/overview'] }),
        queryClient.refetchQueries({ queryKey: ['/api/clients'] }),
        queryClient.refetchQueries({ queryKey: ['/api/clients', clientId, 'tasks'] })
      ]).then(() => {
        console.log('🔄 ALL task queries refetched globally, rebuilding form state...');
        // Trigger useEffect to rebuild form state by accessing fresh clientTasks
        const updatedTasks = queryClient.getQueryData(['/api/clients', clientId, 'tasks']);
        if (updatedTasks && Array.isArray(updatedTasks)) {
          console.log('🛠️ Rebuilding form state from fresh data:', updatedTasks.length, 'tasks');
        }
      });
      
      toast({
        title: "Oppgaveplaner lagret",
        description: "Standardoppgaver är nu uppdaterade i hela systemet."
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

  useEffect(() => {
    if (client) {
      setClientUpdates({
        accountingSystem: client.accountingSystem || '',
        accountingSystemUrl: client.accountingSystemUrl || '',
        amlStatus: client.amlStatus || 'pending',
        kycStatus: client.kycStatus || 'pending'
      });
    }
  }, [client]);

  const handleAccountingSystemChange = (value: string) => {
    const system = ACCOUNTING_SYSTEMS.find(s => s.value === value);
    setClientUpdates({
      ...clientUpdates,
      accountingSystem: value,
      accountingSystemUrl: value === 'annet' ? clientUpdates.accountingSystemUrl : (system?.url || '')
    });
  };

  const saveAccountingSystem = () => {
    updateClientMutation.mutate(clientUpdates);
  };

  const handleAMLStatusChange = (value: 'pending' | 'approved' | 'rejected') => {
    setClientUpdates({
      ...clientUpdates,
      amlStatus: value
    });
  };

  const handleKYCStatusChange = (value: 'pending' | 'approved' | 'rejected') => {
    setClientUpdates({
      ...clientUpdates,
      kycStatus: value
    });
  };

  const saveComplianceStatus = () => {
    updateClientMutation.mutate({
      amlStatus: clientUpdates.amlStatus,
      kycStatus: clientUpdates.kycStatus
    });
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

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Godkjent</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Avvist</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Venter</Badge>;
    }
  };

  // Add responsible person mutation
  const addResponsibleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/clients/${clientId}/responsibles`, {
        userId: userId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'responsibles'] });
      setIsAddResponsibleOpen(false);
      setSelectedUserId('');
      toast({
        title: 'Ansvarlig lagt til',
        description: 'Ny ansvarlig person er lagt til for klienten',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke legge til ansvarlig person',
        variant: 'destructive',
      });
    },
  });

  // Remove responsible person mutation
  const removeResponsibleMutation = useMutation({
    mutationFn: async (responsibleId: string) => {
      const response = await apiRequest('DELETE', `/api/clients/${clientId}/responsibles/${responsibleId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'responsibles'] });
      toast({
        title: 'Ansvarlig fjernet',
        description: 'Ansvarlig person er fjernet fra klienten',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke fjerne ansvarlig person',
        variant: 'destructive',
      });
    },
  });

  const handleAddResponsible = () => {
    if (!selectedUserId || selectedUserId === 'no-users-available') {
      toast({ 
        title: 'Feil', 
        description: 'Velg en ansatt å legge til som ansvarlig', 
        variant: 'destructive' 
      });
      return;
    }
    addResponsibleMutation.mutate(selectedUserId);
  };

  const handleRemoveResponsible = (responsibleId: string) => {
    removeResponsibleMutation.mutate(responsibleId);
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

  const saveStandardTaskSchedules = () => {
    const enabledSchedules = Object.fromEntries(
      Object.entries(standardTaskSchedules).filter(([, config]) => config.enabled)
    );
    
    if (Object.keys(enabledSchedules).length === 0) {
      toast({
        title: 'Ingen oppgaver valgt',
        description: 'Velg minst en oppgave å konfigurere.',
        variant: 'destructive'
      });
      return;
    }
    
    saveStandardTasksMutation.mutate(standardTaskSchedules);
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
          <EngagementDialog 
            clientId={clientId!}
            clientName={client.name}
            trigger={
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Opprett Oppdragsavtale
              </Button>
            }
          />
          <Button onClick={() => setIsTimeModalOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Registrer timer
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="engagements">Oppdragsavtaler</TabsTrigger>
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

            {/* AML/KYC Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  AML/KYC Compliance
                </CardTitle>
                <CardDescription>
                  Administrer Anti-Money Laundering og Know Your Customer status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>AML-status</Label>
                    <div className="flex items-center space-x-2 mt-1 mb-2">
                      {client && getAMLStatusBadge(client.amlStatus)}
                    </div>
                    <Select value={clientUpdates.amlStatus} onValueChange={handleAMLStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Venter</SelectItem>
                        <SelectItem value="approved">Godkjent</SelectItem>
                        <SelectItem value="rejected">Avvist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>KYC-status</Label>
                    <div className="flex items-center space-x-2 mt-1 mb-2">
                      {client && getKYCStatusBadge(client.kycStatus)}
                    </div>
                    <Select value={clientUpdates.kycStatus} onValueChange={handleKYCStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Venter</SelectItem>
                        <SelectItem value="approved">Godkjent</SelectItem>
                        <SelectItem value="rejected">Avvist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Button onClick={saveComplianceStatus} disabled={updateClientMutation.isPending}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Lagre compliance-status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagements Tab */}
        <TabsContent value="engagements" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Oppdragsavtaler</h3>
            <EngagementDialog 
              clientId={clientId!}
              clientName={client?.name || ''}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ny Oppdragsavtale
                </Button>
              }
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Engasjementsoversikt</CardTitle>
              <CardDescription>
                Oversikt over alle oppdragsavtaler for denne klienten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {engagementsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Laster oppdragsavtaler...</p>
                </div>
              ) : !engagements || engagements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p className="text-lg mb-2">Ingen oppdragsavtaler ennå</p>
                  <p className="text-sm mb-4">Opprett din første oppdragsavtale for å komme i gang</p>
                  <EngagementDialog 
                    clientId={clientId!}
                    clientName={client?.name || ''}
                    trigger={
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Opprett første oppdragsavtale
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {engagements.map((engagement: any) => (
                    <div key={engagement.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Oppdragsavtale #{engagement.id}</h4>
                          <div className="text-sm text-gray-600 mt-1">
                            <span>System: {engagement.systemName}</span>
                            <span className="mx-2">•</span>
                            <span>Opprettet: {new Date(engagement.createdAt).toLocaleDateString('nb-NO')}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={engagement.status === 'draft' ? 'secondary' : 'default'}>
                            {engagement.status === 'draft' ? 'Utkast' : engagement.status}
                          </Badge>
                          {clientId && (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                                  if (!token) {
                                    toast({
                                      title: "Ikke innlogget",
                                      description: "Du må være innlogget for å se oppdragsavtale",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  const url = `/api/clients/${clientId}/engagements/${engagement.id}/pdf?token=${encodeURIComponent(token)}`;
                                  // Open in new tab for viewing
                                  window.open(url, '_blank');
                                  
                                  toast({
                                    title: "Åpner oppdragsavtale", 
                                    description: `Viser oppdragsavtale for ${client?.name} i ny fane`,
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Vis PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                                  if (!token) {
                                    toast({
                                      title: "Ikke innlogget",
                                      description: "Du må være innlogget for å laste ned oppdragsavtale",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  const url = `/api/clients/${clientId}/engagements/${engagement.id}/pdf?token=${encodeURIComponent(token)}`;
                                  window.location.href = url;
                                  
                                  toast({
                                    title: "Nedlasting startet", 
                                    description: `Oppdragsavtale for ${client?.name} blir lastet ned som PDF`,
                                  });
                                }}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Last ned PDF
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-600">
                        <span>{engagement.signatories} signatarer</span>
                        <span className="mx-2">•</span>
                        <span>{engagement.scopes} arbeidsområder</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Klientoppgaver</h3>
            <div className="flex space-x-2">
              <Button 
                onClick={() => window.open('https://www.verified.eu/no', '_blank')}
                variant="outline"
                data-testid="button-aml-kyc"
                className="flex items-center relative"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                <span className="pr-1">Utfør AML/KYC</span>
                <img 
                  src="/verified-logo.png" 
                  alt="Powered by Verified" 
                  className="h-4 w-auto -ml-2 relative z-10"
                />
              </Button>
              <Button onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ny oppgave
              </Button>
            </div>
          </div>

          {/* Standard Task Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Oppgaveplanlegging</CardTitle>
              <CardDescription>
                Konfigurer når standardoppgaver skal utføres for denne klienten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
{/* Debug output removed for cleaner design */}
              {STANDARD_TASKS.map((task) => (
                <div key={task.name} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        className="h-6 w-6 rounded border-gray-300"
                        checked={standardTaskSchedules[task.name]?.enabled || false}
                        onChange={(e) => {
                          console.log(`Checkbox för ${task.name} ändrad till:`, e.target.checked);
                          setStandardTaskSchedules(prev => ({
                            ...prev,
                            [task.name]: {
                              ...prev[task.name],
                              enabled: e.target.checked,
                              frequency: prev[task.name]?.frequency || task.frequency[0],
                              dueDate: prev[task.name]?.dueDate || '',
                              assignedTo: prev[task.name]?.assignedTo || ''
                            }
                          }));
                        }}
                      />
                      <label className="font-bold text-lg">{task.name}</label>
                      {standardTaskSchedules[task.name]?.enabled ? (
                        <Badge variant="default" className="ml-2 bg-green-100 text-green-800 border-green-300">
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">
                          Inaktiv
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      ({task.frequency.join(', ')})
                    </div>
                  </div>
                  
                  {standardTaskSchedules[task.name]?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-7 p-4 bg-green-100 border-4 border-green-600 rounded-lg">
                      <div className="col-span-full text-lg text-green-700 font-bold mb-2">
                        🔧 PLANLEGGING FOR {task.name}
                      </div>
                      <div>
                        <Label className="text-sm font-bold">Frekvens</Label>
                        <Select 
                          value={standardTaskSchedules[task.name]?.frequency || task.frequency[0]}
                          onValueChange={(value) => {
                            setStandardTaskSchedules(prev => ({
                              ...prev,
                              [task.name]: {
                                ...prev[task.name],
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
                        <Label className="text-sm">Ansvarlig person</Label>
                        <Select 
                          value={standardTaskSchedules[task.name]?.assignedTo || ''}
                          onValueChange={(value) => {
                            setStandardTaskSchedules(prev => ({
                              ...prev,
                              [task.name]: {
                                ...prev[task.name],
                                assignedTo: value
                              }
                            }));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Velg ansvarlig person" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Neste forfallsdato</Label>
                        <Input
                          type="date"
                          value={standardTaskSchedules[task.name]?.dueDate || ''}
                          onChange={(e) => {
                            setStandardTaskSchedules(prev => ({
                              ...prev,
                              [task.name]: {
                                ...prev[task.name],
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
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={saveStandardTaskSchedules}
                  disabled={saveStandardTasksMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {saveStandardTasksMutation.isPending ? 'Lagrer...' : 'Lagre oppgaveplaner'}
                </Button>
              </div>
            </CardContent>
          </Card>
          

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
            <Dialog open={isAddResponsibleOpen} onOpenChange={setIsAddResponsibleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Legg til ansvarlig
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Legg til ansvarlig person</DialogTitle>
                  <DialogDescription>
                    Velg en ansatt som skal være ansvarlig for denne klienten.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="responsible-select">Velg ansatt</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg en ansatt" />
                      </SelectTrigger>
                      <SelectContent>
                        {users && users.length > 0 ? (
                          users.filter((user: any) => !responsibles.some((r: any) => r.userId === user.id)).length > 0 ? (
                            users.filter((user: any) => !responsibles.some((r: any) => r.userId === user.id)).map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-users-available" disabled>Alle ansatte er allerede ansvarlige</SelectItem>
                          )
                        ) : (
                          <SelectItem value="no-users-available" disabled>Ingen ansatte tilgjengelig</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddResponsibleOpen(false)}>
                      Avbryt
                    </Button>
                    <Button onClick={handleAddResponsible} disabled={addResponsibleMutation.isPending}>
                      {addResponsibleMutation.isPending ? 'Legger til...' : 'Legg til'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {responsibles.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen ansvarlige</h3>
                  <p className="text-gray-500 mb-4">Denne klienten har ingen oppdragsansvarlige ennå.</p>
                  <Button onClick={() => setIsAddResponsibleOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Legg til første ansvarlige
                  </Button>
                </CardContent>
              </Card>
            ) : (
              responsibles.map((responsible: ClientResponsible) => (
                <Card key={responsible.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {responsible.user?.firstName} {responsible.user?.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">{responsible.user?.email}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRemoveResponsible(responsible.id)}
                        disabled={removeResponsibleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
                      <SelectItem key={task.name} value={task.name}>
                        {task.name}
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