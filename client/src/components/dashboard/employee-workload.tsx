import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TimeEntry {
  id: string;
  userId: string;
  hours: number;
  date: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function EmployeeWorkload() {
  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries'],
  });

  // Mock employee data - in real app this would come from API
  const employees = [
    { id: '1', firstName: 'Kari', lastName: 'Hansen', role: 'Administrator', initials: 'KH' },
    { id: '2', firstName: 'Lars', lastName: 'Eriksen', role: 'Oppdragsansvarlig', initials: 'LE' },
    { id: '3', firstName: 'Anne', lastName: 'Olsen', role: 'Regnskapsfører', initials: 'AO' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-600';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Gjenværende timer per ansatt</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.map((employee, index) => {
            // Mock data for demonstration - in real app, calculate from timeEntries
            const hoursWorked = [32.5, 28.0, 15.5][index];
            const targetHours = 40;
            const percentage = (hoursWorked / targetHours) * 100;

            return (
              <div key={employee.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">{employee.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{employee.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{hoursWorked}t</p>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getProgressColor(percentage)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
