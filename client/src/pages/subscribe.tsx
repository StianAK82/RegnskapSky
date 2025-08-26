import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard',
      },
    });

    if (error) {
      toast({
        title: "Betaling feilet",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Betaling vellykket",
        description: "Du er nå abonnent!",
      });
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full"
        data-testid="button-subscribe"
      >
        {isLoading ? 'Behandler...' : 'Start abonnement'}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error creating subscription:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Oppgrader til Zaldo Pro
          </h1>
          <p className="text-xl text-gray-600">
            Få tilgang til alle avanserte funksjoner for regnskapsstyring
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Pricing Card */}
          <Card className="relative">
            <CardHeader className="text-center pb-8">
              <Badge className="w-fit mx-auto mb-4 bg-blue-100 text-blue-800">
                Mest populær
              </Badge>
              <CardTitle className="text-2xl font-bold">Zaldo Pro</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">799 kr</span>
                <span className="text-gray-600">/måned</span>
              </div>
              <p className="text-gray-600 mt-2">
                Alt du trenger for effektiv regnskapsstyring
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Ubegrenset antall klienter</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Automatisk oppgavegenerering</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>AML/KYC integrasjon med Verified.eu</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Timeregistrering og rapportering</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>AI-assistent for regnskapsspørsmål</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Direkte integrasjon med regnskapssystemer</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Altinn-integrasjon</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3" />
                  <span>Prioritert e-postsupport</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Betalingsinformasjon</CardTitle>
              <p className="text-gray-600">
                Sikker betaling behandlet av Stripe
              </p>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscribeForm />
                </Elements>
              ) : (
                <div className="text-center text-red-600">
                  <p>Kunne ikke laste betalingsskjema. Prøv å laste siden på nytt.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">✓ 30 dagers pengene-tilbake-garanti</p>
          <p className="mb-2">✓ Ingen bindingstid - si opp når som helst</p>
          <p className="mb-2">✓ Alle priser er eksklusiv MVA</p>
          <p className="text-sm">
            Ved å fortsette godtar du våre{' '}
            <a href="/terms" className="text-blue-600 hover:underline">vilkår og betingelser</a>
          </p>
        </div>
      </div>
    </div>
  );
}