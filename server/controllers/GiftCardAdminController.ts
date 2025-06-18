import { Request, Response } from 'express';
import { SquareGiftCardService } from '../services/SquareGiftCardServiceFixed';

export const GiftCardAdminController = {
  async list(req: Request, res: Response) {
    try {
      const cards = await SquareGiftCardService.listGiftCards(req.query);
      res.json({ success: true, giftCards: cards });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async gan(req: Request, res: Response) {
    try {
      const { gan } = req.body;
      if (!gan) {
        return res.status(400).json({ success: false, error: 'GAN is required' });
      }
      
      const card = await SquareGiftCardService.retrieveFromGAN(gan);
      res.json({ success: true, giftCard: card });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async nonce(req: Request, res: Response) {
    try {
      const { nonce } = req.body;
      if (!nonce) {
        return res.status(400).json({ success: false, error: 'Nonce is required' });
      }
      
      const card = await SquareGiftCardService.retrieveFromNonce(nonce);
      res.json({ success: true, giftCard: card });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async link(req: Request, res: Response) {
    try {
      const { giftCardId, customerId } = req.body;
      if (!giftCardId || !customerId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Both giftCardId and customerId are required' 
        });
      }
      
      const card = await SquareGiftCardService.linkCustomer(giftCardId, customerId);
      res.json({ success: true, giftCard: card });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async unlink(req: Request, res: Response) {
    try {
      const { giftCardId, customerId } = req.body;
      if (!giftCardId || !customerId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Both giftCardId and customerId are required' 
        });
      }
      
      const card = await SquareGiftCardService.unlinkCustomer(giftCardId, customerId);
      res.json({ success: true, giftCard: card });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async issue(req: Request, res: Response) {
    try {
      const { type } = req.body;
      if (!type || !['PHYSICAL', 'DIGITAL'].includes(type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Type must be either PHYSICAL or DIGITAL' 
        });
      }
      
      const card = await SquareGiftCardService.issuePhysicalOrDigital(type);
      res.json({ success: true, giftCard: card });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};