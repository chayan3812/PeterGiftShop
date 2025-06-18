import { SquareClient, SquareEnvironment } from 'square';
import { v4 as uuidv4 } from 'uuid';
import { activityLogger } from '../db/activity-log';

// Check if Square credentials are configured
const hasSquareCredentials = () => {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
};

const client = hasSquareCredentials() ? new SquareClient({
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
}) : null;

const locationId = process.env.SQUARE_LOCATION_ID || '';

export const SquareGiftCardService = {
  async issueGiftCard() {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await client.giftCards.createGiftCard({
        idempotencyKey,
        locationId,
        giftCard: { type: 'DIGITAL' },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'issue', 
        idempotencyKey, 
        giftCardId: result.giftCard?.id 
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'issue_gift_card', 
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },

  async reloadGiftCard(giftCardId: string, amountCents: number) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await client.giftCardsApi.createGiftCardActivity({
        idempotencyKey,
        giftCardActivity: {
          type: 'LOAD',
          locationId,
          giftCardId,
          loadActivityDetails: { amountMoney: { amount: BigInt(amountCents), currency: 'USD' } },
        },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'reload', 
        giftCardId, 
        amountCents, 
        activityId: result.giftCardActivity?.id 
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
  },

  async redeemGiftCard(giftCardId: string, amountCents: number) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await client.giftCardsApi.createGiftCardActivity({
        idempotencyKey,
        giftCardActivity: {
          type: 'REDEEM',
          locationId,
          giftCardId,
          redeemActivityDetails: { amountMoney: { amount: BigInt(amountCents), currency: 'USD' } },
        },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'redeem', 
        giftCardId, 
        amountCents, 
        activityId: result.giftCardActivity?.id 
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
  },

  async checkBalance(giftCardId: string) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    try {
      const { result } = await client.giftCardsApi.retrieveGiftCardFromGAN({ gan: giftCardId });
      
      activityLogger.log('gift_card_activity', { 
        action: 'check_balance', 
        giftCardId, 
        balance: result.giftCard?.balanceMoney 
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
  },
};