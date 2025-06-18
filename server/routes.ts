import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGiftCardSchema, insertOrderSchema, insertRedemptionSchema } from "@shared/schema";
import { z } from "zod";
import { GiftCardController } from "./controllers/GiftCardController";
import { GiftCardAdminController } from "./controllers/GiftCardAdminController";

const purchaseSchema = insertGiftCardSchema.extend({
  deliveryType: z.enum(["instant", "scheduled"]),
  scheduledDate: z.string().optional(),
});

const redeemSchema = z.object({
  code: z.string().min(1, "Gift card code is required"),
  amount: z.string().min(1, "Amount is required"),
});

const balanceCheckSchema = z.object({
  code: z.string().min(1, "Gift card code is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Square Gift Card API Routes
  app.post("/api/gift-cards/issue", GiftCardController.issue);
  app.post("/api/gift-cards/reload", GiftCardController.reload);
  app.post("/api/gift-cards/redeem-square", GiftCardController.redeem);
  app.get("/api/gift-cards/balance/:giftCardId", GiftCardController.balance);

  // Admin Gift Card API Routes
  app.get("/api/gift-card-admin/list", GiftCardAdminController.list);
  app.post("/api/gift-card-admin/from-gan", GiftCardAdminController.gan);
  app.post("/api/gift-card-admin/from-nonce", GiftCardAdminController.nonce);
  app.post("/api/gift-card-admin/link", GiftCardAdminController.link);
  app.post("/api/gift-card-admin/unlink", GiftCardAdminController.unlink);
  app.post("/api/gift-card-admin/issue", GiftCardAdminController.issue);

  // Square API Status Check
  app.get("/api/square/status", (req, res) => {
    import('./services/SquareService').then(({ squareService }) => {
      const status = squareService.getStatus();
      
      res.json({
        ...status,
        message: status.configured 
          ? 'Square API is properly configured' 
          : 'Square API credentials not found. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.'
      });
    }).catch((error) => {
      res.status(500).json({ error: 'Failed to load Square service' });
    });
  });

  // Webhook Routes
  app.post("/api/webhooks/gift-cards", async (req, res) => {
    console.log('🎯 Webhook received:', req.body);
    
    try {
      const { activityLogger } = await import('./db/activity-log');
      activityLogger.log('webhook', req.body, 'square_webhook');
      
      // Log to webhook service for dashboard
      const { WebhookLogService } = await import('./services/WebhookLogService');
      await WebhookLogService.logEvent(req.body);
      
      // Run fraud detection engine
      const { FraudDetectionEngine } = await import('./services/FraudDetectionEngine');
      FraudDetectionEngine.run(req.body);
      
      // Process auto-responder rules
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      AutoResponderEngine.processWebhookEvent(req.body);
    } catch (error) {
      console.error('Failed to log webhook activity:', error);
    }
    
    res.sendStatus(200);
  });

  // Webhook Dashboard API Routes
  app.get("/api/webhooks/logs", async (req, res) => {
    try {
      const { WebhookLogService } = await import('./services/WebhookLogService');
      const limit = parseInt(req.query.limit as string) || 20;
      const logs = await WebhookLogService.list(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook logs' });
    }
  });

  app.get("/api/webhooks/stats", async (req, res) => {
    try {
      const { WebhookLogService } = await import('./services/WebhookLogService');
      const stats = await WebhookLogService.stats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook stats' });
    }
  });

  // Fraud Detection API Routes
  app.get("/api/fraud/signals", async (req, res) => {
    try {
      const { FraudDetectionEngine } = await import('./services/FraudDetectionEngine');
      const limit = parseInt(req.query.limit as string) || 25;
      const signals = FraudDetectionEngine.list(limit);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch fraud signals' });
    }
  });

  app.get("/api/fraud/stats", async (req, res) => {
    try {
      const { FraudDetectionEngine } = await import('./services/FraudDetectionEngine');
      const stats = FraudDetectionEngine.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch fraud stats' });
    }
  });

  // Geo-IP Threat Map API Routes
  app.get("/api/threats/map", async (req, res) => {
    try {
      const { GeoIPService } = await import('./services/GeoIPService');
      const threatMap = GeoIPService.getThreatMap();
      res.json(threatMap);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch threat map data' });
    }
  });

  app.get("/api/threats/stats", async (req, res) => {
    try {
      const { GeoIPService } = await import('./services/GeoIPService');
      const stats = GeoIPService.getThreatStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch threat stats' });
    }
  });

  // Analytics Dashboard API Route
  app.get("/api/analytics/data", async (req, res) => {
    try {
      const { FraudDetectionEngine } = await import('./services/FraudDetectionEngine');
      const { GeoIPService } = await import('./services/GeoIPService');
      
      const fraudStats = FraudDetectionEngine.getStats();
      const threatStats = GeoIPService.getThreatStats();
      
      // Generate time series data for the last 24 hours
      const timeSeriesData = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        timeSeriesData.push({
          time: time.toISOString(),
          fraudSignals: Math.floor(Math.random() * 5),
          threats: Math.floor(Math.random() * 3),
          avgScore: Math.floor(Math.random() * 40 + 60)
        });
      }
      
      res.json({
        fraudStats,
        threatStats,
        timeSeriesData
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  });

  // AI Digest API Routes
  app.get("/api/digest/latest", async (req, res) => {
    try {
      const { AIDigestEngine } = await import('./services/AIDigestEngine');
      const latestDigest = AIDigestEngine.getLatestDigest();
      res.json(latestDigest);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch latest digest' });
    }
  });

  app.get("/api/digest/list", async (req, res) => {
    try {
      const { AIDigestEngine } = await import('./services/AIDigestEngine');
      const limit = parseInt(req.query.limit as string) || 10;
      const digests = AIDigestEngine.getAllDigests().slice(0, limit);
      res.json(digests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch digest list' });
    }
  });

  app.post("/api/digest/generate", async (req, res) => {
    try {
      const { AIDigestEngine } = await import('./services/AIDigestEngine');
      const { period = 'daily' } = req.body;
      const digest = await AIDigestEngine.generateDigest(period);
      res.json(digest);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate digest' });
    }
  });

  app.get("/api/digest/stats", async (req, res) => {
    try {
      const { AIDigestEngine } = await import('./services/AIDigestEngine');
      const stats = AIDigestEngine.getDigestStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch digest stats' });
    }
  });

  // Auto-Responder API Routes
  app.get("/api/auto-responder/rules", async (req, res) => {
    try {
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      const rules = AutoResponderEngine.getRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch auto-responder rules' });
    }
  });

  app.post("/api/auto-responder/trigger", async (req, res) => {
    try {
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      const { event } = req.body;
      AutoResponderEngine.processWebhookEvent(event);
      res.json({ success: true, message: 'Auto-responder processing triggered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to trigger auto-responder' });
    }
  });

  app.get("/api/auto-responder/stats", async (req, res) => {
    try {
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      const stats = AutoResponderEngine.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch auto-responder stats' });
    }
  });

  app.get("/api/auto-responder/responses", async (req, res) => {
    try {
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      const limit = parseInt(req.query.limit as string) || 20;
      const responses = AutoResponderEngine.getResponses().slice(0, limit);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch auto-responder responses' });
    }
  });

  app.get("/api/auto-responder/alerts", async (req, res) => {
    try {
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      const responses = AutoResponderEngine.getResponses();
      
      // Convert responses to alert format for the merchant inbox
      const alerts = responses.map(response => ({
        id: response.id,
        type: 'auto-response',
        severity: response.success ? 'medium' : 'high',
        message: response.message,
        timestamp: response.triggeredAt,
        actionRequired: !response.success
      }));
      
      res.json(alerts.slice(0, 10)); // Latest 10 alerts
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch security alerts' });
    }
  });

  app.get("/api/auto-responder/blocked-ips", async (req, res) => {
    try {
      const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
      const blockedIPs = AutoResponderEngine.getBlockedIPs();
      res.json(blockedIPs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch blocked IPs' });
    }
  });

  // Threat Replay Engine API Routes
  app.post("/api/threats/replay", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const { scenario, scenarioId, merchantId, simulateScore, geoLocation, transactionAmount, fraudType } = req.body;
      
      // Determine which scenario to execute
      let targetScenarioId = scenarioId;
      
      if (scenario && !scenarioId) {
        // Handle predefined scenario names
        const scenarios = ThreatReplayEngine.getScenarios();
        const matchedScenario = scenarios.find(s => 
          s.name.toLowerCase().includes(scenario.toLowerCase()) ||
          s.description.toLowerCase().includes(scenario.toLowerCase())
        );
        targetScenarioId = matchedScenario?.id;
      }
      
      if (!targetScenarioId) {
        // Create dynamic scenario from request parameters
        const dynamicScenario = ThreatReplayEngine.addScenario({
          name: `Dynamic Scenario: ${scenario || 'Custom'}`,
          description: `Custom replay scenario: ${scenario || 'User-defined parameters'}`,
          merchantId,
          simulateScore,
          geoLocation,
          transactionAmount,
          fraudType: fraudType || 'custom',
          expectedOutcomes: ['Dynamic response based on parameters']
        });
        targetScenarioId = dynamicScenario.id;
      }
      
      // Execute the replay
      const execution = await ThreatReplayEngine.executeReplay(
        targetScenarioId,
        { merchantId, simulateScore, geoLocation, transactionAmount, fraudType },
        true // Admin triggered
      );
      
      res.json(execution);
    } catch (error) {
      console.error('Threat replay error:', error);
      res.status(500).json({ error: 'Failed to execute threat replay' });
    }
  });

  app.get("/api/threats/replay-history", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const limit = parseInt(req.query.limit as string) || 20;
      const executions = ThreatReplayEngine.getExecutions().slice(0, limit);
      res.json(executions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch replay history' });
    }
  });

  app.get("/api/threats/replay-scenarios", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const scenarios = ThreatReplayEngine.getScenarios();
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch replay scenarios' });
    }
  });

  app.get("/api/threats/replay-stats", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const stats = ThreatReplayEngine.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch replay stats' });
    }
  });

  app.get("/api/threats/learning-updates", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const updates = ThreatReplayEngine.getLearningUpdates();
      res.json(updates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch learning updates' });
    }
  });

  app.get("/api/threats/audit-log", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const auditLog = ThreatReplayEngine.getAuditLog();
      res.json(auditLog);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  app.post("/api/threats/learning/toggle", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const { enabled } = req.body;
      ThreatReplayEngine.setLearningEnabled(enabled);
      res.json({ success: true, learningEnabled: enabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle learning mode' });
    }
  });

  app.post("/api/threats/learning/threshold", async (req, res) => {
    try {
      const { ThreatReplayEngine } = await import('./services/ThreatReplayEngine');
      const { thresholdType, value } = req.body;
      ThreatReplayEngine.updateThreshold(thresholdType, value);
      res.json({ success: true, message: `Threshold ${thresholdType} updated to ${value}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update threshold' });
    }
  });

  // Gift Cards API
  app.post("/api/gift-cards/purchase", async (req, res) => {
    try {
      const data = purchaseSchema.parse(req.body);
      
      // Create gift card
      const giftCard = await storage.createGiftCard({
        amount: data.amount,
        recipientEmail: data.recipientEmail,
        senderName: data.senderName,
        message: data.message,
        expiresAt: data.expiresAt,
      });

      // Create order
      const order = await storage.createOrder({
        giftCardId: giftCard.id,
        amount: data.amount,
        purchaserEmail: data.recipientEmail,
      });

      // TODO: Integrate with Square API to process payment
      // For now, we'll simulate a successful payment
      await storage.updateOrderStatus(order.id, "completed");

      res.json({
        success: true,
        giftCard: {
          id: giftCard.id,
          code: giftCard.code,
          amount: giftCard.amount,
          recipientEmail: giftCard.recipientEmail,
        },
        order: {
          id: order.id,
          status: "completed",
        }
      });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Purchase failed" 
      });
    }
  });

  app.post("/api/gift-cards/check-balance", async (req, res) => {
    try {
      const { code } = balanceCheckSchema.parse(req.body);
      
      const giftCard = await storage.getGiftCardByCode(code);
      if (!giftCard) {
        return res.status(404).json({ 
          success: false, 
          error: "Gift card not found" 
        });
      }

      if (!giftCard.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: "Gift card is inactive" 
        });
      }

      const redemptions = await storage.getRedemptionsByGiftCard(giftCard.id);
      
      res.json({
        success: true,
        balance: giftCard.balance,
        originalAmount: giftCard.amount,
        isActive: giftCard.isActive,
        redemptions: redemptions.map(r => ({
          amount: r.amount,
          date: r.redeemedAt,
          description: r.description,
        })),
      });
    } catch (error) {
      console.error("Balance check error:", error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Balance check failed" 
      });
    }
  });

  app.post("/api/gift-cards/redeem", async (req, res) => {
    try {
      const { code, amount } = redeemSchema.parse(req.body);
      
      const giftCard = await storage.getGiftCardByCode(code);
      if (!giftCard) {
        return res.status(404).json({ 
          success: false, 
          error: "Gift card not found" 
        });
      }

      if (!giftCard.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: "Gift card is inactive" 
        });
      }

      const currentBalance = parseFloat(giftCard.balance);
      const redeemAmount = parseFloat(amount);

      if (redeemAmount > currentBalance) {
        return res.status(400).json({ 
          success: false, 
          error: "Insufficient balance" 
        });
      }

      // Create redemption record
      const redemption = await storage.createRedemption({
        giftCardId: giftCard.id,
        amount,
        description: `Redeemed $${amount}`,
      });

      // Update gift card balance
      const newBalance = (currentBalance - redeemAmount).toFixed(2);
      await storage.updateGiftCardBalance(giftCard.id, newBalance);

      res.json({
        success: true,
        redemption: {
          id: redemption.id,
          amount: redemption.amount,
          date: redemption.redeemedAt,
        },
        remainingBalance: newBalance,
      });
    } catch (error) {
      console.error("Redemption error:", error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Redemption failed" 
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
