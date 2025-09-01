import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    token: '',
    backupCode: '',
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok && data.exists) {
        setStep(2);
      } else {
        toast({
          title: 'Bruker ikke funnet',
          description: 'Ingen konto funnet med denne e-postadressen. Opprett en ny konto.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke sjekke bruker',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginData = {
        email: formData.email,
        token: formData.token || undefined,
        backupCode: formData.backupCode || undefined,
      };

      const response = await fetch('/api/auth/login-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('auth_token', data.token);
        toast({
          title: 'Pålogget',
          description: 'Du er nå pålogget',
        });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        toast({
          title: 'Feil',
          description: data.message || 'Pålogging feilet',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: 'Pålogging feilet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-calculator text-white text-xl"></i>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">RegnskapsAI</CardTitle>
            <p className="text-gray-600">
              Logg inn med 2-faktor autentisering
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="din@epost.no"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-blue-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : null}
                Neste
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/setup-2fa')}
                className="text-primary hover:text-blue-700 text-sm"
              >
                Har du ikke konto? Opprett en her
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">2-faktor autentisering</CardTitle>
            <p className="text-gray-600">
              Skriv inn kode fra authenticator-appen
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <Label htmlFor="token">6-sifret kode</Label>
                <Input
                  id="token"
                  name="token"
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={formData.token}
                  onChange={handleInputChange}
                  placeholder="123456"
                />
              </div>

              <div className="text-center text-sm text-gray-600">
                eller
              </div>

              <div>
                <Label htmlFor="backupCode">Backup-kode</Label>
                <Input
                  id="backupCode"
                  name="backupCode"
                  type="text"
                  value={formData.backupCode}
                  onChange={handleInputChange}
                  placeholder="Backup-kode"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-blue-700" 
                disabled={isLoading || (!formData.token && !formData.backupCode)}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : null}
                Logg inn
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-primary hover:text-blue-700 text-sm"
              >
                Tilbake til e-post
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
