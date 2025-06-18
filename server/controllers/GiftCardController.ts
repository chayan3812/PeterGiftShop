import { Request, Response } from 'express';
import { squareService } from '../services/SquareService';

export const GiftCardController = {
  async issue(req: Request, res: Response) {
    try {
      const card = await squareService.createGiftCard();
      res.json({ success: true, card });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async reload(req: Request, res: Response) {
    const { giftCardId, amount } = req.body;
    try {
      const activity = await squareService.loadGiftCard(giftCardId, amount);
      res.json({ success: true, activity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async redeem(req: Request, res: Response) {
    const { giftCardId, amount } = req.body;
    try {
      const activity = await squareService.redeemGiftCard(giftCardId, amount);
      res.json({ success: true, activity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async balance(req: Request, res: Response) {
    const { giftCardId } = req.params;
    try {
      const giftCard = await squareService.retrieveGiftCard(giftCardId);
      res.json({ success: true, balance: giftCard.balanceMoney });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};