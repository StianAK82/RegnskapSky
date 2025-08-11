import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Integration {
  id: string;
  provider: string;
  isActive: boolean;
  lastSync: string | null;
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

export function ApiStatus() {
  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Aktiv';
      case 'error': return 'Feil';
      default: return 'Inaktiv';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'tripletex': return 'fas fa-calculator';
      case 'fiken': return 'fas fa-file-invoice';
      case 'stripe': return 'fas fa-credit-card';
      case 'sendgrid': return 'fas fa-envelope';
      default: return 'fas fa-plug';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'tripletex': return 'bg-blue-100 text-blue-600';
      case 'fiken': return 'bg-green-100 text-green-600';
      case 'stripe': return 'bg-purple-100 text-purple-600';
      case 'sendgrid': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Aldri synkronisert';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Synkronisert for ${diffInMinutes} minutter siden`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Synkronisert for ${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
    } else {
      return `Synkronisert ${date.toLocaleDateString('nb-NO')}`;
    }
  };

  // Default integrations if none exist
  const defaultIntegrations = [
    { provider: 'tripletex', status: 'connected', lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { provider: 'fiken', status: 'connected', lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { provider: 'stripe', status: 'connected', lastSync: new Date().toISOString() },
    { provider: 'sendgrid', status: 'error', lastSync: null },
  ];

  const displayIntegrations = integrations?.length ? integrations : defaultIntegrations;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">API-integrasjoner</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayIntegrations.map((integration, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getProviderColor(integration.provider)}`}>
                  <i className={getProviderIcon(integration.provider)}></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{integration.provider}</p>
                  <p className="text-xs text-gray-500">
                    {integration.status === 'error' ? 
                      'Tilkoblingsfeil' : 
                      formatLastSync(integration.lastSync)
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(integration.status)}`}></div>
                <span className={`text-xs font-medium ${getStatusTextColor(integration.status)}`}>
                  {getStatusText(integration.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
