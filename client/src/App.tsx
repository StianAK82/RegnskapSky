import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Employees from "@/pages/employees";
import Tasks from "@/pages/tasks";
import AIAssistant from "@/pages/ai-assistant";
import Reports from "@/pages/reports";
import Subscriptions from "@/pages/subscriptions";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  // Direkte tilgang til dashboard uten innlogging
  return (
    <Switch>
      <Route path="/" component={() => <Dashboard />} />
      <Route path="/dashboard" component={() => <Dashboard />} />
      <Route path="/clients" component={() => <Clients />} />
      <Route path="/clients/:id" component={() => <ClientDetail />} />
      <Route path="/employees" component={() => <Employees />} />
      <Route path="/tasks" component={() => <Tasks />} />
      <Route path="/ai-assistant" component={() => <AIAssistant />} />
      <Route path="/reports" component={() => <Reports />} />
      <Route path="/subscriptions" component={() => <Subscriptions />} />
      
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

      <Route path="/:rest*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRoutes />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
