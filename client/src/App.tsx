import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Companies from "./pages/Companies";
import Corporations from "./pages/Corporations";
import Contacts from "./pages/Contacts";
import CorporationDetail from "./pages/CorporationDetail";
import CorporationDetailNew from "./pages/CorporationDetailNew";
import CompanyDetail from "./pages/CompanyDetail";
import ContactDetail from "./pages/ContactDetail";
import Deals from "./pages/Deals";
import MyDeals from "./pages/MyDeals";
import Docs from "./pages/Docs";
import Scout from "./pages/Scout";
import ScoutSeed from "./pages/ScoutSeed";
import ScoutReview from "./pages/ScoutReview";
import ScoutQueue from "./pages/ScoutQueue";
import ScoutMethods from "./pages/ScoutMethods";
import OutreachTemplates from "./pages/OutreachTemplates";
import OutreachDrafts from "./pages/OutreachDrafts";
import OutreachResponses from "./pages/OutreachResponses";
import * as Placeholder from "./pages/Placeholder";
import HunterDashboard from "./pages/HunterDashboard";
import HunterTargetCompanies from "./pages/HunterTargetCompanies";
import HunterReview from "./pages/HunterReview";
import HunterFoundContacts from "./pages/HunterFoundContacts";
import OutreachDashboard from "./pages/OutreachDashboard";
import OutreachCampaigns from "./pages/OutreachCampaigns";
import OutreachReview from "./pages/OutreachReview";
import OutreachSent from "./pages/OutreachSent";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";
import Users from "./pages/Users";
import EmailClient from "./pages/EmailClient";
import { useAuth } from "./_core/hooks/useAuth";
import Layout from "./layouts/Layout";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/corporations"} component={Corporations} />
        <Route path="/corporations/:id" component={CorporationDetailNew} />
        <Route path={"/companies"} component={Companies} />
        <Route path="/companies/:id" component={CompanyDetail} />
        <Route path={"/contacts"} component={Contacts} />
        <Route path="/contacts/:id" component={ContactDetail} />
        <Route path={"/deals"} component={Deals} />
        
        {/* External Sales: My Deals */}
        {user?.role === 'staff_plus' && (
          <Route path="/my-deals" component={MyDeals} />
        )}
        
        {/* Scout Agent */}
        <Route path="/scout" component={Scout} />
        <Route path="/scout/seed" component={ScoutSeed} />
        <Route path="/scout/review" component={ScoutReview} />
        <Route path="/scout/queue" component={ScoutQueue} />
        <Route path="/scout/methods" component={ScoutMethods} />
        <Route path="/scout/stats" component={Placeholder.ScoutStatsPage} />
        
        {/* Hunter Agent */}
        <Route path="/hunter" component={HunterDashboard} />
        <Route path="/hunter/targets" component={HunterTargetCompanies} />
        <Route path="/hunter/review" component={HunterReview} />
        <Route path="/hunter/contacts" component={HunterFoundContacts} />
        <Route path="/hunter/data-sources" component={Placeholder.HunterSourcesPage} />
        <Route path="/hunter/stats" component={Placeholder.HunterStatsPage} />
        
        {/* Outreach Agent */}
        <Route path="/outreach" component={OutreachDashboard} />
        <Route path="/outreach/campaigns" component={OutreachCampaigns} />
        <Route path="/outreach/drafts" component={OutreachDrafts} />
        <Route path="/outreach/review" component={OutreachReview} />
        <Route path="/outreach/sent" component={OutreachSent} />
        <Route path="/outreach/responses" component={OutreachResponses} />
        <Route path="/outreach/templates" component={OutreachTemplates} />
        <Route path="/outreach/stats" component={Placeholder.OutreachStatsPage} />
        
        {/* Analytics */}
        <Route path="/analytics/funnel" component={Placeholder.AnalyticsFunnelPage} />
        <Route path="/analytics/agents" component={Placeholder.AnalyticsAgentsPage} />
        <Route path="/analytics/roi" component={Placeholder.AnalyticsROIPage} />
        
        {/* Calendar */}
        <Route path="/calendar" component={Calendar} />
        
        {/* Emails & Projects */}
        <Route path="/emails" component={EmailClient} />
        <Route path="/email-client" component={EmailClient} />
        
        {/* Settings & Admin */}
        <Route path="/settings" component={Settings} />
        <Route path="/users" component={Users} />
        <Route path="/settings/partners" component={Placeholder.SettingsPartnersPage} />
        <Route path="/settings/api" component={Settings} />
        <Route path="/settings/integrations" component={Placeholder.SettingsIntegrationsPage} />
        
        {/* Documentation */}
        <Route path="/docs" component={Docs} />
        
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
