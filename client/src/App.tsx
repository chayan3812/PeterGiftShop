import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GiftCards from "@/pages/gift-cards";
import Redeem from "@/pages/redeem";
import Checkout from "@/pages/checkout";
import Success from "@/pages/success";
import Balance from "@/pages/balance";
import AdminGiftCards from "@/pages/admin-gift-cards";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminFraud from "@/pages/admin-fraud";
import AdminThreatMap from "@/pages/admin-threat-map";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminThreatReplay from "@/pages/AdminThreatReplay";
import AdminReplayDashboard from "@/pages/AdminReplayDashboard";
import MerchantInbox from "@/pages/MerchantInbox";
import Navigation from "@/components/layout/navigation";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={AdminThreatReplay} />
          <Route path="/gift-cards" component={GiftCards} />
          <Route path="/redeem" component={Redeem} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/balance" component={Balance} />
          <Route path="/success" component={Success} />
          <Route path="/admin/gift-cards" component={AdminGiftCards} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/fraud" component={AdminFraud} />
          <Route path="/admin/threat-map" component={AdminThreatMap} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/threat-replay" component={AdminThreatReplay} />
          <Route path="/admin/replay" component={AdminReplayDashboard} />
          <Route path="/merchant/inbox" component={MerchantInbox} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="peter-digital-shop-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
