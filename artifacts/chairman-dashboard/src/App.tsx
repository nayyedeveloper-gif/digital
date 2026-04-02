import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useEffect } from "react";

// Pages
import Overview from "@/pages/overview";
import Campaigns from "@/pages/campaigns";
import Channels from "@/pages/channels";
import Trends from "@/pages/trends";
import Sheets from "@/pages/sheets";
import ReportLiveSales from "@/pages/report-live-sales";
import ReportPaidAds from "@/pages/report-paid-ads";
import ReportOrganic from "@/pages/report-organic";
import ReportDailyPosts from "@/pages/report-daily-posts";
import ReportDailyAds from "@/pages/report-daily-ads";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/channels" component={Channels} />
        <Route path="/trends" component={Trends} />
        <Route path="/sheets" component={Sheets} />
        <Route path="/reports/live-sales" component={ReportLiveSales} />
        <Route path="/reports/paid-ads" component={ReportPaidAds} />
        <Route path="/reports/organic" component={ReportOrganic} />
        <Route path="/reports/daily-posts" component={ReportDailyPosts} />
        <Route path="/reports/daily-ads" component={ReportDailyAds} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
