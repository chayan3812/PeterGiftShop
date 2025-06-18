import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { FusionAuthProvider } from "@fusionauth/react-sdk";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GiftCards from "@/pages/gift-cards";
import Redeem from "@/pages/redeem";
import Checkout from "@/pages/checkout";
import Success from "@/pages/success";
import Balance from "@/pages/balance";
import AdminRouter from "@/pages/admin";
import OAuthCallback from "@/pages/oauth-callback";
import Navigation from "@/components/layout/navigation";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/gift-cards" component={GiftCards} />
          <Route path="/redeem" component={Redeem} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/balance" component={Balance} />
          <Route path="/success" component={Success} />
          <Route path="/oauth-callback" component={OAuthCallback} />
          <Route path="/admin/*" component={AdminRouter} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const fusionAuthConfig = {
    clientId: import.meta.env.VITE_FUSIONAUTH_CLIENT_ID || 'demo-client-id',
    serverUrl: import.meta.env.VITE_FUSIONAUTH_SERVER_URL || 'http://localhost:9011',
    redirectUri: `${window.location.origin}/oauth-callback`,
    scope: 'openid profile email'
  };

  return (
    <QueryClientProvider client={queryClient}>
      <FusionAuthProvider {...fusionAuthConfig}>
        <ThemeProvider defaultTheme="dark" storageKey="peter-digital-shop-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </FusionAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
