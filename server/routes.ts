import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGiftCardSchema, insertOrderSchema, insertRedemptionSchema } from "@shared/schema";
import { z } from "zod";
import { GiftCardController } from "./controllers/GiftCardController";

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

  // Square API Status Check
  app.get("/api/square/status", (req, res) => {
    const hasCredentials = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
    const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    
    res.json({
      configured: hasCredentials,
      environment,
      locationId: hasCredentials ? process.env.SQUARE_LOCATION_ID : null,
      accessTokenSet: !!process.env.SQUARE_ACCESS_TOKEN,
      message: hasCredentials 
        ? 'Square API is properly configured' 
        : 'Square API credentials not found. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.'
    });
  });

  // Webhook Routes
  app.post("/api/webhooks/gift-cards", (req, res) => {
    console.log('🎯 Webhook received:', req.body);
    
    // Import activity logger here to avoid circular dependencies
    const { activityLogger } = require('./db/activity-log');
    activityLogger.log('webhook', req.body, 'square_webhook');
    
    res.sendStatus(200);
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
