import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import AccountDetail from "@/pages/account-detail";
import Contacts from "@/pages/contacts";
import Settings from "@/pages/settings";
import ComingSoon from "@/pages/coming-soon";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Simple auth guard for frontend UX simulation
    const user = localStorage.getItem("auth_user");
    if (!user && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation]);

  return <Component {...rest} />;
};

function Router() {
  const [location] = useLocation();

  // Root redirect
  useEffect(() => {
    if (location === "/") {
      window.location.href = import.meta.env.BASE_URL + "dashboard";
    }
  }, [location]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Functional Pages */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/accounts"><ProtectedRoute component={Accounts} /></Route>
      <Route path="/accounts/:id"><ProtectedRoute component={AccountDetail} /></Route>
      <Route path="/contacts"><ProtectedRoute component={Contacts} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      
      {/* Placeholder Pages */}
      <Route path="/analyses"><ProtectedRoute component={() => <ComingSoon title="Analyses" />} /></Route>
      <Route path="/issues"><ProtectedRoute component={() => <ComingSoon title="Issue Clusters" />} /></Route>
      <Route path="/insights"><ProtectedRoute component={() => <ComingSoon title="Insight Library" />} /></Route>
      <Route path="/messages"><ProtectedRoute component={() => <ComingSoon title="Message Generator" />} /></Route>
      <Route path="/sequences"><ProtectedRoute component={() => <ComingSoon title="Sequences" />} /></Route>
      <Route path="/queue"><ProtectedRoute component={() => <ComingSoon title="Execution Queue" />} /></Route>
      <Route path="/inbox"><ProtectedRoute component={() => <ComingSoon title="Reply Inbox" />} /></Route>
      <Route path="/calls"><ProtectedRoute component={() => <ComingSoon title="Call Prep" />} /></Route>
      <Route path="/opportunities"><ProtectedRoute component={() => <ComingSoon title="Opportunities" />} /></Route>
      <Route path="/assets"><ProtectedRoute component={() => <ComingSoon title="Assets" />} /></Route>
      <Route path="/experiments"><ProtectedRoute component={() => <ComingSoon title="Experiments" />} /></Route>
      <Route path="/playbook"><ProtectedRoute component={() => <ComingSoon title="Playbook" />} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
