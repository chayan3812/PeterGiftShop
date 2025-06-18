import { v4 as uuidv4 } from 'uuid';
import { activityLogger } from '../db/activity-log';

// Square API Service with proper credential handling
export class SquareApiService {
  private hasCredentials: boolean;
  private environment: string;
  private locationId: string;
  private client: any = null;

  constructor() {
    this.hasCredentials = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
    this.environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    this.locationId = process.env.SQUARE_LOCATION_ID || '';
    
    if (this.hasCredentials) {
      this.initializeSquareClient();
    }
  }

  private initializeSquareClient() {
    try {
      // Dynamically import Square SDK when credentials are available
      const { Client, Environment } = require('square');
      
      this.client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: this.environment === 'production' ? Environment.Production : Environment.Sandbox,
      });
      
      activityLogger.log('gift_card_activity', {
        action: 'client_initialized',
        environment: this.environment,
        locationId: this.locationId
      }, 'square_api');
    } catch (error: any) {
      activityLogger.log('error', {
        action: 'client_initialization_failed',
        error: error.message
      }, 'square_api');
      throw new Error('Failed to initialize Square client. Please ensure square package is installed and credentials are valid.');
    }
  }

  private requireCredentials() {
    if (!this.hasCredentials) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }
    if (!this.client) {
      throw new Error('Square client not initialized. Please check your credentials and try again.');
    }
  }

  async issueGiftCard(): Promise<any> {
    this.requireCredentials();
    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await this.client.giftCardsApi.createGiftCard({
        idempotencyKey,
        locationId: this.locationId,
        giftCard: { type: 'DIGITAL' },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'issue', 
        idempotencyKey, 
        giftCardId: result.giftCard?.id,
        environment: this.environment
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'issue_gift_card', 
        error: error.message 
      }, 'square_api');
      throw error;
    }
  }

  async reloadGiftCard(giftCardId: string, amountCents: number): Promise<any> {
    this.requireCredentials();
    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await this.client.giftCardsApi.createGiftCardActivity({
        idempotencyKey,
        giftCardActivity: {
          type: 'LOAD',
          locationId: this.locationId,
          giftCardId,
          loadActivityDetails: { 
            amountMoney: { amount: BigInt(amountCents), currency: 'USD' } 
          },
        },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'reload', 
        giftCardId, 
        amountCents, 
        activityId: result.giftCardActivity?.id,
        environment: this.environment
      }, 'square_api');
      
      return result.giftCardActivity;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'reload_gift_card', 
        giftCardId, 
        amountCents, 
        error: error.message 
      }, 'square_api');
      throw error;
    }
  }

  async redeemGiftCard(giftCardId: string, amountCents: number): Promise<any> {
    this.requireCredentials();
    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await this.client.giftCardsApi.createGiftCardActivity({
        idempotencyKey,
        giftCardActivity: {
          type: 'REDEEM',
          locationId: this.locationId,
          giftCardId,
          redeemActivityDetails: { 
            amountMoney: { amount: BigInt(amountCents), currency: 'USD' } 
          },
        },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'redeem', 
        giftCardId, 
        amountCents, 
        activityId: result.giftCardActivity?.id,
        environment: this.environment
      }, 'square_api');
      
      return result.giftCardActivity;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'redeem_gift_card', 
        giftCardId, 
        amountCents, 
        error: error.message 
      }, 'square_api');
      throw error;
    }
  }

  async checkBalance(giftCardId: string): Promise<any> {
    this.requireCredentials();
    
    try {
      const { result } = await this.client.giftCardsApi.retrieveGiftCardFromGAN({ 
        gan: giftCardId 
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'check_balance', 
        giftCardId, 
        balance: result.giftCard?.balanceMoney,
        environment: this.environment
      }, 'square_api');
      
      return result.giftCard?.balanceMoney;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'check_balance', 
        giftCardId, 
        error: error.message 
      }, 'square_api');
      throw error;
    }
  }

  private generateGiftCardNumber(): string {
    // Generate a 16-digit gift card number
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
  }

  getStatus() {
    return {
      configured: this.hasCredentials,
      environment: this.environment,
      locationId: this.hasCredentials ? this.locationId : null,
      accessTokenSet: !!process.env.SQUARE_ACCESS_TOKEN
    };
  }
}

export const squareApiService = new SquareApiService();