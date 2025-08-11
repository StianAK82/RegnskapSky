import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'fas fa-tachometer-alt', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern', 'lisensadmin'] },
    { name: 'Klienter', href: '/clients', icon: 'fas fa-users', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern'] },
    { name: 'Ansatte', href: '/employees', icon: 'fas fa-user-tie', roles: ['admin', 'oppdragsansvarlig'] },
    { name: 'Oppgaver', href: '/tasks', icon: 'fas fa-tasks', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern'] },
    { name: 'Rapporter', href: '/reports', icon: 'fas fa-chart-bar', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører'] },
    { name: 'Timeføring', href: '/timetracking', icon: 'fas fa-clock', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern'] },
    { name: 'Dokumenter', href: '/documents', icon: 'fas fa-file-invoice', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører'] },
    { name: 'AI-Assistent', href: '/ai-assistant', icon: 'fas fa-robot', roles: ['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern'] },
  ];

  const adminNavigation = [
    { name: 'Lisensadmin', href: '/license-admin', icon: 'fas fa-shield-alt', roles: ['admin', 'lisensadmin'] },
    { name: 'Abonnement', href: '/subscriptions', icon: 'fas fa-credit-card', roles: ['admin'] },
    { name: 'Integrasjoner', href: '/integrations', icon: 'fas fa-plug', roles: ['admin'] },
  ];

  const isActive = (href: string) => location === href;
  const canAccess = (roles: string[]) => user && roles.includes(user.role);

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200">
      {/* Logo/Brand Section */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-calculator text-white text-sm"></i>
          </div>
          <span className="text-xl font-bold text-gray-900">RegnskapsAI</span>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-gray-600"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            canAccess(item.roles) && (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.href)
                    ? "text-primary bg-blue-50 border-r-2 border-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <i className={`${item.icon} w-5 h-5 mr-3`}></i>
                {item.name}
              </Link>
            )
          ))}

          {/* Admin Only Section */}
          {(user?.role === 'admin' || user?.role === 'lisensadmin') && (
            <div className="pt-4 mt-4 border-t border-gray-200">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administrasjon
              </p>
              <div className="mt-2 space-y-1">
                {adminNavigation.map((item) => (
                  canAccess(item.roles) && (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive(item.href)
                          ? "text-primary bg-blue-50 border-r-2 border-primary"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <i className={`${item.icon} w-5 h-5 mr-3`}></i>
                      {item.name}
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>v2.1.0</span>
          <button 
            onClick={logout}
            className="text-gray-400 hover:text-gray-600"
            title="Logg ut"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
