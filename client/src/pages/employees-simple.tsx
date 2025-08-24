import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  isActive: boolean;
}

export default function EmployeesSimple() {
  const { user } = useAuth();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>Laster ansatte...</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1f2937' }}>
        Ansatte ({employees.length})
      </h1>
      
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardHeader>
              <CardTitle>{employee.firstName} {employee.lastName}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>E-post:</strong> {employee.email}</p>
              <p><strong>Telefon:</strong> {employee.phone || 'Ikke oppgitt'}</p>
              <p><strong>Stilling:</strong> {employee.position}</p>
              <p><strong>Avdeling:</strong> {employee.department || 'Ikke oppgitt'}</p>
              <p><strong>Startdato:</strong> {new Date(employee.startDate).toLocaleDateString('no-NO')}</p>
              <p><strong>Status:</strong> 
                <span style={{ 
                  backgroundColor: employee.isActive ? '#10b981' : '#ef4444',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px'
                }}>
                  {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                </span>
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