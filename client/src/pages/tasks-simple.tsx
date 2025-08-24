import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export default function TasksSimple() {
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>Laster oppgaver...</h1>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'overdue': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Ferdig';
      case 'in_progress': return 'Pågår';
      case 'overdue': return 'Forsinket';
      case 'pending': return 'Venter';
      default: return status;
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1f2937' }}>
        Oppgaver ({tasks.length})
      </h1>
      
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle style={{ fontSize: '18px' }}>{task.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description && (
                <p style={{ marginBottom: '10px', color: '#6b7280' }}>{task.description}</p>
              )}
              
              <p><strong>Status:</strong> 
                <span style={{ 
                  backgroundColor: getStatusColor(task.status),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  fontSize: '12px'
                }}>
                  {getStatusText(task.status)}
                </span>
              </p>
              
              <p><strong>Prioritet:</strong> 
                <span style={{ 
                  backgroundColor: getPriorityColor(task.priority),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  fontSize: '12px'
                }}>
                  {task.priority.toUpperCase()}
                </span>
              </p>
              
              {task.dueDate && (
                <p><strong>Forfallsdato:</strong> {new Date(task.dueDate).toLocaleDateString('no-NO')}</p>
              )}
              
              {task.assignedTo && (
                <p><strong>Tildelt:</strong> {task.assignedTo}</p>
              )}
              
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>
                Opprettet: {new Date(task.createdAt).toLocaleDateString('no-NO')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <a href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
          ← Tillbaka till Dashboard
        </a>
      </div>
    </div>
  );
}