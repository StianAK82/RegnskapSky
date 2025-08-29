import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Invoice {
  id: string;
  tenantId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  invoiceDate: string;
  description: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export default function Billing() {
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    customerEmail: '',
    amount: 799,
    description: 'RegnskapsAI - Månedlig abonnement',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/billing/invoices'],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (invoice: any) => apiRequest('POST', '/api/billing/invoices', invoice),
    onSuccess: () => {
      toast({
        title: 'Faktura opprettet',
        description: 'Fakturaen er sendt til kunden',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/invoices'] });
      setIsCreateInvoiceOpen(false);
      setNewInvoice({
        customerName: '',
        customerEmail: '',
        amount: 799,
        description: 'RegnskapsAI - Månedlig abonnement',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved opprettelse',
        description: error.message || 'Kunne ikke opprette faktura',
        variant: 'destructive',
      });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => apiRequest('POST', `/api/billing/invoices/${invoiceId}/send`),
    onSuccess: () => {
      toast({
        title: 'Faktura sendt',
        description: 'Fakturaen er sendt til kunden',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/invoices'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Betalt</Badge>;
      case 'sent':
        return <Badge variant="secondary">Sendt</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Forfalt</Badge>;
      case 'draft':
        return <Badge variant="outline">Utkast</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fakturering</h1>
          <p className="text-gray-600 mt-2">Håndter fakturaer og betalinger for nye kunder</p>
        </div>
        
        <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-blue-700">
              <i className="fas fa-plus mr-2"></i>
              Ny Faktura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Opprett ny faktura</DialogTitle>
              <DialogDescription>
                Send faktura til ny kunde for RegnskapsAI-abonnement
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customerName" className="text-right">Kunde</Label>
                <Input
                  id="customerName"
                  value={newInvoice.customerName}
                  onChange={(e) => setNewInvoice({...newInvoice, customerName: e.target.value})}
                  className="col-span-3"
                  placeholder="Firmanavn"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customerEmail" className="text-right">E-post</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={newInvoice.customerEmail}
                  onChange={(e) => setNewInvoice({...newInvoice, customerEmail: e.target.value})}
                  className="col-span-3"
                  placeholder="kunde@firma.no"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Beløp</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({...newInvoice, amount: Number(e.target.value)})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">Forfallsdato</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={() => createInvoiceMutation.mutate(newInvoice)}
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fas fa-paper-plane mr-2"></i>
                )}
                Send Faktura
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Fakturaer</CardTitle>
            <i className="fas fa-file-invoice text-blue-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Betalte Fakturaer</CardTitle>
            <i className="fas fa-check-circle text-green-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter(inv => inv.status === 'paid').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utestående</CardTitle>
            <i className="fas fa-clock text-orange-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verdi</CardTitle>
            <i className="fas fa-money-bill text-purple-600"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices ? `${invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString('nb-NO')} kr` : '0 kr'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Fakturaer</CardTitle>
          <CardDescription>
            Oversikt over alle sendte fakturaer og deres status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-file-invoice text-blue-600"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">{invoice.customerName}</h4>
                      <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                      <p className="text-xs text-gray-500">{invoice.description}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(invoice.status)}
                      <span className="font-medium text-lg">
                        {invoice.amount.toLocaleString('nb-NO')} kr
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Forfaller: {new Date(invoice.dueDate).toLocaleDateString('nb-NO')}
                    </div>
                    {invoice.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <i className="fas fa-paper-plane mr-1"></i>
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-file-invoice text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen fakturaer ennå</h3>
              <p className="text-gray-600 mb-4">Opprett din første faktura for en ny kunde</p>
              <Button onClick={() => setIsCreateInvoiceOpen(true)}>
                <i className="fas fa-plus mr-2"></i>
                Opprett Faktura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}