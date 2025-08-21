'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth-provider'
import { Users, Building2, CheckSquare, Clock, Shield, AlertTriangle } from 'lucide-react'

export default function TenantDashboard() {
  const { user } = useAuth()
  const isLicenseAdmin = user?.role === 'LicenseAdmin'

  const { data: dashboard, isLoading } = useQuery({
    queryKey: [isLicenseAdmin ? '/dashboard/license-admin' : '/dashboard/employee'],
    queryFn: () => isLicenseAdmin ? apiClient.getLicenseAdminDashboard() : apiClient.getEmployeeDashboard(),
  })

  const { data: aiSuggestions } = useQuery({
    queryKey: ['/dashboard/ai-suggestions'],
    queryFn: () => apiClient.getAISuggestions(),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {isLicenseAdmin ? 'License Admin Dashboard' : 'Employee Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {isLicenseAdmin 
            ? 'Manage your organization and monitor operations' 
            : 'Track your tasks and time entries'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLicenseAdmin ? (
          <>
            <Card data-testid="card-clients-count">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.clientsCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active clients
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-users-count">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.usersCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.mfaCoverage?.percentage || 0}% MFA enabled
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-open-tasks">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.tasksCount?.open || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.tasksCount?.overdue || 0} overdue
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-aml-warnings">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AML Warnings</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.amlWarnings || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card data-testid="card-my-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.myClientsCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Assigned to me
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-my-tasks">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.myTasksCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active tasks
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-this-week-hours">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.myHours?.thisWeek || 0}h</div>
                <p className="text-xs text-muted-foreground">
                  Last week: {dashboard?.myHours?.lastWeek || 0}h
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-upcoming-deadlines">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deadlines</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.upcomingDeadlines?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  This week
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Intelligent insights based on your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiSuggestions.suggestions?.map((suggestion: string, index: number) => (
                <div key={index} className="p-3 bg-blue-50 rounded-md" data-testid={`ai-suggestion-${index}`}>
                  <p className="text-sm text-blue-900">{suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" data-testid="button-new-client">
              Add New Client
            </Button>
            <Button variant="outline" className="w-full" data-testid="button-new-task">
              Create Task
            </Button>
            <Button variant="outline" className="w-full" data-testid="button-log-time">
              Log Time
            </Button>
          </CardContent>
        </Card>

        {isLicenseAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" data-testid="button-manage-users">
                Manage Users
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-view-reports">
                View Reports
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-audit-logs">
                Audit Logs
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-gray-50 rounded">
                <p>Task completed: Monthly VAT</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p>New client added: Demo Corp</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p>Time logged: 3.5 hours</p>
                <p className="text-xs text-muted-foreground">2 days ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}