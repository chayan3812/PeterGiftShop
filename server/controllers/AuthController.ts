import { Request, Response } from 'express';
import { fusionAuthService } from '../services/FusionAuthService';

export const AuthController = {
  async tokenExchange(req: Request, res: Response) {
    try {
      const { code, client_id, client_secret, redirect_uri } = req.body;

      if (!code || !client_id || !client_secret || !redirect_uri) {
        return res.status(400).json({
          error: 'Missing required parameters',
          required: ['code', 'client_id', 'client_secret', 'redirect_uri']
        });
      }

      const tokens = await fusionAuthService.exchangeOAuthCodeForToken(
        code,
        client_id,
        client_secret,
        redirect_uri
      );

      // Set secure HTTP-only cookies
      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in * 1000
      });

      if (tokens.refresh_token) {
        res.cookie('refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      res.json({
        success: true,
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in
      });
    } catch (error) {
      console.error('[AUTH] Token exchange failed:', error);
      res.status(400).json({
        error: 'Token exchange failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token, client_id, client_secret } = req.body;
      const refreshTokenFromCookie = req.cookies.refresh_token;

      const refreshToken = refresh_token || refreshTokenFromCookie;

      if (!refreshToken || !client_id || !client_secret) {
        return res.status(400).json({
          error: 'Missing required parameters',
          required: ['refresh_token', 'client_id', 'client_secret']
        });
      }

      const tokens = await fusionAuthService.refreshAccessToken(
        refreshToken,
        client_id,
        client_secret
      );

      // Update cookies
      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in * 1000
      });

      if (tokens.refresh_token) {
        res.cookie('refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      }

      res.json({
        success: true,
        access_token: tokens.access_token,
        expires_in: tokens.expires_in
      });
    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error);
      res.status(400).json({
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async userInfo(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const tokenFromCookie = req.cookies.access_token;

      let accessToken = tokenFromCookie;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }

      if (!accessToken) {
        return res.status(401).json({
          error: 'Access token required'
        });
      }

      const userInfo = await fusionAuthService.getUserInfo(accessToken);
      res.json(userInfo);
    } catch (error) {
      console.error('[AUTH] User info failed:', error);
      res.status(401).json({
        error: 'Failed to retrieve user info',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      // Clear authentication cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('[AUTH] Logout failed:', error);
      res.status(500).json({
        error: 'Logout failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async status(req: Request, res: Response) {
    try {
      const status = fusionAuthService.getStatus();
      res.json({
        ...status,
        message: status.configured 
          ? 'FusionAuth is properly configured' 
          : 'FusionAuth credentials not found. Please set FUSIONAUTH_API_KEY and FUSIONAUTH_APPLICATION_ID environment variables.'
      });
    } catch (error) {
      console.error('[AUTH] Status check failed:', error);
      res.status(500).json({
        error: 'Failed to check authentication status'
      });
    }
  }
};