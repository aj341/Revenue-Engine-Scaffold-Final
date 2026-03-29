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
import AccountNew from "@/pages/account-new";
import AccountImport from "@/pages/account-import";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import ContactNew from "@/pages/contact-new";
import ContactImport from "@/pages/contact-import";
import Settings from "@/pages/settings";
import Analyses from "@/pages/analyses";
import AnalysisDetail from "@/pages/analysis-detail";
import Issues from "@/pages/issues";
import IssueDetail from "@/pages/issue-detail";
import Insights from "@/pages/insights";
import InsightDetail from "@/pages/insight-detail";
import Messages from "@/pages/messages";
import Sequences from "@/pages/sequences";
import SequenceDetail from "@/pages/sequence-detail";
import Queue from "@/pages/queue";
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

const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    const user = localStorage.getItem("auth_user");
    if (!user && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation]);

  return <Component {...rest} />;
};

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    if (location === "/") {
      window.location.href = import.meta.env.BASE_URL + "dashboard";
    }
  }, [location]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Dashboard */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      
      {/* Accounts */}
      <Route path="/accounts/import"><ProtectedRoute component={AccountImport} /></Route>
      <Route path="/accounts/new"><ProtectedRoute component={AccountNew} /></Route>
      <Route path="/accounts/:id"><ProtectedRoute component={AccountDetail} /></Route>
      <Route path="/accounts"><ProtectedRoute component={Accounts} /></Route>
      
      {/* Contacts */}
      <Route path="/contacts/import"><ProtectedRoute component={ContactImport} /></Route>
      <Route path="/contacts/new"><ProtectedRoute component={ContactNew} /></Route>
      <Route path="/contacts/:id"><ProtectedRoute component={ContactDetail} /></Route>
      <Route path="/contacts"><ProtectedRoute component={Contacts} /></Route>

      {/* Analyses */}
      <Route path="/analyses/:id"><ProtectedRoute component={AnalysisDetail} /></Route>
      <Route path="/analyses"><ProtectedRoute component={Analyses} /></Route>

      {/* Issues */}
      <Route path="/issues/:code"><ProtectedRoute component={IssueDetail} /></Route>
      <Route path="/issues"><ProtectedRoute component={Issues} /></Route>

      {/* Settings */}
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      
      {/* Insights */}
      <Route path="/insights/new"><ProtectedRoute component={InsightDetail} /></Route>
      <Route path="/insights/:id"><ProtectedRoute component={InsightDetail} /></Route>
      <Route path="/insights"><ProtectedRoute component={Insights} /></Route>

      {/* Messages */}
      <Route path="/messages"><ProtectedRoute component={Messages} /></Route>

      {/* Sequences */}
      <Route path="/sequences/new"><ProtectedRoute component={SequenceDetail} /></Route>
      <Route path="/sequences/:id"><ProtectedRoute component={SequenceDetail} /></Route>
      <Route path="/sequences"><ProtectedRoute component={Sequences} /></Route>

      {/* Queue */}
      <Route path="/queue"><ProtectedRoute component={Queue} /></Route>
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
