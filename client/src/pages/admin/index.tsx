import { Route, Switch, Redirect } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import RequireAdmin from "@/components/admin/RequireAdmin";

// Import all admin pages
import Dashboard from "./Dashboard";
import GiftCards from "./GiftCards";
import Fraud from "./Fraud";
import Analytics from "./Analytics";
import ThreatMap from "./ThreatMap";
import ReplayDashboard from "./ReplayDashboard";
import ThreatReplay from "./ThreatReplay";
import MerchantInbox from "./MerchantInbox";
import SystemLogs from "./SystemLogs";
import UserManagement from "./UserManagement";
import Balance from "./Balance";
import Checkout from "./Checkout";
import Success from "./Success";
import TestReports from "./TestReports";
import OAuthCallback from "./OAuthCallback";

export default function AdminRouter() {
  return (
    <RequireAdmin>
      <AdminLayout>
        <Switch>
          <Route path="/admin/dashboard" component={Dashboard} />
          <Route path="/admin/gift-cards" component={GiftCards} />
          <Route path="/admin/fraud" component={Fraud} />
          <Route path="/admin/analytics" component={Analytics} />
          <Route path="/admin/threat-map" component={ThreatMap} />
          <Route path="/admin/replay-dashboard" component={ReplayDashboard} />
          <Route path="/admin/threat-replay" component={ThreatReplay} />
          <Route path="/admin/merchant-inbox" component={MerchantInbox} />
          <Route path="/admin/system-logs" component={SystemLogs} />
          <Route path="/admin/user-management" component={UserManagement} />
          <Route path="/admin/balance" component={Balance} />
          <Route path="/admin/checkout" component={Checkout} />
          <Route path="/admin/success" component={Success} />
          <Route path="/admin/test-reports" component={TestReports} />
          <Route path="/admin/oauth-callback" component={OAuthCallback} />
          <Route path="/admin">
            <Redirect to="/admin/dashboard" />
          </Route>
        </Switch>
      </AdminLayout>
    </RequireAdmin>
  );
}