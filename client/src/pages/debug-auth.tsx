import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

export default function DebugAuth() {
  const { user, token, isLoading } = useAuth();
  const [localStorageInfo, setLocalStorageInfo] = useState<any>({});

  useEffect(() => {
    // Check localStorage contents
    const storageInfo = {
      token: localStorage.getItem('token'),
      auth_token: localStorage.getItem('auth_token'),
      user: localStorage.getItem('user'),
      allKeys: Object.keys(localStorage)
    };
    setLocalStorageInfo(storageInfo);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Auth Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">useAuth Hook Status:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  {JSON.stringify({ 
                    isLoading, 
                    hasUser: !!user, 
                    hasToken: !!token,
                    userRole: user?.role,
                    userEmail: user?.email
                  }, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">localStorage Contents:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  {JSON.stringify(localStorageInfo, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">User Object:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">Required Roles for Pages:</h3>
                <ul className="list-disc pl-4">
                  <li>/clients: ['admin', 'ansatt']</li>
                  <li>/employees: ['admin', 'ansatt']</li>
                  <li>/tasks: ['admin', 'ansatt']</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold">Available Roles in System:</h3>
                <p>admin, ansatt, oppdragsansvarlig, regnskapsfører, intern, lisensadmin</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}