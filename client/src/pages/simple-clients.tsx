import { useQuery } from '@tanstack/react-query';

interface Client {
  id: string;
  name: string;
  email?: string;
  orgNumber?: string;
}

export default function SimpleClients() {
  const { data: clients, isLoading, error } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  console.log('SimpleClients render:', { clients, isLoading, error });

  if (isLoading) {
    return <div style={{ padding: '20px', color: 'black' }}>Laster klienter...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Feil: {String(error)}</div>;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: 'lightgray', minHeight: '100vh' }}>
      <h1 style={{ color: 'black' }}>SIMPLE CLIENTS TEST</h1>
      <p style={{ color: 'black' }}>Antall klienter: {clients?.length || 0}</p>
      
      <div style={{ marginTop: '20px' }}>
        {clients?.map((client: any) => (
          <div key={client.id} style={{ 
            backgroundColor: 'white', 
            margin: '10px 0', 
            padding: '10px', 
            border: '1px solid black' 
          }}>
            <h3 style={{ color: 'black' }}>{client.name}</h3>
            <p style={{ color: 'black' }}>Email: {client.email || 'Ingen email'}</p>
            <p style={{ color: 'black' }}>Org nr: {client.orgNumber || 'Ikke oppgitt'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}