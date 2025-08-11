import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionPlan {
  name: string;
  price: number;
  period: string;
  features: string[];
  recommended?: boolean;
}

const plans: SubscriptionPlan[] = [
  {
    name: 'Basic',
    price: 299,
    period: 'måned',
    features: [
      'Opptil 10 klienter',
      'Grunnleggende regnskapsføring',
      'AI-assistert dokumentkategorisering',
      'E-post support',
      'Tripletex/Fiken integrasjon'
    ]
  },
  {
    name: 'Professional',
    price: 599,
    period: 'måned',
    features: [
      'Opptil 50 klienter',
      'Avansert regnskapsføring',
      'AI-konteringsforslag',
      'Automatisk timeføring',
      'Prioritert support',
      'Alle integrasjoner',
      'Avanserte rapporter'
    ],
    recommended: true
  },
  {
    name: 'Enterprise',
    price: 1199,
    period: 'måned',
    features: [
      'Ubegrenset antall klienter',
      'Full regnskapssuite',
      'Avansert AI-analyse',
      'Flertenant støtte',
      'Dedikert account manager',
      'API-tilgang',
      'Egendefinerte integrasjoner'
    ]
  }
];

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/subscriptions',
      },
    });

    if (error) {
      toast({
        title: "Betalingsfeil",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Betaling vellykket",
        description: "Ditt abonnement er nå aktivt!",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-primary hover:bg-blue-700"
      >
        {isProcessing ? (
          <i className="fas fa-spinner fa-spin mr-2"></i>
        ) : (
          <i className="fas fa-credit-card mr-2"></i>
        )}
        {isProcessing ? 'Behandler...' : 'Bekreft abonnement'}
      </Button>
    </form>
  );
}

function SubscriptionCheckout() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const startSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/create-subscription");
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke starte abonnementsprosess',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start ditt abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Klikk på knappen nedenfor for å starte abonnementsprosessen.
          </p>
          <Button 
            onClick={startSubscription}
            disabled={isLoading}
            className="bg-primary hover:bg-blue-700"
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-arrow-right mr-2"></i>
            )}
            Start abonnement
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betalingsinformasjon</CardTitle>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm />
        </Elements>
      </CardContent>
    </Card>
  );
}

export default function Subscriptions() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Mock current subscription data - in real app this would come from API
  const currentSubscription = {
    plan: 'Professional',
    status: 'active',
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    amount: 599
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="Abonnement" 
          subtitle="Administrer ditt abonnement og fakturering" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Current Subscription Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Nåværende abonnement</span>
                <Badge className={currentSubscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {currentSubscription.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <p className="text-lg font-semibold">{currentSubscription.plan}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Månedlig pris</label>
                  <p className="text-lg font-semibold">
                    {currentSubscription.amount.toLocaleString('nb-NO', {
                      style: 'currency',
                      currency: 'NOK'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Neste fakturering</label>
                  <p className="text-lg font-semibold">
                    {currentSubscription.nextBilling.toLocaleDateString('nb-NO')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Velg abonnement</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.name}
                  className={`relative cursor-pointer transition-all ${
                    selectedPlan === plan.name 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : 'hover:shadow-md'
                  } ${plan.recommended ? 'border-primary' : ''}`}
                  onClick={() => setSelectedPlan(plan.name)}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-white">Anbefalt</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">
                        {plan.price.toLocaleString('nb-NO')}
                      </span>
                      <span className="text-gray-600"> kr/{plan.period}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <i className="fas fa-check text-green-500 mt-1 mr-3"></i>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full mt-6 ${
                        selectedPlan === plan.name 
                          ? 'bg-primary hover:bg-blue-700' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedPlan(plan.name)}
                    >
                      {currentSubscription.plan === plan.name ? 'Nåværende plan' : 'Velg plan'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Checkout Section */}
          {selectedPlan && selectedPlan !== currentSubscription.plan && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ordresammendrag</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Plan:</span>
                      <span className="font-semibold">{selectedPlan}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Månedlig pris:</span>
                      <span className="font-semibold">
                        {plans.find(p => p.name === selectedPlan)?.price.toLocaleString('nb-NO', {
                          style: 'currency',
                          currency: 'NOK'
                        })}
                      </span>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>
                          {plans.find(p => p.name === selectedPlan)?.price.toLocaleString('nb-NO', {
                            style: 'currency',
                            currency: 'NOK'
                          })} / måned
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>• Faktureres månedlig</p>
                      <p>• Kan avbrytes når som helst</p>
                      <p>• 14 dagers gratis prøveperiode</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <SubscriptionCheckout />
            </div>
          )}

          {/* Billing History */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Fakturahistorikk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock billing history */}
                {[
                  { date: '2024-01-01', amount: 599, status: 'Betalt', plan: 'Professional' },
                  { date: '2023-12-01', amount: 599, status: 'Betalt', plan: 'Professional' },
                  { date: '2023-11-01', amount: 299, status: 'Betalt', plan: 'Basic' },
                ].map((invoice, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                    <div>
                      <p className="font-medium">{invoice.plan}</p>
                      <p className="text-sm text-gray-600">{new Date(invoice.date).toLocaleDateString('nb-NO')}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">
                        {invoice.amount.toLocaleString('nb-NO', {
                          style: 'currency',
                          currency: 'NOK'
                        })}
                      </p>
                      <Badge className="bg-green-100 text-green-800">{invoice.status}</Badge>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <i className="fas fa-download mr-1"></i>
                      Last ned
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
