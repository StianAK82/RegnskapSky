import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";

interface VerificationItem {
  id: string;
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'partial';
  description: string;
  filePath?: string;
  route?: string;
  implementation?: string;
}

const verificationData: VerificationItem[] = [
  // Authentication
  {
    id: 'auth-login',
    category: 'Authentication',
    name: 'Login Endpoint',
    status: 'pass',
    description: 'POST /api/auth/login implemented',
    filePath: 'server/routes.ts:82',
    implementation: 'Working'
  },
  {
    id: 'auth-reset-request',
    category: 'Authentication',
    name: 'Password Reset Request',
    status: 'fail',
    description: 'POST /api/auth/reset/request missing',
    implementation: 'Not implemented'
  },
  {
    id: 'auth-reset-confirm',
    category: 'Authentication', 
    name: 'Password Reset Confirm',
    status: 'fail',
    description: 'POST /api/auth/reset/confirm missing',
    implementation: 'Not implemented'
  },
  
  // System Owner Admin
  {
    id: 'admin-tenants-page',
    category: 'System Owner',
    name: '/admin/tenants Route',
    status: 'fail',
    description: 'Admin tenants page missing',
    implementation: 'Not implemented'
  },
  {
    id: 'admin-companies-api',
    category: 'System Owner',
    name: 'GET /api/admin/companies',
    status: 'partial',
    description: 'Licensing API exists in NestJS structure',
    filePath: 'web/lib/api.ts:71',
    implementation: 'Partial - different architecture'
  },

  // Customer Dashboard
  {
    id: 'dashboard-page',
    category: 'Dashboard',
    name: '/dashboard Route',
    status: 'pass',
    description: 'Dashboard page implemented',
    filePath: 'client/src/pages/Dashboard.tsx',
    route: '/dashboard',
    implementation: 'Working'
  },
  {
    id: 'dashboard-clients',
    category: 'Dashboard',
    name: 'Clients Section',
    status: 'pass',
    description: 'Client management implemented',
    filePath: 'client/src/pages/clients.tsx',
    route: '/clients',
    implementation: 'Working'
  },
  {
    id: 'dashboard-tasks',
    category: 'Dashboard',
    name: 'Tasks Section',
    status: 'pass',
    description: 'Task management implemented',
    filePath: 'client/src/pages/tasks.tsx',
    route: '/tasks',
    implementation: 'Working'
  },
  {
    id: 'dashboard-time-weekly',
    category: 'Dashboard',
    name: 'Timer Weekly View',
    status: 'fail',
    description: 'Weekly time view missing',
    implementation: 'Not implemented'
  },
  {
    id: 'dashboard-my-tasks',
    category: 'Dashboard',
    name: 'My Tasks Section',
    status: 'fail',
    description: 'Personal task view missing',
    implementation: 'Not implemented'
  },

  // Client Cards KYC/AML
  {
    id: 'client-kyc-badge',
    category: 'Client Cards',
    name: 'KYC Status Badge',
    status: 'partial',
    description: 'Basic KYC status in clients',
    filePath: 'client/src/pages/clients.tsx:316',
    implementation: 'Basic implementation'
  },
  {
    id: 'client-aml-badge',
    category: 'Client Cards',
    name: 'AML Status Badge',
    status: 'partial',
    description: 'Basic AML status in clients',
    filePath: 'client/src/pages/clients.tsx:316',
    implementation: 'Basic implementation'
  },
  {
    id: 'client-altinn-badge',
    category: 'Client Cards',
    name: 'Altinn Badge',
    status: 'fail',
    description: 'Altinn integration missing',
    implementation: 'Not implemented'
  },
  {
    id: 'client-kyc-route',
    category: 'Client Cards',
    name: '/clients/[id]/kyc Route',
    status: 'fail',
    description: 'Dedicated KYC page missing',
    implementation: 'Not implemented'
  },

  // Time & Approval
  {
    id: 'time-tracking',
    category: 'Time Management',
    name: 'Time Tracking',
    status: 'pass',
    description: 'Basic time tracking implemented',
    filePath: 'server/routes.ts:536',
    implementation: 'Working'
  },
  {
    id: 'time-approval',
    category: 'Time Management',
    name: 'Admin Approval',
    status: 'fail',
    description: 'Time entry approval missing',
    implementation: 'Not implemented'
  },
  {
    id: 'time-locking',
    category: 'Time Management',
    name: 'Entry Locking',
    status: 'fail',
    description: 'Time entry locking missing',
    implementation: 'Not implemented'
  },

  // RBAC & Security
  {
    id: 'rbac-system-owner',
    category: 'RBAC',
    name: 'SYSTEM_OWNER Role',
    status: 'fail',
    description: 'System owner role missing',
    implementation: 'Not implemented'
  },
  {
    id: 'rbac-company-admin',
    category: 'RBAC',
    name: 'COMPANY_ADMIN Role',
    status: 'partial',
    description: 'Admin role exists as "admin"',
    filePath: 'shared/schema.ts:8',
    implementation: 'Partial mapping'
  },
  {
    id: 'rbac-tenant-isolation',
    category: 'RBAC',
    name: 'Tenant Isolation',
    status: 'partial',
    description: 'Basic tenant filtering in routes',
    filePath: 'server/routes.ts (middleware)',
    implementation: 'Basic implementation'
  },

  // Database Model
  {
    id: 'db-companies',
    category: 'Database',
    name: 'Companies Table',
    status: 'partial',
    description: 'Using "tenants" instead of "companies"',
    filePath: 'shared/schema.ts:29',
    implementation: 'Different naming'
  },
  {
    id: 'db-password-reset',
    category: 'Database',
    name: 'Password Reset Tokens',
    status: 'fail',
    description: 'password_reset_tokens table missing',
    implementation: 'Not implemented'
  },
  {
    id: 'db-audit-logs',
    category: 'Database',
    name: 'Audit Logs',
    status: 'fail',
    description: 'audit_logs table missing',
    implementation: 'Not implemented'
  },
  {
    id: 'db-altinn-fields',
    category: 'Database',
    name: 'Altinn Fields',
    status: 'fail',
    description: 'Altinn columns missing in clients',
    implementation: 'Not implemented'
  }
];

