import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { MetricsCards } from '@/components/dashboard/metrics-cards';
import { TasksToday } from '@/components/dashboard/tasks-today';
import { NotificationsPanel } from '@/components/dashboard/notifications-panel';
import { EmployeeWorkload } from '@/components/dashboard/employee-workload';
import { ApiStatus } from '@/components/dashboard/api-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="Dashboard" 
          subtitle="Oversikt over dagens aktiviteter og oppgaver" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <MetricsCards />
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TasksToday />
            
            <div className="space-y-6">
              <NotificationsPanel />
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Hurtighandlinger</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start bg-gray-50 hover:bg-gray-100"
                    >
                      <i className="fas fa-plus-circle text-primary mr-3"></i>
                      Opprett ny klient
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start bg-gray-50 hover:bg-gray-100"
                    >
                      <i className="fas fa-upload text-primary mr-3"></i>
                      Last opp bilag
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start bg-gray-50 hover:bg-gray-100"
                    >
                      <i className="fas fa-chart-bar text-primary mr-3"></i>
                      Generer rapport
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start bg-gray-50 hover:bg-gray-100"
                    >
                      <i className="fas fa-robot text-accent mr-3"></i>
                      Spør AI-assistenten
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Employee Overview & API Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <EmployeeWorkload />
            <ApiStatus />
          </div>
        </main>
      </div>
    </div>
  );
}
