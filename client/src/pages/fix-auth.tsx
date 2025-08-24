import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function FixAuth() {
  const [email, setEmail] = useState('stian@zaldo.no');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const clearAuth = () => {
    // Clear all possible auth keys
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.clear(); // Clear everything just in case
    
    toast({
      title: 'Auth cleared',
      description: 'All authentication data has been cleared',
    });
  };

  const testLogin = async () => {
    setIsLoading(true);
    try {
      // Clear first
      clearAuth();
      
      // Fresh login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      
      if (data.token && data.user) {
        // Store with correct keys
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast({
          title: 'Success!',
          description: `Logged in as ${data.user.email} with role: ${data.user.role}`,
        });

        // Force reload
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Auth test failed: ${response.status}`);
      }

      const user = await response.json();
      toast({
        title: 'Auth Test Success',
        description: `User: ${user.email}, Role: ${user.role}`,
      });
    } catch (error: any) {
      toast({
        title: 'Auth Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Fix Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Button onClick={clearAuth} variant="outline" className="w-full">
              Clear Auth Data
            </Button>
            
            <Button 
              onClick={testLogin} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Logging in...' : 'Fresh Login'}
            </Button>
            
            <Button onClick={testAuth} variant="secondary" className="w-full">
              Test Current Auth
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>Current localStorage keys:</p>
            <p>{Object.keys(localStorage).join(', ') || 'None'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}