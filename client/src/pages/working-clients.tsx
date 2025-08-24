import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

interface Client {
  id: string;
  name: string;
  email?: string;
  orgNumber?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  amlStatus?: string;
  accountingSystem?: string;
}

export default function WorkingClients() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  console.log('WorkingClients data:', { clients, isLoading, count: clients?.length });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.orgNumber && client.orgNumber.includes(searchTerm))
  );

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64 overflow-hidden">
          <TopBar title="Klienter" subtitle="Laster klientdata..." />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="Klienter" 
          subtitle={`${clients.length} registrerte klienter`}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Søk etter klienter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
              data-testid="input-search-clients"
            />
          </div>

          {/* Client Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  {client.orgNumber && (
                    <p className="text-sm text-gray-600">
                      Org. nr: {client.orgNumber}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {client.email && (
                      <p className="text-sm">
                        <strong>E-post:</strong> {client.email}
                      </p>
                    )}
                    {client.phone && (
                      <p className="text-sm">
                        <strong>Telefon:</strong> {client.phone}
                      </p>
                    )}
                    {client.contactPerson && (
                      <p className="text-sm">
                        <strong>Kontaktperson:</strong> {client.contactPerson}
                      </p>
                    )}
                    {client.accountingSystem && (
                      <p className="text-sm">
                        <strong>Regnskapssystem:</strong> {client.accountingSystem}
                      </p>
                    )}
                    {client.amlStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">AML Status:</span>
                        <Badge 
                          variant={client.amlStatus === 'approved' ? 'default' : 'secondary'}
                          className={client.amlStatus === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {client.amlStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-view-client-${client.id}`}
                    >
                      Se detaljer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-edit-client-${client.id}`}
                    >
                      Rediger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm ? 'Ingen klienter funnet' : 'Ingen klienter registrert'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}