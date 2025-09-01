import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function Setup2FA() {
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    tenantName: '',
  });
  const [isExisting, setIsExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleUserInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo),
      });

      const data = await response.json();

      if (response.ok) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setIsExisting(data.isExisting);
        if (data.isExisting) {
          setUserInfo(prev => ({
            ...prev,
            firstName: data.firstName || '',
            lastName: data.lastName || ''
          }));
        }
        setStep(2);
      } else {
        toast({
          title: 'Feil',
          description: data.message || 'Kunne ikke sette opp 2FA',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke sette opp 2FA',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userInfo.email,
          token: verificationCode,
          secret: secret,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          tenantName: userInfo.tenantName,
          isExisting: isExisting,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBackupCodes(data.backupCodes);
        setStep(3);
      } else {
        toast({
          title: 'Feil',
          description: data.message || 'Ugyldig kode',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke verifisere kode',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const downloadBackupCodes = () => {
    const content = `RegnskapsAI Backup Codes\n\nEmail: ${userInfo.email}\nGenerert: ${new Date().toLocaleDateString('no-NO')}\n\nBackup codes (bruk hver kun én gang):\n${backupCodes.join('\n')}\n\nHold disse kodene sikre og tilgjengelige!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regnskapsai-backup-codes-${userInfo.email}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sett opp 2-faktor autentisering</CardTitle>
            <p className="text-gray-600">
              Opprett ny konto eller aktiver 2FA for eksisterende konto
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUserInfoSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={userInfo.email}
                  onChange={handleInputChange}
                  placeholder="Skriv din e-postadresse først"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hvis du har eksisterende konto vil 2FA bli lagt til. Ellers opprettes ny konto.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Fornavn</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={userInfo.firstName}
                    onChange={handleInputChange}
                    placeholder="Kun for nye kontoer"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Etternavn</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={userInfo.lastName}
                    onChange={handleInputChange}
                    placeholder="Kun for nye kontoer"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tenantName">Firmanavn</Label>
                <Input
                  id="tenantName"
                  name="tenantName"
                  type="text"
                  value={userInfo.tenantName}
                  onChange={handleInputChange}
                  placeholder="Kun for nye kontoer"
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
                onClick={() => navigate('/login')}
                className="text-primary hover:text-blue-700 text-sm"
              >
                Allerede konto? Logg inn her
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
            <CardTitle className="text-2xl font-bold">Scan QR-kode</CardTitle>
            <p className="text-gray-600">
              Bruk Google Authenticator eller lignende app
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <div 
                className="mx-auto mb-4 bg-white p-4 rounded-lg inline-block"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <p className="text-sm text-gray-600 mb-4">
                Kan ikke scanne? Skriv inn denne koden manuelt:
              </p>
              <code className="bg-gray-100 p-2 rounded text-sm break-all">
                {secret}
              </code>
            </div>

            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <Label htmlFor="verificationCode">6-sifret kode fra appen</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
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
                Verifiser
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Backup-koder</CardTitle>
            <p className="text-gray-600">
              Lagre disse kodene på et trygt sted
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">Viktig!</h3>
              <p className="text-sm text-yellow-700">
                Disse kodene kan brukes hvis du mister tilgang til authenticator-appen. 
                Hver kode kan kun brukes én gang.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code key={index} className="bg-gray-100 p-2 rounded text-sm text-center">
                  {code}
                </code>
              ))}
            </div>

            <div className="space-y-2">
              <Button 
                onClick={downloadBackupCodes}
                className="w-full"
                variant="outline"
              >
                <i className="fas fa-download mr-2"></i>
                Last ned backup-koder
              </Button>

              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-blue-700"
              >
                Ferdig - Gå til innlogging
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}