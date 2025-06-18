import { 
  users, 
  giftCards, 
  orders, 
  redemptions,
  type User, 
  type InsertUser,
  type GiftCard,
  type InsertGiftCard,
  type Order,
  type InsertOrder,
  type Redemption,
  type InsertRedemption
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Gift Cards
  getGiftCard(id: number): Promise<GiftCard | undefined>;
  getGiftCardByCode(code: string): Promise<GiftCard | undefined>;
  createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard>;
  updateGiftCardBalance(id: number, balance: string): Promise<GiftCard | undefined>;
  updateGiftCardSquareId(id: number, squareGiftCardId: string): Promise<GiftCard | undefined>;
  
  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string, squareOrderId?: string, squarePaymentId?: string): Promise<Order | undefined>;
  
  // Redemptions
  getRedemptionsByGiftCard(giftCardId: number): Promise<Redemption[]>;
  createRedemption(redemption: InsertRedemption): Promise<Redemption>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private giftCards: Map<number, GiftCard>;
  private orders: Map<number, Order>;
  private redemptions: Map<number, Redemption>;
  private currentUserId: number;
  private currentGiftCardId: number;
  private currentOrderId: number;
  private currentRedemptionId: number;

  constructor() {
    this.users = new Map();
    this.giftCards = new Map();
    this.orders = new Map();
    this.redemptions = new Map();
    this.currentUserId = 1;
    this.currentGiftCardId = 1;
    this.currentOrderId = 1;
    this.currentRedemptionId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Gift Cards
  async getGiftCard(id: number): Promise<GiftCard | undefined> {
    return this.giftCards.get(id);
  }

  async getGiftCardByCode(code: string): Promise<GiftCard | undefined> {
    return Array.from(this.giftCards.values()).find(
      (card) => card.code === code,
    );
  }

  async createGiftCard(insertGiftCard: InsertGiftCard): Promise<GiftCard> {
    const id = this.currentGiftCardId++;
    const code = this.generateGiftCardCode();
    const giftCard: GiftCard = {
      id,
      code,
      amount: insertGiftCard.amount,
      balance: insertGiftCard.amount,
      isActive: true,
      recipientEmail: insertGiftCard.recipientEmail,
      senderName: insertGiftCard.senderName,
      message: insertGiftCard.message || null,
      createdAt: new Date(),
      expiresAt: insertGiftCard.expiresAt || null,
      squareGiftCardId: null,
    };
    this.giftCards.set(id, giftCard);
    return giftCard;
  }

  async updateGiftCardBalance(id: number, balance: string): Promise<GiftCard | undefined> {
    const giftCard = this.giftCards.get(id);
    if (giftCard) {
      const updatedCard = { ...giftCard, balance };
      this.giftCards.set(id, updatedCard);
      return updatedCard;
    }
    return undefined;
  }

  async updateGiftCardSquareId(id: number, squareGiftCardId: string): Promise<GiftCard | undefined> {
    const giftCard = this.giftCards.get(id);
    if (giftCard) {
      const updatedCard = { ...giftCard, squareGiftCardId };
      this.giftCards.set(id, updatedCard);
      return updatedCard;
    }
    return undefined;
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      id,
      amount: insertOrder.amount,
      purchaserEmail: insertOrder.purchaserEmail,
      giftCardId: insertOrder.giftCardId || null,
      status: "pending",
      createdAt: new Date(),
      squareOrderId: null,
      squarePaymentId: null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: string, squareOrderId?: string, squarePaymentId?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { 
        ...order, 
        status, 
        squareOrderId: squareOrderId || order.squareOrderId,
        squarePaymentId: squarePaymentId || order.squarePaymentId,
      };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return undefined;
  }

  // Redemptions
  async getRedemptionsByGiftCard(giftCardId: number): Promise<Redemption[]> {
    return Array.from(this.redemptions.values()).filter(
      (redemption) => redemption.giftCardId === giftCardId,
    );
  }

  async createRedemption(insertRedemption: InsertRedemption): Promise<Redemption> {
    const id = this.currentRedemptionId++;
    const redemption: Redemption = {
      id,
      amount: insertRedemption.amount,
      giftCardId: insertRedemption.giftCardId || null,
      description: insertRedemption.description || null,
      redeemedAt: new Date(),
    };
    this.redemptions.set(id, redemption);
    return redemption;
  }

  private generateGiftCardCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        result += '-';
      }
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const storage = new MemStorage();
