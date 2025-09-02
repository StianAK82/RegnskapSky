import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ui/protected-route";

// Pages
import Login from "@/pages/login";
import Setup2FA from "@/pages/setup-2fa";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import ClientTasksOverview from "@/pages/client-tasks-overview";
import Employees from "@/pages/employees";
import Tasks from "@/pages/tasks";
import Timer from "@/pages/timer";
import AIAssistant from "@/pages/ai-assistant";
import Reports from "@/pages/reports";
import Documents from "@/pages/documents";
import Subscriptions from "@/pages/subscriptions";
import Subscribe from "@/pages/subscribe";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import OwnerDashboard from "@/pages/OwnerDashboard";
import Billing from "@/pages/Billing";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/setup-2fa" component={Setup2FA} />
        <Route path="/" component={Login} />
        <Route path="/dashboard" component={Login} />
        <Route path="/:rest*" component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <Dashboard />} />
      <Route path="/dashboard" component={() => <Dashboard />} />
      
      <Route 
        path="/clients" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Clients />
          </ProtectedRoute>
        )} 
      />

      <Route 
        path="/clients/:id" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <ClientDetail />
          </ProtectedRoute>
        )} 
      />

      <Route 
        path="/client-tasks-overview" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <ClientTasksOverview />
          </ProtectedRoute>
        )} 
      />

      <Route 
        path="/employees" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Employees />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/tasks" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Tasks />
          </ProtectedRoute>
        )} 
      />

      <Route 
        path="/timetracking" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Timer />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/ai-assistant" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <AIAssistant />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/reports" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Reports />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/documents" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Documents />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/documents-fixed" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <DocumentsClean />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/documents-test" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <DocumentsSimple />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/documenter" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Documents />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/subscriptions" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Subscriptions />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/subscribe" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'ansatt']}>
            <Subscribe />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/admin/subscriptions" 
        component={() => (
          <ProtectedRoute allowedRoles={['lisensadmin']}>
            <AdminSubscriptions />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/norwegian-features" 
        component={() => {
          const NorwegianFeatures = lazy(() => import("./pages/norwegian-features"));
          return (
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            }>
              <NorwegianFeatures />
            </Suspense>
          );
        }} 
      />
      
      <Route 
        path="/owner/dashboard" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <OwnerDashboard />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/billing" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Billing />
          </ProtectedRoute>
        )} 
      />

      <Route path="/:rest*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AuthenticatedRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
