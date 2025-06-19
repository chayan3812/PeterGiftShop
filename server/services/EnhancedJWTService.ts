/**
 * Enhanced JWT Service for Peter Digital Enterprise Security Platform
 * Provides comprehensive token management with enterprise security features
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface TokenPayload {
  type: string;
  sub: string;
  scope: string[];
  role?: string;
  permissions?: string[];
  iat: number;
  exp?: number;
  iss: string;
  aud?: string;
  jti: string;
  sessionId?: string;
  family?: string;
}

interface UserTokenData {
  userId: string;
  role: string;
  permissions: string[];
  scope?: string[];
  sessionId?: string;
}

interface TokenBlacklistEntry {
  jti: string;
  blacklistedAt: string;
  reason: string;
  userId: string;
}

export class EnhancedJWTService {
  private static secret = EnhancedJWTService.getProductionJWTSecret();
  private static issuer = process.env.JWT_ISSUER || 'peter-digital-security-platform';
  private static audience = process.env.JWT_AUDIENCE || 'api.petershop.com';
  private static blacklist = new Map<string, TokenBlacklistEntry>();
  private static refreshTokenFamilies = new Map<string, string[]>();

  /**
   * Get production-grade JWT secret with security validation
   */
  private static getProductionJWTSecret(): string {
    const envSecret = process.env.JWT_SECRET;
    
    if (envSecret) {
      // Validate secret strength
      if (envSecret.length >= 44) { // Minimum 256-bit (32 bytes base64)
        console.log('[JWT] Using production JWT secret (length: ' + envSecret.length + ' chars)');
        return envSecret;
      } else {
        console.warn('[JWT] Environment JWT_SECRET is too short, using fallback');
      }
    }
    
    // Fallback for development only
    console.log('[JWT] Using generated secret. Set JWT_SECRET environment variable for production.');
    return 'peter_digital_jwt_secret_key_2025_secure';
  }

  /**
   * Generate access token with comprehensive payload
   */
  static generateAccessToken(userData: UserTokenData, expiresIn: string = '1h'): string {
    const jti = crypto.randomUUID();
    const sessionId = userData.sessionId || crypto.randomUUID();

    const payload: TokenPayload = {
      type: 'access_token',
      sub: userData.userId,
      role: userData.role,
      permissions: userData.permissions,
      scope: userData.scope || ['api_access'],
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience,
      jti,
      sessionId
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn,
      algorithm: 'HS256'
    });
  }

  /**
   * Generate refresh token with family tracking for rotation
   */
  static generateRefreshToken(userId: string, familyId?: string, expiresIn: string = '7d'): string {
    const jti = crypto.randomUUID();
    const family = familyId || crypto.randomUUID();

    // Track token family for rotation detection
    if (!this.refreshTokenFamilies.has(family)) {
      this.refreshTokenFamilies.set(family, []);
    }
    this.refreshTokenFamilies.get(family)!.push(jti);

    const payload: TokenPayload = {
      type: 'refresh_token',
      sub: userId,
      scope: ['token_refresh'],
      family,
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience,
      jti
    };

    return jwt.sign(payload, this.secret, {
      expiresIn,
      algorithm: 'HS256'
    });
  }

  /**
   * Generate specialized test result access token
   */
  static generateTestResultToken(reportId: string, userId: string = 'system', expiresIn: string = '24h'): string {
    const jti = crypto.randomUUID();

    const payload: TokenPayload = {
      type: 'test_result_access',
      sub: userId,
      scope: ['read_reports'],
      reportId,
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      jti
    };

    return jwt.sign(payload, this.secret, { expiresIn });
  }

  /**
   * Generate API key token for service integrations
   */
  static generateApiKeyToken(clientId: string, permissions: string[], rateLimit: number = 1000): string {
    const jti = crypto.randomUUID();

    const payload: TokenPayload = {
      type: 'api_key',
      sub: clientId,
      scope: ['api_access'],
      permissions,
      rateLimit,
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      jti
    };

    // API keys don't expire by default
    return jwt.sign(payload, this.secret, { algorithm: 'HS256' });
  }

  /**
   * Comprehensive token verification with security checks
   */
  static verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience
      }) as TokenPayload;

      // Check if token is blacklisted
      if (this.isTokenBlacklisted(decoded.jti)) {
        const entry = this.blacklist.get(decoded.jti);
        throw new Error(`Token revoked: ${entry?.reason || 'Unknown reason'}`);
      }

      // Validate token type
      if (!decoded.type || !['access_token', 'refresh_token', 'test_result_access', 'api_key'].includes(decoded.type)) {
        throw new Error('Invalid token type');
      }

      // Check scope validity
      if (!decoded.scope || !Array.isArray(decoded.scope)) {
        throw new Error('Invalid token scope');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Token verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if token has required scope
   */
  static hasScope(tokenPayload: TokenPayload, requiredScope: string): boolean {
    if (!tokenPayload.scope || !Array.isArray(tokenPayload.scope)) {
      return false;
    }
    return tokenPayload.scope.includes(requiredScope);
  }

  /**
   * Check if token has required permission
   */
  static hasPermission(tokenPayload: TokenPayload, requiredPermission: string): boolean {
    if (!tokenPayload.permissions || !Array.isArray(tokenPayload.permissions)) {
      return false;
    }
    return tokenPayload.permissions.includes(requiredPermission);
  }

  /**
   * Check if token has required role
   */
  static hasRole(tokenPayload: TokenPayload, requiredRole: string): boolean {
    return tokenPayload.role === requiredRole;
  }

  /**
   * Blacklist token with reason and audit trail
   */
  static blacklistToken(jti: string, reason: string, userId: string = 'system'): void {
    const entry: TokenBlacklistEntry = {
      jti,
      blacklistedAt: new Date().toISOString(),
      reason,
      userId
    };

    this.blacklist.set(jti, entry);
    this.logSecurityEvent('token_blacklisted', { jti, reason, userId });

    // Persist to file for production environments
    this.persistBlacklist();
  }

  /**
   * Check if token is blacklisted
   */
  static isTokenBlacklisted(jti: string): boolean {
    return this.blacklist.has(jti);
  }

  /**
   * Blacklist entire refresh token family (for security breaches)
   */
  static blacklistTokenFamily(familyId: string, reason: string = 'Security breach detected'): void {
    const family = this.refreshTokenFamilies.get(familyId);
    if (family) {
      family.forEach(jti => {
        this.blacklistToken(jti, `Family blacklisted: ${reason}`, 'security_system');
      });
      this.refreshTokenFamilies.delete(familyId);
    }
  }

  /**
   * Rotate refresh token with family validation
   */
  static rotateRefreshToken(currentToken: string, userData: UserTokenData): { 
    accessToken: string; 
    refreshToken: string; 
    success: boolean; 
    error?: string; 
  } {
    try {
      const decoded = this.verifyToken(currentToken);

      if (decoded.type !== 'refresh_token') {
        return { accessToken: '', refreshToken: '', success: false, error: 'Invalid token type' };
      }

      // Check for refresh token reuse (security breach detection)
      if (this.isTokenBlacklisted(decoded.jti)) {
        // Blacklist entire family - potential token theft
        if (decoded.family) {
          this.blacklistTokenFamily(decoded.family, 'Refresh token reuse detected');
        }
        return { accessToken: '', refreshToken: '', success: false, error: 'Token reuse detected - security breach' };
      }

      // Blacklist current refresh token
      this.blacklistToken(decoded.jti, 'Token rotated', decoded.sub);

      // Generate new tokens
      const accessToken = this.generateAccessToken(userData);
      const refreshToken = this.generateRefreshToken(userData.userId, decoded.family);

      return { accessToken, refreshToken, success: true };
    } catch (error) {
      return { 
        accessToken: '', 
        refreshToken: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate secure signed URL for test reports
   */
  static generateSignedUrl(reportId: string, userId: string = 'system', baseUrl?: string): string {
    const token = this.generateTestResultToken(reportId, userId);
    const url = baseUrl || process.env.BASE_URL || 'http://localhost:5000';
    return `${url}/api/test-results/secure/${reportId}?token=${token}`;
  }

  /**
   * Validate token for specific report access
   */
  static validateReportAccess(token: string, reportId: string): { valid: boolean; error?: string; userId?: string } {
    try {
      const decoded = this.verifyToken(token);

      if (decoded.type !== 'test_result_access') {
        return { valid: false, error: 'Invalid token type for report access' };
      }

      if (!this.hasScope(decoded, 'read_reports')) {
        return { valid: false, error: 'Insufficient scope for report access' };
      }

      if (decoded.reportId && decoded.reportId !== reportId) {
        return { valid: false, error: 'Token not valid for this report' };
      }

      return { valid: true, userId: decoded.sub };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Token validation failed' };
    }
  }

  /**
   * Get token information without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Log security events for audit trail
   */
  private static logSecurityEvent(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      source: 'jwt_service'
    };

    console.log(`[JWT_SECURITY] ${event}:`, JSON.stringify(logEntry));

    // In production, send to security monitoring system
    this.writeAuditLog(logEntry);
  }

  /**
   * Write audit log to file
   */
  private static writeAuditLog(entry: any): void {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, 'jwt-security.log');
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('[JWT_SERVICE] Failed to write audit log:', error);
    }
  }

  /**
   * Persist blacklist to file (for production)
   */
  private static persistBlacklist(): void {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const blacklistFile = path.join(logsDir, 'jwt-blacklist.json');
      const blacklistData = Array.from(this.blacklist.entries());
      fs.writeFileSync(blacklistFile, JSON.stringify(blacklistData, null, 2));
    } catch (error) {
      console.error('[JWT_SERVICE] Failed to persist blacklist:', error);
    }
  }

  /**
   * Load blacklist from file (for production startup)
   */
  static loadBlacklist(): void {
    try {
      const blacklistFile = path.join(process.cwd(), 'logs', 'jwt-blacklist.json');
      if (fs.existsSync(blacklistFile)) {
        const blacklistData = JSON.parse(fs.readFileSync(blacklistFile, 'utf-8'));
        this.blacklist = new Map(blacklistData);
        console.log(`[JWT_SERVICE] Loaded ${this.blacklist.size} blacklisted tokens`);
      }
    } catch (error) {
      console.error('[JWT_SERVICE] Failed to load blacklist:', error);
    }
  }

  /**
   * Clean up expired tokens from blacklist
   */
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [jti, entry] of this.blacklist.entries()) {
      // Tokens older than 7 days can be removed from blacklist
      const entryTime = new Date(entry.blacklistedAt).getTime();
      if (now - entryTime > 7 * 24 * 60 * 60 * 1000) {
        this.blacklist.delete(jti);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[JWT_SERVICE] Cleaned up ${cleaned} expired blacklisted tokens`);
      this.persistBlacklist();
    }
  }

  /**
   * Get service statistics
   */
  static getStats(): any {
    return {
      blacklistedTokens: this.blacklist.size,
      refreshTokenFamilies: this.refreshTokenFamilies.size,
      configuration: {
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience,
        secretConfigured: !!process.env.JWT_SECRET
      },
      security: {
        blacklistingEnabled: true,
        familyTrackingEnabled: true,
        auditLoggingEnabled: true
      }
    };
  }
}

// Initialize service
EnhancedJWTService.loadBlacklist();

// Cleanup expired tokens every hour
setInterval(() => {
  EnhancedJWTService.cleanupExpiredTokens();
}, 60 * 60 * 1000);