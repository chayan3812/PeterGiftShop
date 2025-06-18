import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  recipientEmail: text("recipient_email").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  squareGiftCardId: text("square_gift_card_id"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  giftCardId: integer("gift_card_id").references(() => giftCards.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  squareOrderId: text("square_order_id"),
  squarePaymentId: text("square_payment_id"),
  purchaserEmail: text("purchaser_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  giftCardId: integer("gift_card_id").references(() => giftCards.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  description: text("description"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGiftCardSchema = createInsertSchema(giftCards).omit({
  id: true,
  code: true,
  balance: true,
  isActive: true,
  createdAt: true,
  squareGiftCardId: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  status: true,
  createdAt: true,
  squareOrderId: true,
  squarePaymentId: true,
});

export const insertRedemptionSchema = createInsertSchema(redemptions).omit({
  id: true,
  redeemedAt: true,
}).extend({
  giftCardId: z.number().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;
export type GiftCard = typeof giftCards.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
export type Redemption = typeof redemptions.$inferSelect;
