import { v4 as uuidv4 } from 'uuid';
import { activityLogger } from '../db/activity-log';

// Check if Square credentials are configured
const hasSquareCredentials = () => {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
};

// Mock Square client for development - replace with actual Square SDK when credentials are configured
const createMockClient = () => ({
  giftCardsApi: {
    createGiftCard: async () => ({ 
      result: { 
        giftCard: { 
          id: `giftcard_${uuidv4()}`, 
          type: 'DIGITAL',
          state: 'ACTIVE'
        } 
      } 
    }),
    retrieveGiftCard: async (cardId: string) => ({ 
      result: { 
        giftCard: { 
          id: cardId, 
          balanceMoney: { amount: 5000, currency: 'USD' },
          state: 'ACTIVE'
        } 
      } 
    }),
    loadGiftCard: async () => ({ 
      result: { 
        giftCard: { 
          id: `giftcard_${uuidv4()}`, 
          balanceMoney: { amount: 5000, currency: 'USD' } 
        } 
      } 
    })
  }
});

const client = hasSquareCredentials() ? null : createMockClient();

const locationId = process.env.SQUARE_LOCATION_ID || '';

export const SquareGiftCardService = {
  async issueGiftCard() {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await client.giftCardsApi.createGiftCard({
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

  // Phase 2.5: Admin Toolkit Methods
  async listGiftCards(filters = {}) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    try {
      const { result } = await client.giftCardsApi.listGiftCards(filters);
      
      activityLogger.log('gift_card_activity', { 
        action: 'list_gift_cards', 
        filters,
        count: result.giftCards?.length || 0
      }, 'square_api');
      
      return result.giftCards;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'list_gift_cards', 
        filters,
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },

  async retrieveFromGAN(gan: string) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    try {
      const { result } = await client.giftCardsApi.retrieveGiftCardFromGAN({ gan });
      
      activityLogger.log('gift_card_activity', { 
        action: 'retrieve_from_gan', 
        gan,
        giftCardId: result.giftCard?.id
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'retrieve_from_gan', 
        gan,
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },

  async retrieveFromNonce(nonce: string) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    try {
      const { result } = await client.giftCardsApi.retrieveGiftCardFromNonce({ nonce });
      
      activityLogger.log('gift_card_activity', { 
        action: 'retrieve_from_nonce', 
        nonce,
        giftCardId: result.giftCard?.id
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'retrieve_from_nonce', 
        nonce,
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },

  async linkCustomer(giftCardId: string, customerId: string) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    try {
      const { result } = await client.giftCardsApi.linkCustomerToGiftCard(giftCardId, { customerId });
      
      activityLogger.log('gift_card_activity', { 
        action: 'link_customer', 
        giftCardId,
        customerId
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'link_customer', 
        giftCardId,
        customerId,
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },

  async unlinkCustomer(giftCardId: string, customerId: string) {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    try {
      const { result } = await client.giftCardsApi.unlinkCustomerFromGiftCard(giftCardId, { customerId });
      
      activityLogger.log('gift_card_activity', { 
        action: 'unlink_customer', 
        giftCardId,
        customerId
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'unlink_customer', 
        giftCardId,
        customerId,
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },

  async issuePhysicalOrDigital(type: "PHYSICAL" | "DIGITAL") {
    if (!hasSquareCredentials() || !client) {
      throw new Error('Square API credentials not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
    }

    const idempotencyKey = uuidv4();
    
    try {
      const { result } = await client.giftCardsApi.createGiftCard({
        idempotencyKey,
        locationId,
        giftCard: {
          type,
          ganSource: "SQUARE",
        },
      });
      
      activityLogger.log('gift_card_activity', { 
        action: 'issue_physical_or_digital', 
        type,
        idempotencyKey,
        giftCardId: result.giftCard?.id
      }, 'square_api');
      
      return result.giftCard;
    } catch (error: any) {
      activityLogger.log('error', { 
        action: 'issue_physical_or_digital', 
        type,
        error: error.message 
      }, 'square_api');
      throw error;
    }
  },
};