import { useAuth } from '@/hooks/use-auth';
import { ReactNode } from 'react';

interface DebugProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function DebugProtectedRoute({ children, allowedRoles }: DebugProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  console.log('DebugProtectedRoute:', {
    isLoading,
    user,
    userRole: user?.role,
    allowedRoles,
    hasUser: !!user,
    roleCheck: allowedRoles ? allowedRoles.includes(user?.role || '') : true
  });

  if (isLoading) {
    console.log('ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="ml-2">Loading auth...</p>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to login');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">No User</h1>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('ProtectedRoute: Role check failed', {
      userRole: user.role,
      allowedRoles,
      includes: allowedRoles.includes(user.role)
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">ACCESS DENIED</h1>
          <p className="text-gray-600">Your role: {user.role}</p>
          <p className="text-gray-600">Required roles: {allowedRoles.join(', ')}</p>
          <p className="text-gray-600">Role match: {allowedRoles.includes(user.role) ? 'YES' : 'NO'}</p>
        </div>
      </div>
    );
  }

  console.log('ProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
}