import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  ExternalLink,
  Search,
  Building2,
  Filter,
  ArrowUpDown,
  PlayCircle
} from "lucide-react";

interface TaskWithClient {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  clientId: string;
  clientName: string;
  clientOrgNumber?: string;
  accountingSystem?: string;
  accountingSystemUrl?: string;
  assignedTo?: string;
  assigneeName?: string;
  isOverdue: boolean;
  source: 'manual' | 'client_schedule';
}

interface TaskOverviewStats {
  totalTasks: number;
  overdueTasks: number;
  todayTasks: number;
  thisWeekTasks: number;
}

// Helper function to get accounting system URL
function getAccountingSystemUrl(system?: string, customUrl?: string): string | null {
  if (system === 'Other' && customUrl) return customUrl;
  
  const urls: Record<string, string> = {
    'Fiken': 'https://fiken.no',
    'Tripletex': 'https://tripletex.no',
    'Unimicro': 'https://unimicro.no',
    'PowerOffice': 'https://poweroffice.no',
    'Conta': 'https://conta.no'
  };
  
  return urls[system || ''] || null;
}

// Component to render accounting system link
function AccountingSystemLink({ system, customUrl }: { system?: string; customUrl?: string }) {
  const url = getAccountingSystemUrl(system, customUrl);
  
  if (!system || !url) {
    return <span className="text-gray-400 text-sm">Ikke satt</span>;
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={() => window.open(url, '_blank')}
      data-testid={`button-accounting-system-${system.toLowerCase()}`}
    >
      <Building2 className="h-3 w-3 mr-1" />
      {system}
      <ExternalLink className="h-3 w-3 ml-1" />
    </Button>
  );
}

// Helper function to format date
function formatDate(dateString?: string): string {
  if (!dateString) return 'Ikke satt';
  
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} dager forsinket`;
  } else if (diffDays === 0) {
    return 'I dag';
  } else if (diffDays === 1) {
    return 'I morgen';
  } else if (diffDays <= 7) {
    return `Om ${diffDays} dager`;
  } else {
    return date.toLocaleDateString('nb-NO');
  }
}

// Helper function to get status badge
function getStatusBadge(status: string, isOverdue: boolean) {
  if (isOverdue && status !== 'completed' && status !== 'done') {
    return <Badge className="bg-red-100 text-red-800">Forsinket</Badge>;
  }
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'done':
    case 'ferdig':
      return <Badge className="bg-green-100 text-green-800">Ferdig</Badge>;
    case 'in_progress':
    case 'pågår':
      return <Badge className="bg-blue-100 text-blue-800">Pågår</Badge>;
    case 'pending':
    case 'open':
    case 'ikke_startet':
    default:
      return <Badge className="bg-yellow-100 text-yellow-800">Venter</Badge>;
  }
}

// Component for completing a task with time tracking
function CompleteTaskDialog({ task }: { task: TaskWithClient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeSpent, setTimeSpent] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, timeSpent, notes }: { taskId: string; timeSpent: number; notes: string }) => {
      const response = await apiRequest('PUT', `/api/tasks/${taskId}/complete`, {
        timeSpent,
        completionNotes: notes
      });
      if (!response.ok) {
        throw new Error('Failed to complete task');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Oppgave fullført",
        description: "Oppgaven er markert som fullført og tid er registrert"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/overview'] });
      setIsOpen(false);
      setTimeSpent('');
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke fullføre oppgaven",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const timeNumber = parseFloat(timeSpent);
    if (!timeNumber || timeNumber <= 0) {
      toast({
        title: "Ugyldig tid",
        description: "Vennligst oppgi en gyldig tid (timer)",
        variant: "destructive"
      });
      return;
    }

    completeTaskMutation.mutate({
      taskId: task.id,
      timeSpent: timeNumber,
      notes
    });
  };

  // Don't show button if task is already completed
  if (['completed', 'done', 'ferdig'].includes(task.status.toLowerCase())) {
    return (
      <span className="text-xs text-gray-500">Fullført</span>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
          data-testid={`button-complete-task-${task.id}`}
        >
          <PlayCircle className="h-3 w-3 mr-1" />
          Marker som utført
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fullfør oppgave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="text-sm text-gray-600 mb-2">
              <strong>Oppgave:</strong> {task.title}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              <strong>Klient:</strong> {task.clientName}
            </div>
          </div>
          
          <div>
            <Label htmlFor="timeSpent">Tid brukt (timer) *</Label>
            <Input
              id="timeSpent"
              type="number"
              step="0.25"
              min="0.25"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="f.eks. 2.5"
              required
              data-testid="input-time-spent"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notater (valgfritt)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Beskriv hva som ble gjort..."
              rows={3}
              data-testid="textarea-completion-notes"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              data-testid="button-cancel-complete"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={completeTaskMutation.isPending}
              data-testid="button-submit-complete"
            >
              {completeTaskMutation.isPending ? 'Lagrer...' : 'Fullfør oppgave'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardClientTasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'client' | 'task'>('dueDate');

  // Fetch all tasks with client information
  const { data: tasks = [], isLoading } = useQuery<TaskWithClient[]>({
    queryKey: ['/api/tasks/overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/tasks/overview');
      if (!response.ok) {
        throw new Error('Failed to fetch task overview');
      }
      return response.json();
    }
  });

  // Calculate statistics
  const stats: TaskOverviewStats = React.useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      totalTasks: tasks.length,
      overdueTasks: tasks.filter(task => task.isOverdue).length,
      todayTasks: tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate.toDateString() === today.toDateString();
      }).length,
      thisWeekTasks: tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= startOfWeek && dueDate <= endOfWeek;
      }).length
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = !searchTerm || 
        task.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && task.isOverdue) ||
        (statusFilter === 'today' && task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()) ||
        task.status.toLowerCase() === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'client':
          return a.clientName.localeCompare(b.clientName);
        case 'task':
          return a.title.localeCompare(b.title);
        case 'dueDate':
        default:
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="text-gray-500">Laster oppgaver...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Søk etter klient eller oppgave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-tasks"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border rounded-md text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="select-status-filter"
              >
                <option value="all">Alle oppgaver</option>
                <option value="overdue">Forsinkede</option>
                <option value="today">I dag</option>
                <option value="pending">Venter</option>
                <option value="in_progress">Pågår</option>
                <option value="completed">Ferdig</option>
              </select>
              
              <select
                className="px-3 py-2 border rounded-md text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                data-testid="select-sort-by"
              >
                <option value="dueDate">Sorter etter frist</option>
                <option value="client">Sorter etter klient</option>
                <option value="task">Sorter etter oppgave</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Alle oppgaver</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Ingen oppgaver funnet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Klient</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Oppgave</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Frist</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Regnskapssystem</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Ansvarlig</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-[120px]">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTasks.map((task) => (
                    <tr 
                      key={task.id} 
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      data-testid={`row-task-${task.id}`}
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-gray-900">{task.clientName}</div>
                          {task.clientOrgNumber && (
                            <div className="text-sm text-gray-500">Org.nr: {task.clientOrgNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500">{task.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`text-sm ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatDate(task.dueDate)}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(task.status, task.isOverdue)}
                      </td>
                      <td className="p-4">
                        <AccountingSystemLink 
                          system={task.accountingSystem} 
                          customUrl={task.accountingSystemUrl}
                        />
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600">
                          {task.assigneeName || 'Ikke tildelt'}
                        </div>
                      </td>
                      <td className="p-4 min-w-[120px]">
                        <CompleteTaskDialog task={task} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}