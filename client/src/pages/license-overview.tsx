import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, AlertTriangle, Crown } from 'lucide-react';

interface TenantLicense {
  tenantId: string;
  tenantName: string;
  orgNumber?: string;
  plan: string;
  seatUsage: number;
  employeeLimit: number;
  status: string;
  monthlyAmount: number;
  validTo?: string;
  createdAt: string;
}

interface SystemSubscriptionsResponse {
  totalTenants: number;
  subscriptions: TenantLicense[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'trial': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'suspended': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPlanColor = (plan: string) => {
  switch (plan) {
    case 'basic': return 'bg-gray-100 text-gray-800';
    case 'premium': return 'bg-blue-100 text-blue-800';
    case 'enterprise': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSeatUsageColor = (usage: number, limit: number) => {
  const percentage = (usage / limit) * 100;
  if (percentage >= 90) return 'text-red-600 font-bold';
  if (percentage >= 75) return 'text-amber-600 font-medium';
  return 'text-gray-900';
};

const isSeatWarningNeeded = (usage: number, limit: number) => {
  return (usage / limit) >= 0.9;
};

export default function LicenseOverview() {
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery<SystemSubscriptionsResponse>({
    queryKey: ['/api/system/subscriptions'],
    refetchInterval: 30000, // Auto refresh every 30 seconds
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

  const calculateDaysUntilExpiry = (validTo?: string) => {
    if (!validTo) return null;
    const today = new Date();
    const expiry = new Date(validTo);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Calculate statistics
  const totalSeatsUsed = data?.subscriptions.reduce((sum, sub) => sum + sub.seatUsage, 0) || 0;
  const totalSeatsAvailable = data?.subscriptions.reduce((sum, sub) => sum + sub.employeeLimit, 0) || 0;
  const totalMonthlyRevenue = data?.subscriptions.reduce((sum, sub) => 
    sub.status === 'active' ? sum + sub.monthlyAmount : sum, 0
  ) || 0;
  const activeCustomers = data?.subscriptions.filter(s => s.status === 'active').length || 0;
  const warningCustomers = data?.subscriptions.filter(s => isSeatWarningNeeded(s.seatUsage, s.employeeLimit)).length || 0;

  const handleRowClick = (tenantId: string) => {
    // Navigate to tenant detail view - would need to implement this
    toast({
      title: "Tenant detaljer",
      description: `Navigering til detaljer for tenant ${tenantId} - ikke implementert ennå`,
    });
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="container mx-auto py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lisensoversikt</h1>
              <p className="text-gray-600">System administrator oversikt over alle lisenser</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total kunder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{data?.totalTenants || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Alle tenants i systemet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Aktive kunder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
              <p className="text-xs text-gray-500 mt-1">Med aktive abonnement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Lisensbruk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalSeatsUsed} / {totalSeatsAvailable}
              </div>
              <p className="text-xs text-gray-500 mt-1">Brukte av tilgjengelige lisenser</p>
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

        {/* Warning for customers approaching seat limits */}
        {warningCustomers > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Advarsel: Lisensgrense nærmer seg</p>
                  <p className="text-sm text-amber-700">
                    {warningCustomers} kunde{warningCustomers !== 1 ? 'r' : ''} bruker 90% eller mer av sine tilgjengelige lisenser
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* License Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lisensoversikt per kunde</CardTitle>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-500">{data?.totalTenants || 0} kunder</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Selskap</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Lisenser brukt / grense</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Månedlig beløp</TableHead>
                    <TableHead>Utløper</TableHead>
                    <TableHead>Opprettet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.subscriptions?.map((subscription) => {
                    const needsWarning = isSeatWarningNeeded(subscription.seatUsage, subscription.employeeLimit);
                    const daysUntilExpiry = calculateDaysUntilExpiry(subscription.validTo);
                    
                    return (
                      <TableRow 
                        key={subscription.tenantId}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRowClick(subscription.tenantId)}
                        data-testid={`tenant-row-${subscription.tenantId}`}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{subscription.tenantName}</div>
                            {subscription.orgNumber && (
                              <div className="text-sm text-gray-500">{subscription.orgNumber}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPlanColor(subscription.plan)}>
                            {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={getSeatUsageColor(subscription.seatUsage, subscription.employeeLimit)}>
                              {subscription.seatUsage} / {subscription.employeeLimit}
                            </span>
                            {needsWarning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          </div>
                          <div className="text-sm text-gray-500">
                            {Math.round((subscription.seatUsage / subscription.employeeLimit) * 100)}% benyttet
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(subscription.status)}>
                            {subscription.status === 'trial' && 'Prøveperiode'}
                            {subscription.status === 'active' && 'Aktiv'}
                            {subscription.status === 'suspended' && 'Suspendert'}
                            {subscription.status === 'cancelled' && 'Kansellert'}
                            {subscription.status === 'error' && 'Feil'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold">{formatCurrency(subscription.monthlyAmount)}</div>
                        </TableCell>
                        <TableCell>
                          {subscription.validTo && daysUntilExpiry !== null ? (
                            <div>
                              <div className="text-sm">{formatDate(subscription.validTo)}</div>
                              <div className={`text-xs ${daysUntilExpiry < 30 ? 'text-red-600' : 'text-gray-500'}`}>
                                {daysUntilExpiry} dager igjen
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(subscription.createdAt)}</TableCell>
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