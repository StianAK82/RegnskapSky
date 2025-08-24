import { useQuery } from '@tanstack/react-query';

export default function BareClients() {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients'],
  });

  console.log('BareClients render:', { clients, isLoading, error, hasData: !!clients });

  return (
    <div style={{ 
      backgroundColor: 'yellow', 
      padding: '20px', 
      minHeight: '100vh',
      color: 'black',
      fontSize: '16px'
    }}>
      <h1>BARE CLIENTS TEST - GUL BAKGRUNN</h1>
      
      <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '10px' }}>
        <p>Loading: {isLoading ? 'JA' : 'NEI'}</p>
        <p>Error: {error ? String(error) : 'NEI'}</p>
        <p>Data exists: {clients ? 'JA' : 'NEI'}</p>
        <p>Array length: {Array.isArray(clients) ? clients.length : 'Ikke array'}</p>
      </div>

      {isLoading && <div style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}>LASTER...</div>}
      
      {error && <div style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}>FEIL: {String(error)}</div>}

      {clients && Array.isArray(clients) ? (
        <div style={{ backgroundColor: 'green', color: 'white', padding: '20px' }}>
          <h2>CLIENTS DATA FUNNET! ({clients.length} clients)</h2>
          {clients.map((client: any, index: number) => (
            <div key={client.id || index} style={{ 
              backgroundColor: 'white', 
              color: 'black', 
              margin: '10px 0', 
              padding: '10px',
              border: '2px solid black'
            }}>
              <h3>Client #{index + 1}</h3>
              <p><strong>Navn:</strong> {client.name || 'Ingen navn'}</p>
              <p><strong>Email:</strong> {client.email || 'Ingen email'}</p>
              <p><strong>Org nr:</strong> {client.orgNumber || 'Ingen org nr'}</p>
              <p><strong>ID:</strong> {client.id || 'Ingen ID'}</p>
            </div>
          ))}
        </div>
      ) : null}

      {clients && !Array.isArray(clients) ? (
        <div style={{ backgroundColor: 'orange', padding: '20px' }}>
          <h2>DATA ER IKKE ARRAY</h2>
          <pre>{JSON.stringify(clients, null, 2)}</pre>
        </div>
      ) : null}

      {!isLoading && !error && !clients && (
        <div style={{ backgroundColor: 'purple', color: 'white', padding: '20px' }}>
          <h2>INGEN DATA, MEN INGEN FEIL HELLER</h2>
        </div>
      )}
    </div>
  );
}