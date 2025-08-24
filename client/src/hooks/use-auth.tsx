import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { type AuthContextType, type User, type RegisterData, type LoginResponse } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-login for development - bypass authentication
    console.log('Auth check - Auto-login enabled');
    const devUser = {
      id: 'dev-user-1',
      email: 'stian@zaldo.no',
      firstName: 'Stian',
      lastName: 'Anderssen Karlsen',
      role: 'admin',
      tenantId: 'dev-tenant-1'
    };
    
    setToken('dev-token-123');
    setUser(devUser);
    localStorage.setItem('token', 'dev-token-123');
    localStorage.setItem('user', JSON.stringify(devUser));
    console.log('Auto-login successful:', devUser.firstName, devUser.lastName);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data: LoginResponse = await response.json();
      
      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Login successful, token saved:', data.token ? data.token.substring(0, 20) + '...' : 'no token');
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (registerData: RegisterData) => {
    const response = await apiRequest('POST', '/api/auth/register', registerData);
    const data: LoginResponse = await response.json();
    
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
