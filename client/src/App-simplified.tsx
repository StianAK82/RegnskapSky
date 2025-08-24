import { Switch, Route } from "wouter";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/clients";
import Employees from "@/pages/employees";
import Tasks from "@/pages/tasks";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/employees" component={Employees} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/:rest*" component={NotFound} />
      </Switch>
    </div>
  );
}

export default App;