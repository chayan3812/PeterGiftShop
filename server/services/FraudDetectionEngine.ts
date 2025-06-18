import { WebhookLogStore } from "../db/webhook-log";
import { activityLogger } from "../db/activity-log";
import { GeoIPService } from "./GeoIPService";
import { AlertDispatcher } from "./AlertDispatcher";

type FraudSignal = {
  id: string;
  type: string;
  score: number;
  reason: string;
  timestamp: string;
  sourceEvent: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cardId?: string;
  amount?: number;
};

const fraudSignals: FraudSignal[] = [];

export const FraudDetectionEngine = {
  run(event: any) {
    const now = new Date().toISOString();
    const type = event?.type;

    if (!type?.includes("gift_card")) return;

    const activity = event.data?.object;
    const cardId = activity?.gift_card_id || activity?.id;
    const amount = activity?.amount_money?.amount || activity?.balance_money?.amount || 0;
    const locationId = activity?.location_id;
    const activityType = activity?.type;

    // Get recent webhook logs for analysis
    const recent = WebhookLogStore.slice(-50)
      .filter((e) => e.type.includes("gift_card"))
      .map((e) => e.raw.data?.object);

    // Filter for same card activities
    const sameCardActivities = recent.filter(a => 
      (a?.gift_card_id === cardId || a?.id === cardId)
    );

    // Signal 1: High-frequency reloads
    if (type === "gift_card_activity.created" && activityType === "LOAD") {
      const recentLoads = sameCardActivities.filter(a => a?.type === "LOAD");
      
      if (recentLoads.length >= 3) {
        fraudSignals.push({
          id: "fraud-" + Date.now() + "-hf",
          type: "high-frequency-load",
          score: Math.min(90 + (recentLoads.length - 3) * 5, 100),
          reason: `Gift card ${cardId?.substring(0, 12)}... was reloaded ${recentLoads.length} times in quick succession within recent activity.`,
          timestamp: now,
          sourceEvent: activity,
          severity: recentLoads.length >= 5 ? 'critical' : 'high',
          cardId,
          amount: amount / 100
        });
      }
    }

    // Signal 2: Large reload/creation amount
    if (amount > 50000) { // $500+
      const severity = amount > 100000 ? 'critical' : amount > 75000 ? 'high' : 'medium';
      fraudSignals.push({
        id: "fraud-" + Date.now() + "-la",
        type: "large-amount",
        score: Math.min(75 + Math.floor((amount - 50000) / 10000) * 5, 100),
        reason: `${activityType || 'Transaction'} amount $${(amount / 100).toFixed(2)} exceeds normal thresholds for gift card operations.`,
        timestamp: now,
        sourceEvent: activity,
        severity,
        cardId,
        amount: amount / 100
      });
    }

    // Signal 3: Multi-location usage
    if (locationId && cardId) {
      const locationsUsed = sameCardActivities
        .filter(a => a?.location_id)
        .map(a => a.location_id);
      const uniqueLocations = Array.from(new Set(locationsUsed));
      
      if (uniqueLocations.length > 2) {
        fraudSignals.push({
          id: "fraud-" + Date.now() + "-ml",
          type: "multi-location-abuse",
          score: 85 + Math.min(uniqueLocations.length * 5, 15),
          reason: `Gift card ${cardId?.substring(0, 12)}... has been used across ${uniqueLocations.length} different locations, indicating potential card sharing or fraud.`,
          timestamp: now,
          sourceEvent: activity,
          severity: uniqueLocations.length > 4 ? 'critical' : 'high',
          cardId,
          amount: amount / 100
        });
      }
    }

    // Signal 4: Rapid creation and redemption pattern
    if (type === "gift_card.created") {
      const recentCreations = recent.filter(a => 
        a?.type === "DIGITAL" || a?.type === "PHYSICAL" || a?.state === "ACTIVE"
      );
      
      if (recentCreations.length >= 5) {
        fraudSignals.push({
          id: "fraud-" + Date.now() + "-rc",
          type: "rapid-creation",
          score: 70 + Math.min(recentCreations.length * 3, 25),
          reason: `${recentCreations.length} gift cards created in recent activity window, indicating potential bulk fraud or abuse.`,
          timestamp: now,
          sourceEvent: activity,
          severity: recentCreations.length > 8 ? 'critical' : 'high',
          cardId,
          amount: amount / 100
        });
      }
    }

    // Signal 5: Suspicious redemption velocity
    if (type === "gift_card_activity.created" && activityType === "REDEEM") {
      const recentRedemptions = sameCardActivities.filter(a => a?.type === "REDEEM");
      
      if (recentRedemptions.length >= 3) {
        fraudSignals.push({
          id: "fraud-" + Date.now() + "-rv",
          type: "rapid-redemption",
          score: 80 + Math.min(recentRedemptions.length * 4, 20),
          reason: `Gift card ${cardId?.substring(0, 12)}... has ${recentRedemptions.length} redemptions in quick succession, indicating potential automated abuse.`,
          timestamp: now,
          sourceEvent: activity,
          severity: recentRedemptions.length > 5 ? 'critical' : 'high',
          cardId,
          amount: amount / 100
        });
      }
    }

    // Log fraud detection activity and geo-location threats
    if (fraudSignals.length > 0) {
      const latestSignal = fraudSignals[fraudSignals.length - 1];
      
      // Simulate IP extraction from webhook (in production, get from request headers)
      const simulatedIP = FraudDetectionEngine.generateSimulatedIP(latestSignal.type, latestSignal.severity);
      
      // Log geo-location threat
      GeoIPService.logThreatLocation(
        simulatedIP,
        latestSignal.type,
        latestSignal.score,
        latestSignal.id,
        {
          cardId,
          amount: amount / 100,
          activityType,
          timestamp: now
        }
      );

      activityLogger.log('webhook', {
        action: 'fraud_signal_detected',
        signal_type: latestSignal.type,
        score: latestSignal.score,
        severity: latestSignal.severity,
        card_id: cardId,
        source_ip: simulatedIP
      }, 'fraud_engine');

      // Dispatch alert for high-risk signals
      if (latestSignal.score >= 85 || latestSignal.severity === 'critical') {
        AlertDispatcher.dispatch({
          type: 'fraud',
          score: latestSignal.score,
          summary: latestSignal.reason,
          timestamp: latestSignal.timestamp,
          severity: latestSignal.severity,
          metadata: {
            cardId,
            activityType,
            sourceIP: simulatedIP
          }
        });
      }
    }
  },

  list(limit = 25) {
    return fraudSignals.slice(-limit).reverse();
  },

  getStats() {
    const total = fraudSignals.length;
    const lastHour = fraudSignals.filter(s => 
      new Date(s.timestamp).getTime() > Date.now() - (60 * 60 * 1000)
    ).length;
    const last24Hours = fraudSignals.filter(s => 
      new Date(s.timestamp).getTime() > Date.now() - (24 * 60 * 60 * 1000)
    ).length;

    const byType = fraudSignals.reduce((acc, signal) => {
      acc[signal.type] = (acc[signal.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = fraudSignals.reduce((acc, signal) => {
      acc[signal.severity] = (acc[signal.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgScore = fraudSignals.length > 0 
      ? fraudSignals.reduce((sum, s) => sum + s.score, 0) / fraudSignals.length 
      : 0;

    return {
      total,
      lastHour,
      last24Hours,
      byType,
      bySeverity,
      avgScore: Math.round(avgScore)
    };
  },

  generateSimulatedIP(signalType: string, severity: string): string {
    // Generate realistic IP addresses based on fraud patterns
    const highRiskIPs = [
      '185.220.101.', // Tor exit nodes
      '197.210.84.',   // Nigeria
      '46.229.168.',   // Romania
      '222.186.42.',   // China
      '91.205.173.',   // Russia
    ];
    
    const lowRiskIPs = [
      '8.8.8.',        // Google DNS
      '1.1.1.',        // Cloudflare
      '208.67.222.',   // OpenDNS
    ];
    
    const ipPrefix = severity === 'critical' || severity === 'high' 
      ? highRiskIPs[Math.floor(Math.random() * highRiskIPs.length)]
      : lowRiskIPs[Math.floor(Math.random() * lowRiskIPs.length)];
    
    const lastOctet = Math.floor(Math.random() * 254) + 1;
    return ipPrefix + lastOctet;
  },

  clearSignals() {
    fraudSignals.length = 0;
  }
};