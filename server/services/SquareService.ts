import { v4 as uuidv4 } from 'uuid';
import { activityLogger } from '../db/activity-log';

/**
 * Production Square Gift Card Service
 * Requires authentic Square API credentials for operation
 */
export class SquareService {
  private client: any = null;
  private environment: string;
  private locationId: string;
  private isConfigured: boolean;

  constructor() {
    this.environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    this.locationId = process.env.SQUARE_LOCATION_ID || '';
    this.isConfigured = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
    
    if (this.isConfigured) {
      try {
        const square = require('square');
        this.client = new square.Client({
          accessToken: process.env.SQUARE_ACCESS_TOKEN,
          environment: this.environment === 'production' ? square.Environment.Production : square.Environment.Sandbox,
        });
        
        activityLogger.log('gift_card_activity', {
          action: 'square_client_initialized',
          environment: this.environment,
          locationId: this.locationId
        }, 'square_service');
      } catch (error: any) {
        activityLogger.log('error', {
          action: 'square_client_init_failed',
          error: error.message
        }, 'square_service');
        this.isConfigured = false;
      }
    }
  }

  private validateCredentials() {
    if (!this.isConfigured || !this.client) {
      throw new Error('Square API integration requires valid credentials. Please provide SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }
  }

  async createGiftCard(): Promise<any> {
    this.validateCredentials();
    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await this.client.giftCardsApi.createGiftCard({
        idempotencyKey,
        locationId: this.locationId,
        giftCard: { type: 'DIGITAL' },
      });
      
      activityLogger.log('gift_card_activity', {
        action: 'create_gift_card',
        giftCardId: result.giftCard?.id,
        gan: result.giftCard?.gan,
        idempotencyKey
      }, 'square_service');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', {
        action: 'create_gift_card_failed',
        error: error.message,
        body: error.body
      }, 'square_service');
      throw new Error(`Square API Error: ${error.message}`);
    }
  }

  async loadGiftCard(giftCardId: string, amountCents: number): Promise<any> {
    this.validateCredentials();
    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await this.client.giftCardsApi.createGiftCardActivity({
        idempotencyKey,
        giftCardActivity: {
          type: 'LOAD',
          locationId: this.locationId,
          giftCardId,
          loadActivityDetails: {
            amountMoney: {
              amount: BigInt(amountCents),
              currency: 'USD'
            }
          }
        }
      });
      
      activityLogger.log('gift_card_activity', {
        action: 'load_gift_card',
        giftCardId,
        amount: amountCents,
        activityId: result.giftCardActivity?.id
      }, 'square_service');
      
      return result.giftCardActivity;
    } catch (error: any) {
      activityLogger.log('error', {
        action: 'load_gift_card_failed',
        giftCardId,
        amount: amountCents,
        error: error.message
      }, 'square_service');
      throw new Error(`Square API Error: ${error.message}`);
    }
  }

  async redeemGiftCard(giftCardId: string, amountCents: number): Promise<any> {
    this.validateCredentials();
    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await this.client.giftCardsApi.createGiftCardActivity({
        idempotencyKey,
        giftCardActivity: {
          type: 'REDEEM',
          locationId: this.locationId,
          giftCardId,
          redeemActivityDetails: {
            amountMoney: {
              amount: BigInt(amountCents),
              currency: 'USD'
            }
          }
        }
      });
      
      activityLogger.log('gift_card_activity', {
        action: 'redeem_gift_card',
        giftCardId,
        amount: amountCents,
        activityId: result.giftCardActivity?.id
      }, 'square_service');
      
      return result.giftCardActivity;
    } catch (error: any) {
      activityLogger.log('error', {
        action: 'redeem_gift_card_failed',
        giftCardId,
        amount: amountCents,
        error: error.message
      }, 'square_service');
      throw new Error(`Square API Error: ${error.message}`);
    }
  }

  async retrieveGiftCard(giftCardId: string): Promise<any> {
    this.validateCredentials();
    
    try {
      const { result } = await this.client.giftCardsApi.retrieveGiftCardFromGAN({
        gan: giftCardId
      });
      
      activityLogger.log('gift_card_activity', {
        action: 'retrieve_gift_card',
        giftCardId,
        balance: result.giftCard?.balanceMoney
      }, 'square_service');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', {
        action: 'retrieve_gift_card_failed',
        giftCardId,
        error: error.message
      }, 'square_service');
      throw new Error(`Square API Error: ${error.message}`);
    }
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      environment: this.environment,
      locationId: this.isConfigured ? this.locationId : null,
      hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
      clientInitialized: !!this.client
    };
  }
}

export const squareService = new SquareService();