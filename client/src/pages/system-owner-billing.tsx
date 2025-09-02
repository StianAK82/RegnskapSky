import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface TenantBilling {
  id: string;
  name: string;
  orgNumber?: string;
  email?: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  monthlyRate: number;
  licensedUsers: number;
  totalMonthlyAmount: number;
  trialStartDate: string;
  trialEndDate?: string;
  lastBilledDate?: string;
  createdAt: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'trial': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'suspended': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function SystemOwnerBilling() {
  const { toast } = useToast();
  
  const { data: tenants, isLoading } = useQuery<TenantBilling[]>({
    queryKey: ['/api/system-owner/billing'],
    refetchInterval: 30000, // Automatisk oppdatering hvert 30. sekund
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO');
  };

  const calculateTrialDaysLeft = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const totalMonthlyRevenue = tenants?.reduce((sum, tenant) => 
    tenant.subscriptionStatus === 'active' ? sum + tenant.totalMonthlyAmount : sum, 0
  ) || 0;

  const activeCustomers = tenants?.filter(t => t.subscriptionStatus === 'active').length || 0;
  const trialCustomers = tenants?.filter(t => t.subscriptionStatus === 'trial').length || 0;

  if (isLoading) {
    return (
      <AppShell title="Systemfakturering" subtitle="Oversikt over alle kunder og fakturering">
        <div className="max-w-7xl mx-auto space-y-6">
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

  return (
    <AppShell title="Systemfakturering" subtitle="Oversikt over alle kunder og fakturering - KUN for systemeier">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Sammendrag */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Aktive kunder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
              <p className="text-xs text-gray-500 mt-1">Betalende abonnenter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Prøveperiode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{trialCustomers}</div>
              <p className="text-xs text-gray-500 mt-1">Kunder i prøveperiode</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Månedlig inntekt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalMonthlyRevenue)}</div>
              <p className="text-xs text-gray-500 mt-1">Fra aktive abonnenter</p>
            </CardContent>
          </Card>
        </div>

        {/* Kundetabell */}
        <Card>
          <CardHeader>
            <CardTitle>Alle kunder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bedrift</TableHead>
                    <TableHead>Org.nr</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lisenser</TableHead>
                    <TableHead>Månedlig beløp</TableHead>
                    <TableHead>Opprettet</TableHead>
                    <TableHead>Prøveperiode</TableHead>
                    <TableHead>Sist fakturert</TableHead>
                    <TableHead>Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants?.map((tenant) => {
                    const trialDaysLeft = calculateTrialDaysLeft(tenant.trialEndDate);
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            {tenant.email && (
                              <div className="text-sm text-gray-500">{tenant.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tenant.orgNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(tenant.subscriptionStatus)}>
                            {tenant.subscriptionStatus === 'trial' && 'Prøveperiode'}
                            {tenant.subscriptionStatus === 'active' && 'Aktiv'}
                            {tenant.subscriptionStatus === 'suspended' && 'Suspendert'}
                            {tenant.subscriptionStatus === 'cancelled' && 'Kansellert'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tenant.licensedUsers} brukere</div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(799)} grunnpris + {tenant.licensedUsers} × {formatCurrency(500)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold">{formatCurrency(tenant.totalMonthlyAmount)}</div>
                        </TableCell>
                        <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                        <TableCell>
                          {tenant.subscriptionStatus === 'trial' && trialDaysLeft !== null ? (
                            <div className={`text-sm ${trialDaysLeft <= 7 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              {trialDaysLeft > 0 ? `${trialDaysLeft} dager igjen` : 'Utløpt'}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tenant.lastBilledDate ? formatDate(tenant.lastBilledDate) : (
                            <span className="text-gray-400">Ikke fakturert</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-view-details-${tenant.id}`}
                            >
                              <i className="fas fa-eye mr-1"></i>
                              Detaljer
                            </Button>
                            {tenant.subscriptionStatus === 'trial' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                data-testid={`button-activate-${tenant.id}`}
                              >
                                <i className="fas fa-credit-card mr-1"></i>
                                Aktiver
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}