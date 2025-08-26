import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SubscriptionData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantName: string;
    createdAt: string;
  };
  stripeData?: {
    customer: any;
    subscriptions: any[];
  };
}

export default function AdminSubscriptions() {
  const { data: subscriptionsData = [], isLoading } = useQuery<SubscriptionData[]>({
    queryKey: ['/api/admin/subscriptions'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
    }).format(amount / 100);
  };

  const getSubscriptionStatus = (subscription: any) => {
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktiv</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Prøveperiode</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Forfalt</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Kansellert</Badge>;
      case 'incomplete':
        return <Badge className="bg-gray-100 text-gray-800">Ufullstendig</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{subscription.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Abonnementsoversikt</h1>
        <p className="text-gray-600">{subscriptionsData.length} totalt kunder</p>
      </div>

      <div className="grid gap-4">
        {subscriptionsData.map((data) => (
          <Card key={data.user.id} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {data.user.firstName} {data.user.lastName}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{data.user.email}</p>
                  <p className="text-sm text-gray-500">Bedrift: {data.user.tenantName}</p>
                  <p className="text-xs text-gray-400">Registrert: {formatDate(data.user.createdAt)}</p>
                </div>
                <div className="text-right">
                  {data.stripeData ? (
                    <Badge className="bg-green-100 text-green-800">Stripe kunde</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Ingen betaling</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {data.stripeData ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Stripe kunde-info</h4>
                    <p className="text-sm">Kunde-ID: {data.stripeData.customer.id}</p>
                    <p className="text-sm">Opprettet: {formatDate(new Date(data.stripeData.customer.created * 1000).toISOString())}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Abonnementer ({data.stripeData.subscriptions.length})</h4>
                    {data.stripeData.subscriptions.length > 0 ? (
                      <div className="space-y-3">
                        {data.stripeData.subscriptions.map((subscription: any) => (
                          <div key={subscription.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">Abonnement {subscription.id}</p>
                                <p className="text-sm text-gray-600">
                                  Start: {formatDate(new Date(subscription.start_date * 1000).toISOString())}
                                </p>
                                {subscription.current_period_end && (
                                  <p className="text-sm text-gray-600">
                                    Neste fakturering: {formatDate(new Date(subscription.current_period_end * 1000).toISOString())}
                                  </p>
                                )}
                              </div>
                              {getSubscriptionStatus(subscription)}
                            </div>
                            
                            {subscription.items?.data?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium">Produkter:</p>
                                {subscription.items.data.map((item: any) => (
                                  <div key={item.id} className="text-sm text-gray-600 ml-2">
                                    • {item.price.nickname || item.price.id} - {formatCurrency(item.price.unit_amount)} per {item.price.recurring?.interval}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {subscription.latest_invoice && (
                              <div className="mt-2">
                                <p className="text-sm">
                                  <span className="font-medium">Siste faktura:</span> {formatCurrency(subscription.latest_invoice.total)}
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({subscription.latest_invoice.status})
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Ingen aktive abonnementer</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p>Kunden har ikke startet noen betaling ennå</p>
                  <p className="text-sm">Gratis periode eller ikke aktivert</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {subscriptionsData.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p>Ingen kunder funnet</p>
        </div>
      )}
    </div>
  );
}