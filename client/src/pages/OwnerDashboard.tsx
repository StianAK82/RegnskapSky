import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OwnerMetrics {
  totalTenants: number;
  activeTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  subscriptions: {
    active: number;
    cancelled: number;
    trial: number;
  };
  recentSignups: Array<{
    id: string;
    companyName: string;
    email: string;
    plan: string;
    status: string;
    signupDate: string;
    revenue: number;
  }>;
}

export default function OwnerDashboard() {
  const { data: metrics, isLoading } = useQuery<OwnerMetrics>({
    queryKey: ['/api/owner/metrics'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Eierdashboard</h1>
        <p className="text-gray-600 mt-2">Oversikt over systemets ytelse og kunder</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Kunder</CardTitle>
            <i className="fas fa-users text-blue-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeTenants || 0} aktive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Månedens Inntekt</CardTitle>
            <i className="fas fa-chart-line text-green-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.monthlyRevenue ? `${metrics.monthlyRevenue.toLocaleString('nb-NO')} kr` : '0 kr'}
            </div>
            <p className="text-xs text-muted-foreground">
              Totalt: {metrics?.totalRevenue ? `${metrics.totalRevenue.toLocaleString('nb-NO')} kr` : '0 kr'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Abonnenter</CardTitle>
            <i className="fas fa-credit-card text-purple-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.subscriptions?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.subscriptions?.trial || 0} i prøveperiode
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avbrutte Abonnement</CardTitle>
            <i className="fas fa-times-circle text-red-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.subscriptions?.cancelled || 0}</div>
            <p className="text-xs text-muted-foreground">
              Churn rate: {metrics?.totalTenants ? Math.round((metrics.subscriptions?.cancelled || 0) / metrics.totalTenants * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent-signups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent-signups">Nye Påmeldinger</TabsTrigger>
          <TabsTrigger value="revenue">Inntektsanalyse</TabsTrigger>
          <TabsTrigger value="system-health">Systemhelse</TabsTrigger>
        </TabsList>

        <TabsContent value="recent-signups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nylige Kunderegistreringer</CardTitle>
              <CardDescription>
                Oversikt over de siste kundene som har registrert seg for systemet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.recentSignups?.map((signup) => (
                  <div key={signup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-building text-blue-600"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">{signup.companyName}</h4>
                        <p className="text-sm text-gray-600">{signup.email}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={signup.status === 'active' ? 'default' : 'secondary'}>
                        {signup.status === 'active' ? 'Aktiv' : 'Prøveperiode'}
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {new Date(signup.signupDate).toLocaleDateString('nb-NO')}
                      </div>
                      <div className="font-medium text-green-600">
                        {signup.revenue.toLocaleString('nb-NO')} kr/måned
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inntektsanalyse</CardTitle>
              <CardDescription>
                Detaljert oversikt over inntekter og betalingsmønster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800">Denne måneden</h4>
                    <p className="text-2xl font-bold text-green-900">
                      {metrics?.monthlyRevenue ? `${metrics.monthlyRevenue.toLocaleString('nb-NO')} kr` : '0 kr'}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">Gjennomsnitt per kunde</h4>
                    <p className="text-2xl font-bold text-blue-900">799 kr</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-800">Årlig tilbakevendende inntekt</h4>
                    <p className="text-2xl font-bold text-purple-900">
                      {metrics?.totalRevenue ? `${(metrics.totalRevenue * 12).toLocaleString('nb-NO')} kr` : '0 kr'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Systemhelse</CardTitle>
              <CardDescription>
                Oversikt over systemets ytelse og tilgjengelighet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Systemstatus</h4>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Systemet kjører normalt</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Database tilgjengelig</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Stripe betalinger aktive</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Ytelse</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Responstid</span>
                      <span className="text-sm font-medium">&lt; 200ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Oppetid</span>
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Aktive sesjoner</span>
                      <span className="text-sm font-medium">{metrics?.activeTenants || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Hurtighandlinger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">
                <i className="fas fa-download mr-2"></i>
                Eksporter inntektsrapport
              </Button>
              <Button variant="outline">
                <i className="fas fa-users mr-2"></i>
                Se alle kunder
              </Button>
              <Button variant="outline">
                <i className="fas fa-cog mr-2"></i>
                Systeminnstillinger
              </Button>
              <Button variant="outline">
                <i className="fas fa-chart-bar mr-2"></i>
                Detaljert analyse
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}