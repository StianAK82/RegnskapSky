import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Client {
  id: string;
  name: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  amlStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
}

export default function ClientsSimple() {
  const { user } = useAuth();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>Laster klienter...</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1f2937' }}>
        Klienter ({clients.length})
      </h1>
      
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle>{client.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Org.nr:</strong> {client.orgNumber || 'Ikke oppgitt'}</p>
              <p><strong>E-post:</strong> {client.email || 'Ikke oppgitt'}</p>
              <p><strong>Telefon:</strong> {client.phone || 'Ikke oppgitt'}</p>
              <p><strong>Status:</strong> {client.isActive ? 'Aktiv' : 'Inaktiv'}</p>
              <p><strong>AML:</strong> 
                <span style={{ 
                  backgroundColor: client.amlStatus === 'approved' ? '#10b981' : 
                                 client.amlStatus === 'rejected' ? '#ef4444' : '#f59e0b',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px'
                }}>
                  {client.amlStatus}
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