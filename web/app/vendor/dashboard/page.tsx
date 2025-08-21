'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import { Building, Users, Calendar, AlertTriangle } from 'lucide-react'

export default function VendorDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['/dashboard/vendor'],
    queryFn: () => apiClient.getVendorDashboard(),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground">System-wide overview and license management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-licenses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalLicenses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.activeLicenses || 0} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all licenses
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-clients">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              Being managed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-licenses-expiring">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.licenses?.filter(l => 
                new Date(l.endsAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Licenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>License Overview</CardTitle>
          <CardDescription>
            Manage and monitor all customer licenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Company</th>
                  <th className="text-left p-4">Org Number</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Users</th>
                  <th className="text-left p-4">Clients</th>
                  <th className="text-left p-4">Expires</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.licenses?.map((license: any) => (
                  <tr key={license.id} className="border-b" data-testid={`row-license-${license.id}`}>
                    <td className="p-4 font-medium">{license.companyName}</td>
                    <td className="p-4">{license.orgNumber}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        license.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {license.employeesUsed} / {license.employeeLimit}
                    </td>
                    <td className="p-4">{license.clientsCount}</td>
                    <td className="p-4">
                      {new Date(license.endsAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" data-testid={`button-manage-${license.id}`}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}