export default function VerificationDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [auditData, setAuditData] = useState<any>(null);

  useEffect(() => {
    // Load audit data
    fetch('/scripts/audit/report.json')
      .then(res => res.json())
      .then(data => setAuditData(data))
      .catch(err => console.error('Failed to load audit data:', err));
  }, []);

  const categories = ['all', ...new Set(verificationData.map(item => item.category))];
  
  const filteredData = selectedCategory === 'all' 
    ? verificationData 
    : verificationData.filter(item => item.category === selectedCategory);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const stats = {
    pass: verificationData.filter(item => item.status === 'pass').length,
    fail: verificationData.filter(item => item.status === 'fail').length,
    partial: verificationData.filter(item => item.status === 'partial').length,
    total: verificationData.length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          RegnskapsAI - Verification Dashboard
        </h1>
        <p className="text-gray-600 mb-6">
          Development verification tool for checking implementation status against specification
        </p>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Passing</p>
                  <p className="text-2xl font-bold text-green-600">{stats.pass}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Failing</p>
                  <p className="text-2xl font-bold text-red-600">{stats.fail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Partial</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  {Math.round((stats.pass / stats.total) * 100)}%
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.pass}/{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'All Categories' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Items */}
      <div className="space-y-4">
        {filteredData.map(item => (
          <Card key={item.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      {getStatusBadge(item.status)}
                      <span className="text-sm text-gray-500">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {item.filePath && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          📁 {item.filePath}
                        </span>
                      )}
                      {item.route && (
                        <a 
                          href={item.route}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center"
                        >
                          🔗 {item.route}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                      {item.implementation && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          ⚙️ {item.implementation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Data Summary */}
      {auditData && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Audit Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Architecture</h4>
                <p className="text-sm text-gray-600">
                  Current: {auditData.architecture?.current}
                </p>
                <p className="text-sm text-gray-600">
                  Specification: {auditData.architecture?.specification}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Overall Status</h4>
                <p className="text-sm text-gray-600">
                  Pass: {auditData.overallStatus?.pass}% | 
                  Fail: {auditData.overallStatus?.fail}% | 
                  Partial: {auditData.overallStatus?.partial}%
                </p>
              </div>
            </div>
            <div className="mt-4">
              <a 
                href="/scripts/audit/report.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                📄 View Full Audit Report
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}