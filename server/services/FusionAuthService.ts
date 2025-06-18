import { FusionAuthClient } from '@fusionauth/typescript-client';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    applicationId: string;
  };
}

export class FusionAuthService {
  private client: FusionAuthClient;
  private applicationId: string;

  constructor() {
    const apiKey = process.env.FUSIONAUTH_API_KEY;
    const baseUrl = process.env.FUSIONAUTH_BASE_URL || 'http://localhost:9011';
    this.applicationId = process.env.FUSIONAUTH_APPLICATION_ID || '';

    if (!apiKey) {
      console.warn('[FUSIONAUTH] API key not configured - authentication will not work');
    }

    this.client = new FusionAuthClient(apiKey || '', baseUrl);
  }

  async exchangeOAuthCodeForToken(authorizationCode: string, clientId: string, clientSecret: string, redirectURI: string) {
    try {
      const response = await this.client.exchangeOAuthCodeForAccessToken(
        authorizationCode,
        clientId,
        clientSecret,
        redirectURI
      );

      if (response.wasSuccessful() && response.response) {
        return {
          access_token: response.response.access_token,
          refresh_token: response.response.refresh_token,
          id_token: response.response.id_token,
          token_type: response.response.token_type,
          expires_in: response.response.expires_in
        };
      }

      throw new Error('Token exchange failed');
    } catch (error) {
      console.error('[FUSIONAUTH] Token exchange error:', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
    try {
      const response = await this.client.exchangeRefreshTokenForAccessToken(
        refreshToken,
        clientId,
        clientSecret
      );

      if (response.wasSuccessful() && response.response) {
        return {
          access_token: response.response.access_token,
          refresh_token: response.response.refresh_token,
          expires_in: response.response.expires_in
        };
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('[FUSIONAUTH] Token refresh error:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      const response = await this.client.retrieveUserInfoFromAccessToken(accessToken);
      
      if (response.wasSuccessful() && response.response) {
        return response.response;
      }

      throw new Error('Failed to retrieve user info');
    } catch (error) {
      console.error('[FUSIONAUTH] User info error:', error);
      throw error;
    }
  }

  verifyJWT(token: string): any {
    try {
      // In production, use the actual JWT public key from FusionAuth
      const publicKey = process.env.FUSIONAUTH_JWT_PUBLIC_KEY;
      
      if (!publicKey) {
        // For development, skip verification (NOT recommended for production)
        const decoded = jwt.decode(token);
        return decoded;
      }

      return jwt.verify(token, publicKey);
    } catch (error) {
      console.error('[FUSIONAUTH] JWT verification error:', error);
      throw error;
    }
  }

  requireAuthentication() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'MISSING_TOKEN' 
        });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = this.verifyJWT(token);
        
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          roles: decoded.roles || [],
          applicationId: decoded.applicationId
        };

        next();
      } catch (error) {
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN' 
        });
      }
    };
  }

  requireAdmin() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'MISSING_AUTH' 
        });
      }

      if (!req.user.roles.includes('admin')) {
        return res.status(403).json({ 
          error: 'Administrator privileges required',
          code: 'INSUFFICIENT_PERMISSIONS',
          userRole: req.user.roles[0] || 'customer'
        });
      }

      console.log(`[ADMIN ACCESS] ${req.user.email} accessed ${req.path}`);
      next();
    };
  }

  getStatus() {
    return {
      configured: !!process.env.FUSIONAUTH_API_KEY,
      baseUrl: process.env.FUSIONAUTH_BASE_URL || 'http://localhost:9011',
      applicationId: this.applicationId,
      hasJwtKey: !!process.env.FUSIONAUTH_JWT_PUBLIC_KEY
    };
  }
}

export const fusionAuthService = new FusionAuthService();