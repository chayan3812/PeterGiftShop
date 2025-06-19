/**
 * Enhanced Authentication Controller for Peter Digital Enterprise Security Platform
 * Provides comprehensive JWT-based authentication with enterprise security features
 */

import { Request, Response } from 'express';
import { EnhancedJWTService } from '../services/EnhancedJWTService';
import { AuthenticatedRequest } from '../middleware/enhancedAuth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

interface RefreshRequest {
  refreshToken: string;
}

interface ApiKeyRequest {
  clientId: string;
  permissions: string[];
  description?: string;
  rateLimit?: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
}

export class EnhancedAuthController {
  /**
   * User authentication and token generation
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, rememberMe = false }: LoginRequest = req.body;

      if (!username || !password) {
        res.status(400).json({
          error: 'Username and password required',
          code: 'MISSING_CREDENTIALS'
        });
        return;
      }

      // Validate credentials against user service
      const user = await EnhancedAuthController.validateCredentials(username, password);

      if (!user) {
        // Log failed login attempt
        EnhancedAuthController.logSecurityEvent('login_failed', {
          username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'invalid_credentials'
        });

        res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          error: 'Account disabled',
          code: 'ACCOUNT_DISABLED'
        });
        return;
      }

      // Generate session ID
      const sessionId = crypto.randomUUID();

      // Generate tokens
      const accessTokenExpiry = rememberMe ? '24h' : '1h';
      const refreshTokenExpiry = rememberMe ? '30d' : '7d';

      const accessToken = EnhancedJWTService.generateAccessToken({
        userId: user.id,
        role: user.role,
        permissions: user.permissions,
        scope: ['api_access', 'read_reports'],
        sessionId
      }, accessTokenExpiry);

      const refreshToken = EnhancedJWTService.generateRefreshToken(user.id, undefined, refreshTokenExpiry);

      // Update user's last login
      await EnhancedAuthController.updateLastLogin(user.id);

      // Log successful login
      EnhancedAuthController.logSecurityEvent('login_success', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId,
        rememberMe
      });

      res.json({
        success: true,
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: rememberMe ? 86400 : 3600, // seconds
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        },
        sessionId
      });

    } catch (error) {
      console.error('[AUTH] Login error:', error);
      res.status(500).json({
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  }

  /**
   * Token refresh with rotation
   * POST /api/auth/refresh
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshRequest = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Refresh token required',
          code: 'NO_REFRESH_TOKEN'
        });
        return;
      }

      // Verify and decode refresh token
      let decoded;
      try {
        decoded = EnhancedJWTService.verifyToken(refreshToken);
      } catch (error) {
        res.status(401).json({
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
        return;
      }

      if (decoded.type !== 'refresh_token') {
        res.status(400).json({
          error: 'Invalid token type',
          code: 'INVALID_TOKEN_TYPE'
        });
        return;
      }

      // Get user details
      const user = await EnhancedAuthController.getUserById(decoded.sub);

      if (!user || !user.isActive) {
        res.status(404).json({
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Rotate tokens
      const rotationResult = EnhancedJWTService.rotateRefreshToken(refreshToken, {
        userId: user.id,
        role: user.role,
        permissions: user.permissions,
        scope: ['api_access', 'read_reports']
      });

      if (!rotationResult.success) {
        // Log security event for failed rotation
        EnhancedAuthController.logSecurityEvent('token_rotation_failed', {
          userId: decoded.sub,
          error: rotationResult.error,
          ip: req.ip
        });

        res.status(401).json({
          error: rotationResult.error || 'Token rotation failed',
          code: 'ROTATION_FAILED'
        });
        return;
      }

      // Log successful token rotation
      EnhancedAuthController.logSecurityEvent('token_refreshed', {
        userId: user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        accessToken: rotationResult.accessToken,
        refreshToken: rotationResult.refreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

    } catch (error) {
      console.error('[AUTH] Refresh error:', error);
      res.status(500).json({
        error: 'Token refresh service unavailable',
        code: 'REFRESH_SERVICE_ERROR'
      });
    }
  }

  /**
   * User logout and token invalidation
   * POST /api/auth/logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.authContext?.userId;
      const tokenId = req.token?.jti;

      if (tokenId) {
        // Blacklist current token
        EnhancedJWTService.blacklistToken(tokenId, 'User logout', userId || 'unknown');
      }

      // If refresh token provided, blacklist it too
      const { refreshToken } = req.body;
      if (refreshToken) {
        try {
          const decoded = EnhancedJWTService.verifyToken(refreshToken);
          if (decoded.jti) {
            EnhancedJWTService.blacklistToken(decoded.jti, 'User logout', userId || 'unknown');
          }
        } catch (error) {
          // Ignore errors for refresh token validation during logout
        }
      }

      // Log logout event
      EnhancedAuthController.logSecurityEvent('logout', {
        userId: userId || 'unknown',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.authContext?.sessionId
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      res.status(500).json({
        error: 'Logout service unavailable',
        code: 'LOGOUT_SERVICE_ERROR'
      });
    }
  }

  /**
   * Get current user information
   * GET /api/auth/me
   */
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.authContext?.userId;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'NO_USER_CONTEXT'
        });
        return;
      }

      const user = await EnhancedAuthController.getUserById(userId);

      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin
        },
        tokenInfo: {
          type: req.authContext?.tokenType,
          scope: req.authContext?.scope,
          sessionId: req.authContext?.sessionId
        }
      });

    } catch (error) {
      console.error('[AUTH] Get user error:', error);
      res.status(500).json({
        error: 'User service unavailable',
        code: 'USER_SERVICE_ERROR'
      });
    }
  }

  /**
   * Generate API key for service integrations
   * POST /api/auth/api-key
   */
  static async generateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only admins can generate API keys
      if (req.authContext?.role !== 'admin') {
        res.status(403).json({
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        });
        return;
      }

      const { clientId, permissions, description, rateLimit = 1000 }: ApiKeyRequest = req.body;

      if (!clientId || !permissions || !Array.isArray(permissions)) {
        res.status(400).json({
          error: 'Client ID and permissions array required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Generate API key token
      const apiKey = EnhancedJWTService.generateApiKeyToken(clientId, permissions, rateLimit);

      // Log API key generation
      EnhancedAuthController.logSecurityEvent('api_key_generated', {
        clientId,
        permissions,
        description,
        rateLimit,
        generatedBy: req.authContext?.userId,
        ip: req.ip
      });

      res.json({
        success: true,
        apiKey,
        clientId,
        permissions,
        rateLimit,
        description,
        createdAt: new Date().toISOString(),
        usage: 'Include in X-API-Key header for requests'
      });

    } catch (error) {
      console.error('[AUTH] API key generation error:', error);
      res.status(500).json({
        error: 'API key service unavailable',
        code: 'API_KEY_SERVICE_ERROR'
      });
    }
  }

  /**
   * Revoke tokens (emergency logout)
   * POST /api/auth/revoke
   */
  static async revokeTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tokenIds, reason = 'Manual revocation' } = req.body;
      const userId = req.authContext?.userId;

      if (!tokenIds || !Array.isArray(tokenIds)) {
        res.status(400).json({
          error: 'Token IDs array required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Only admins or the token owner can revoke tokens
      const isAdmin = req.authContext?.role === 'admin';

      let revokedCount = 0;
      for (const tokenId of tokenIds) {
        try {
          // In production, verify token ownership before revoking
          EnhancedJWTService.blacklistToken(tokenId, reason, userId || 'admin');
          revokedCount++;
        } catch (error) {
          console.warn(`Failed to revoke token ${tokenId}:`, error);
        }
      }

      // Log revocation event
      EnhancedAuthController.logSecurityEvent('tokens_revoked', {
        tokenIds,
        reason,
        revokedCount,
        revokedBy: userId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: `${revokedCount} tokens revoked successfully`,
        revokedCount,
        totalRequested: tokenIds.length
      });

    } catch (error) {
      console.error('[AUTH] Token revocation error:', error);
      res.status(500).json({
        error: 'Token revocation service unavailable',
        code: 'REVOCATION_SERVICE_ERROR'
      });
    }
  }

  /**
   * Get authentication service status and statistics
   * GET /api/auth/status
   */
  static async getAuthStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = EnhancedJWTService.getStats();

      res.json({
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        service: 'Enhanced JWT Authentication',
        version: '2.0',
        statistics: stats,
        endpoints: {
          login: '/api/auth/login',
          refresh: '/api/auth/refresh',
          logout: '/api/auth/logout',
          me: '/api/auth/me',
          apiKey: '/api/auth/api-key',
          revoke: '/api/auth/revoke',
          status: '/api/auth/status'
        }
      });

    } catch (error) {
      console.error('[AUTH] Status check error:', error);
      res.status(500).json({
        error: 'Status service unavailable',
        code: 'STATUS_SERVICE_ERROR'
      });
    }
  }

  /**
   * Validate user credentials (mock implementation for demo)
   * In production, integrate with your user management system
   */
  private static async validateCredentials(username: string, password: string): Promise<User | null> {
    // Demo users for development
    const demoUsers: User[] = [
      {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@petershop.com',
        role: 'admin',
        permissions: ['read', 'write', 'admin', 'test_results:read', 'api_access'],
        isActive: true
      },
      {
        id: 'user-001',
        username: 'user',
        email: 'user@petershop.com',
        role: 'user',
        permissions: ['read', 'test_results:read'],
        isActive: true
      },
      {
        id: 'auditor-001',
        username: 'auditor',
        email: 'auditor@petershop.com',
        role: 'auditor',
        permissions: ['read', 'test_results:read', 'audit_access'],
        isActive: true
      }
    ];

    // Simple password validation for demo (use proper hashing in production)
    const validPasswords: Record<string, string> = {
      'admin': 'admin123',
      'user': 'user123',
      'auditor': 'audit123'
    };

    const user = demoUsers.find(u => u.username === username);
    if (user && validPasswords[username] === password) {
      return user;
    }

    return null;
  }

  /**
   * Get user by ID (mock implementation for demo)
   */
  private static async getUserById(userId: string): Promise<User | null> {
    const demoUsers: User[] = [
      {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@petershop.com',
        role: 'admin',
        permissions: ['read', 'write', 'admin', 'test_results:read', 'api_access'],
        isActive: true,
        lastLogin: new Date().toISOString()
      },
      {
        id: 'user-001',
        username: 'user',
        email: 'user@petershop.com',
        role: 'user',
        permissions: ['read', 'test_results:read'],
        isActive: true
      },
      {
        id: 'auditor-001',
        username: 'auditor',
        email: 'auditor@petershop.com',
        role: 'auditor',
        permissions: ['read', 'test_results:read', 'audit_access'],
        isActive: true
      }
    ];

    return demoUsers.find(u => u.id === userId) || null;
  }

  /**
   * Update user's last login timestamp
   */
  private static async updateLastLogin(userId: string): Promise<void> {
    // In production, update database
    console.log(`[AUTH] Updated last login for user ${userId}`);
  }

  /**
   * Log security events for audit trail
   */
  private static logSecurityEvent(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      source: 'auth_controller'
    };

    console.log(`[AUTH_SECURITY] ${event}:`, JSON.stringify(logEntry));

    // Write to security log file
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, 'auth-security.log');
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('[AUTH] Failed to write security log:', error);
    }
  }
}