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
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Employees from "@/pages/employees";
import Tasks from "@/pages/tasks";
import AIAssistant from "@/pages/ai-assistant";
import Reports from "@/pages/reports";
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
    return (
      <Switch>
        <Route path="/login" component={Login} />
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
        component={() => {
          const Clients = lazy(() => import("./pages/clients"));
          const { SimpleProtectedRoute } = require("./components/ui/simple-protected-route");
          return (
            <SimpleProtectedRoute allowedRoles={['admin', 'ansatt']}>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              }>
                <Clients />
              </Suspense>
            </SimpleProtectedRoute>
          );
        }}
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
        path="/employees" 
        component={() => {
          const Employees = lazy(() => import("./pages/employees"));
          const { SimpleProtectedRoute } = require("./components/ui/simple-protected-route");
          return (
            <SimpleProtectedRoute allowedRoles={['admin', 'ansatt']}>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              }>
                <Employees />
              </Suspense>
            </SimpleProtectedRoute>
          );
        }}
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
        path="/subscriptions" 
        component={() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Subscriptions />
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

      <Route path="/debug-auth" component={() => {
        const DebugAuth = lazy(() => import("./pages/debug-auth"));
        return (
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          }>
            <DebugAuth />
          </Suspense>
        );
      }} />

      <Route path="/fix-auth" component={() => {
        const FixAuth = lazy(() => import("./pages/fix-auth"));
        return (
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          }>
            <FixAuth />
          </Suspense>
        );
      }} />

      <Route path="/test-simple" component={() => {
        const TestSimple = lazy(() => import("./pages/test-simple"));
        return (
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          }>
            <TestSimple />
          </Suspense>
        );
      }} />

      <Route path="/minimal" component={() => {
        const MinimalTest = lazy(() => import("./pages/minimal-test"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <MinimalTest />
          </Suspense>
        );
      }} />

      <Route path="/simple-clients" component={() => {
        const SimpleClients = lazy(() => import("./pages/simple-clients"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <SimpleClients />
          </Suspense>
        );
      }} />

      <Route path="/working-clients" component={() => {
        const WorkingClients = lazy(() => import("./pages/working-clients"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <WorkingClients />
          </Suspense>
        );
      }} />

      <Route path="/working-employees" component={() => {
        const WorkingEmployees = lazy(() => import("./pages/working-employees"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <WorkingEmployees />
          </Suspense>
        );
      }} />

      <Route path="/bare-clients" component={() => {
        const BareClients = lazy(() => import("./pages/bare-clients"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <BareClients />
          </Suspense>
        );
      }} />

      <Route path="/super-simple" component={() => {
        const SuperSimple = lazy(() => import("./pages/super-simple"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <SuperSimple />
          </Suspense>
        );
      }} />

      <Route path="/direct-test" component={() => {
        const DirectTest = lazy(() => import("./pages/direct-test"));
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <DirectTest />
          </Suspense>
        );
      }} />

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
