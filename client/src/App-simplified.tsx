import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import ClientsSimple from "@/pages/clients-simple";
import EmployeesSimple from "@/pages/employees-simple";
import TasksSimple from "@/pages/tasks-simple";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/clients" component={ClientsSimple} />
            <Route path="/employees" component={EmployeesSimple} />
            <Route path="/tasks" component={TasksSimple} />
            <Route path="/:rest*" component={NotFound} />
          </Switch>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;