import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ui/protected-route";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Tasks from "@/pages/tasks";
import AIAssistant from "@/pages/ai-assistant";
import Subscriptions from "@/pages/subscriptions";
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
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <Dashboard />} />
      <Route path="/dashboard" component={() => <Dashboard />} />
      
      <Route 
        path="/clients" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern']}>
            <Clients />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/tasks" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern']}>
            <Tasks />
          </ProtectedRoute>
        )} 
      />
      
      <Route 
        path="/ai-assistant" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin', 'oppdragsansvarlig', 'regnskapsfører', 'intern']}>
            <AIAssistant />
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

      <Route component={NotFound} />
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
