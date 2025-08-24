import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  startDate: string;
  salary?: number;
}

export default function WorkingEmployees() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  console.log('WorkingEmployees data:', { employees, isLoading, count: employees?.length });

  const filteredEmployees = employees.filter(employee =>
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSalary = (salary?: number) => {
    if (!salary) return 'Ikke oppgitt';
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
    }).format(salary);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64 overflow-hidden">
          <TopBar title="Ansatte" subtitle="Laster ansattdata..." />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="Ansatte" 
          subtitle={`${employees.length} registrerte ansatte`}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Søk etter ansatte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
              data-testid="input-search-employees"
            />
          </div>

          {/* Employee Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {employee.firstName} {employee.lastName}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{employee.position}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>E-post:</strong> {employee.email}
                    </p>
                    {employee.phone && (
                      <p className="text-sm">
                        <strong>Telefon:</strong> {employee.phone}
                      </p>
                    )}
                    {employee.department && (
                      <p className="text-sm">
                        <strong>Avdeling:</strong> {employee.department}
                      </p>
                    )}
                    <p className="text-sm">
                      <strong>Startdato:</strong> {formatDate(employee.startDate)}
                    </p>
                    <p className="text-sm">
                      <strong>Lønn:</strong> {formatSalary(employee.salary)}
                    </p>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-view-employee-${employee.id}`}
                    >
                      Se detaljer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-edit-employee-${employee.id}`}
                    >
                      Rediger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm ? 'Ingen ansatte funnet' : 'Ingen ansatte registrert'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}