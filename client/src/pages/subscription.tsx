import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SubscriptionSummary {
  period: string;
  mainLicense: {
    description: string;
    amount: number;
    currency: string;
  };
  userLicenses: {
    description: string;
    unitPrice: number;
    quantity: number;
    amount: number;
    currency: string;
  };
  total: {
    amount: number;
    currency: string;
  };
}

export default function Subscription() {
  const { data: subscription, isLoading, error } = useQuery<SubscriptionSummary>({
    queryKey: ['/api/subscription'],
    refetchInterval: 3000, // Automatisk oppdatering hvert 3. sekund
    refetchOnWindowFocus: true, // Oppdater når bruker kommer tilbake til siden
    staleTime: 0, // Alltid hent fresh data
    gcTime: 0, // Ikke cache data (v5 syntax)
  });

  const formatCurrency = (amount: number, currency: string = 'NOK') => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <AppShell title="Abonnement" subtitle="Oversikt over abonnement og lisenser">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !subscription) {
    return (
      <AppShell title="Abonnement" subtitle="Oversikt over abonnement og lisenser">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Kunne ikke laste abonnementsinformasjon
              </h3>
              <p className="text-gray-500">
                Det oppstod en feil ved henting av abonnementsinformasjon.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Abonnement" subtitle="Oversikt over abonnement og lisenser">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Abonnement</h1>
            <p className="mt-1 text-sm text-gray-600">
              Oversikt over abonnement og lisenser for periode {subscription.period}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800 w-fit">
            Aktiv abonnement
          </Badge>
        </div>

        {/* Subscription Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main License */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-building text-blue-600 mr-2"></i>
                Hovedlisens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{subscription.mainLicense.description}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(subscription.mainLicense.amount, subscription.mainLicense.currency)}
                </p>
                <p className="text-xs text-gray-500">per måned</p>
              </div>
            </CardContent>
          </Card>

          {/* User Licenses */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-users text-purple-600 mr-2"></i>
                Brukerlisenser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{subscription.userLicenses.description}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(subscription.userLicenses.amount, subscription.userLicenses.currency)}
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>{formatCurrency(subscription.userLicenses.unitPrice)} × {subscription.userLicenses.quantity} brukere</p>
                  <p>per måned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-calculator text-green-600 mr-2"></i>
                Total kostnad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Månedlig kostnad</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(subscription.total.amount, subscription.total.currency)}
                </p>
                <p className="text-xs text-gray-500">per måned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-list text-gray-600 mr-2"></i>
              Kostnadsfordeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{subscription.mainLicense.description}</p>
                  <p className="text-sm text-gray-500">Grunnleggende tilgang til RegnskapsAI</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(subscription.mainLicense.amount)}
                  </p>
                  <p className="text-sm text-gray-500">1 × {formatCurrency(subscription.mainLicense.amount)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{subscription.userLicenses.description}</p>
                  <p className="text-sm text-gray-500">Tilgang for individuelle brukere</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(subscription.userLicenses.amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {subscription.userLicenses.quantity} × {formatCurrency(subscription.userLicenses.unitPrice)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Total månedlig kostnad</p>
                  <p className="text-sm text-gray-500">Alle lisenser inkludert</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(subscription.total.amount)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-cog text-gray-600 mr-2"></i>
              Administrasjon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1">
                <i className="fas fa-users mr-2"></i>
                Administrer ansatte
              </Button>
              <Button variant="outline" className="flex-1">
                <i className="fas fa-file-invoice mr-2"></i>
                Se fakturahistorikk
              </Button>
              <Button variant="outline" className="flex-1">
                <i className="fas fa-download mr-2"></i>
                Last ned kvittering
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <i className="fas fa-info-circle text-blue-600 mt-1"></i>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Abonnementsinformasjon</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Ditt abonnement fornyes automatisk hver måned. Brukerlisenser beregnes basert på antall aktive ansatte.
                </p>
                <p className="text-sm text-blue-800">
                  Har du spørsmål om faktureringen? Kontakt oss på 
                  <a href="mailto:support@zaldo.no" className="font-semibold hover:underline ml-1">
                    support@zaldo.no
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}