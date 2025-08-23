import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate: string;
  assignedTo?: string;
  clientId?: string;
}

export function TasksToday() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks/today'],
  });

  const { data: overdueTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks/overdue'],
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allTasks = [...(overdueTasks || []), ...(tasks || [])];

  const getPriorityColor = (priority: string, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-50 border-red-400';
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-400';
      case 'medium': return 'bg-yellow-50 border-yellow-400';
      case 'low': return 'bg-green-50 border-green-400';
      default: return 'bg-gray-50 border-gray-400';
    }
  };

  const getPriorityBadge = (priority: string, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-100 text-red-800';
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPriority = (priority: string, isOverdue: boolean) => {
    if (isOverdue) return 'Høy prioritet';
    switch (priority) {
      case 'high': return 'Høy prioritet';
      case 'medium': return 'Medium prioritet';
      case 'low': return 'Lav prioritet';
      default: return 'Normal prioritet';
    }
  };

  const isOverdue = (task: Task) => {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < now && task.status === 'pending';
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Dagens oppgaver</h3>
          <button className="text-sm text-primary hover:text-blue-700 font-medium">
            Se alle
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {allTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-check-circle text-4xl mb-4 text-green-500"></i>
            <p>Ingen oppgaver for i dag!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(allTasks || []).slice(0, 5).map((task) => {
              const taskIsOverdue = isOverdue(task);
              const dueDate = new Date(task.dueDate);
              const now = new Date();
              const isToday = dueDate.toDateString() === now.toDateString();
              const isTomorrow = dueDate.toDateString() === new Date(now.getTime() + 24*60*60*1000).toDateString();
              
              let dueDateText = '';
              if (taskIsOverdue) {
                const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                dueDateText = `Forfalt: ${daysOverdue} ${daysOverdue === 1 ? 'dag' : 'dager'} siden`;
              } else if (isToday) {
                dueDateText = `Frist: I dag kl. ${dueDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`;
              } else if (isTomorrow) {
                dueDateText = `Frist: I morgen kl. ${dueDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`;
              } else {
                dueDateText = `Frist: ${dueDate.toLocaleDateString('nb-NO')}`;
              }

              return (
                <div 
                  key={task.id} 
                  className={`flex items-start space-x-4 p-4 border-l-4 rounded-r-lg ${getPriorityColor(task.priority, taskIsOverdue)}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full ${taskIsOverdue ? 'bg-red-400' : task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">{dueDateText}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge className={`text-xs ${getPriorityBadge(task.priority, taskIsOverdue)}`}>
                        {formatPriority(task.priority, taskIsOverdue)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Tildelt: {task.assignedTo || 'Ikke tildelt'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
