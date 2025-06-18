import { Request, Response } from 'express';
import { squareApiService } from '../services/SquareApiService';

export const GiftCardController = {
  async issue(req: Request, res: Response) {
    try {
      const card = await squareApiService.issueGiftCard();
      res.json({ success: true, card });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async reload(req: Request, res: Response) {
    const { giftCardId, amount } = req.body;
    try {
      const activity = await squareApiService.reloadGiftCard(giftCardId, amount);
      res.json({ success: true, activity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async redeem(req: Request, res: Response) {
    const { giftCardId, amount } = req.body;
    try {
      const activity = await squareApiService.redeemGiftCard(giftCardId, amount);
      res.json({ success: true, activity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async balance(req: Request, res: Response) {
    const { giftCardId } = req.params;
    try {
      const balance = await squareApiService.checkBalance(giftCardId);
      res.json({ success: true, balance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};