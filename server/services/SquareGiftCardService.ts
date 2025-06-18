import { Client, Environment } from 'squareup';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
});

const locationId = process.env.SQUARE_LOCATION_ID!;

export const SquareGiftCardService = {
  async issueGiftCard() {
    const idempotencyKey = uuidv4();
    const { result } = await client.giftCardsApi.createGiftCard({
      idempotencyKey,
      locationId,
      giftCard: { type: 'DIGITAL' },
    });
    return result.giftCard;
  },

  async reloadGiftCard(giftCardId: string, amountCents: number) {
    const idempotencyKey = uuidv4();
    const { result } = await client.giftCardsApi.createGiftCardActivity({
      idempotencyKey,
      giftCardActivity: {
        type: 'LOAD',
        locationId,
        giftCardId,
        loadActivityDetails: { amountMoney: { amount: BigInt(amountCents), currency: 'USD' } },
      },
    });
    return result.giftCardActivity;
  },

  async redeemGiftCard(giftCardId: string, amountCents: number) {
    const idempotencyKey = uuidv4();
    const { result } = await client.giftCardsApi.createGiftCardActivity({
      idempotencyKey,
      giftCardActivity: {
        type: 'REDEEM',
        locationId,
        giftCardId,
        redeemActivityDetails: { amountMoney: { amount: BigInt(amountCents), currency: 'USD' } },
      },
    });
    return result.giftCardActivity;
  },

  async checkBalance(giftCardId: string) {
    const { result } = await client.giftCardsApi.retrieveGiftCardFromGAN({ gan: giftCardId });
    return result.giftCard?.balanceMoney;
  },
};