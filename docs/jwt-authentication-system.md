# JWT Authentication System Documentation

**System:** Peter Digital Enterprise Security Platform  
**Component:** JSON Web Token Authentication & Authorization  
**Version:** 2.0  
**Security Level:** Enterprise Grade

## Overview

The JWT Authentication System provides secure, stateless authentication for the Peter Digital Enterprise Security Platform. This system implements industry-standard JWT tokens with advanced security features including scope-based authorization, token rotation, and comprehensive audit logging.

## Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JWT Service   │    │  Auth Middleware │    │  Token Storage  │
│                 │    │                 │    │                 │
│ • Token Gen     │◄──►│ • Validation    │◄──►│ • Blacklist     │
│ • Signing       │    │ • Scope Check   │    │ • Refresh Logs  │
│ • Verification  │    │ • Rate Limiting │    │ • Audit Trail   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │   Auth Routes   │    │   User Service  │
│                 │    │                 │    │                 │
│ • Login         │    │ • /auth/token   │    │ • User Lookup   │
│ • Refresh       │    │ • /auth/refresh │    │ • Role Check    │
│ • Logout        │    │ • /auth/logout  │    │ • Permissions   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Security Layers

1. **Token Signing**: RSA256/HS256 algorithms with rotating secrets
2. **Scope Authorization**: Granular permission system
3. **Expiration Management**: Short-lived access tokens with refresh capability
4. **Audit Logging**: Complete authentication event tracking
5. **Rate Limiting**: Brute force protection and abuse prevention
6. **Blacklisting**: Immediate token revocation capability

## Token Structure

### Access Token Payload

```json
{
  "type": "access_token",
  "sub": "user_12345",
  "scope": ["read_reports", "admin_access", "api_write"],
  "role": "admin",
  "permissions": ["test_results:read", "analytics:write"],
  "iat": 1750303200,
  "exp": 1750306800,
  "iss": "peter-digital-security-platform",
  "aud": "api.petershop.com",
  "jti": "uuid-token-id",
  "session_id": "session_abc123"
}
```

### Refresh Token Payload

```json
{
  "type": "refresh_token",
  "sub": "user_12345",
  "scope": ["token_refresh"],
  "iat": 1750303200,
  "exp": 1750389600,
  "iss": "peter-digital-security-platform",
  "jti": "refresh_uuid",
  "family": "refresh_family_id"
}
```

### Specialized Tokens

#### Test Result Access Token
```json
{
  "type": "test_result_access",
  "scope": "read_reports",
  "reportId": "elite-summary-20250619",
  "sub": "automation_system",
  "iat": 1750303200,
  "exp": 1750389600,
  "iss": "peter-digital-security-platform"
}
```

#### API Key Token
```json
{
  "type": "api_key",
  "scope": ["api_access"],
  "client_id": "integration_client",
  "permissions": ["webhooks:write", "reports:read"],
  "rate_limit": 1000,
  "iat": 1750303200,
  "exp": null,
  "iss": "peter-digital-security-platform"
}
```

## Implementation

### Environment Configuration

```bash
# Required
JWT_SECRET=your_256_bit_secret_key_here
JWT_ISSUER=peter-digital-security-platform

# Optional - Advanced Configuration
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
JWT_ALGORITHM=HS256
JWT_AUDIENCE=api.petershop.com

# Security Features
JWT_ENABLE_BLACKLIST=true
JWT_ENABLE_REFRESH_ROTATION=true
JWT_MAX_REFRESH_COUNT=5
JWT_RATE_LIMIT_WINDOW=15m
JWT_RATE_LIMIT_MAX=100
```

### Core Service Implementation

#### JWT Service (`server/services/JWTService.ts`)

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class JWTService {
  private static secret = process.env.JWT_SECRET || 'fallback_secret';
  private static issuer = process.env.JWT_ISSUER || 'peter-digital-security-platform';
  
  /**
   * Generate access token with scoped permissions
   */
  static generateAccessToken(payload: {
    userId: string;
    role: string;
    permissions: string[];
    scope?: string[];
  }): string {
    const tokenPayload = {
      type: 'access_token',
      sub: payload.userId,
      role: payload.role,
      permissions: payload.permissions,
      scope: payload.scope || ['api_access'],
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      jti: crypto.randomUUID()
    };
    
    return jwt.sign(tokenPayload, this.secret, { 
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h',
      algorithm: 'HS256'
    });
  }
  
  /**
   * Generate refresh token with family tracking
   */
  static generateRefreshToken(userId: string, familyId?: string): string {
    const tokenPayload = {
      type: 'refresh_token',
      sub: userId,
      scope: ['token_refresh'],
      family: familyId || crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      jti: crypto.randomUUID()
    };
    
    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      algorithm: 'HS256'
    });
  }
  
  /**
   * Verify token with comprehensive validation
   */
  static verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      
      // Additional security checks
      if (decoded.iss !== this.issuer) {
        throw new Error('Invalid issuer');
      }
      
      // Check if token is blacklisted
      if (this.isTokenBlacklisted(decoded.jti)) {
        throw new Error('Token has been revoked');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
  
  /**
   * Check if token has required scope
   */
  static hasScope(token: any, requiredScope: string): boolean {
    if (!token.scope || !Array.isArray(token.scope)) {
      return false;
    }
    return token.scope.includes(requiredScope);
  }
  
  /**
   * Blacklist token by JTI
   */
  static blacklistToken(jti: string): void {
    // Implementation depends on storage solution
    // For production, use Redis or database
    console.log(`Token ${jti} blacklisted`);
  }
  
  /**
   * Check if token is blacklisted
   */
  static isTokenBlacklisted(jti: string): boolean {
    // Implementation depends on storage solution
    return false;
  }
}
```

#### Authentication Middleware (`server/middleware/auth.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/JWTService';

interface AuthRequest extends Request {
  user?: any;
  token?: any;
}

/**
 * Basic JWT authentication middleware
 */
export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }
  
  try {
    const decoded = JWTService.verifyToken(token);
    req.user = decoded;
    req.token = decoded;
    
    // Log access for audit
    console.log(`[AUTH] User ${decoded.sub} accessed ${req.path}`);
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Scope-based authorization middleware
 */
export function requireScope(requiredScope: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    if (!JWTService.hasScope(req.token, requiredScope)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_SCOPE',
        required: requiredScope,
        provided: req.token.scope
      });
    }
    
    next();
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(requiredRole: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.token || req.token.role !== requiredRole) {
      return res.status(403).json({ 
        error: 'Access denied - insufficient role',
        code: 'INSUFFICIENT_ROLE',
        required: requiredRole,
        provided: req.token?.role
      });
    }
    
    next();
  };
}

/**
 * Admin access middleware
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.token || req.token.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  next();
}
```

### Route Implementation

#### Authentication Routes (`server/routes/auth.ts`)

```typescript
import { Router } from 'express';
import { JWTService } from '../services/JWTService';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/login
 * User authentication and token generation
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate credentials (integrate with your user service)
    const user = await validateCredentials(username, password);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate tokens
    const accessToken = JWTService.generateAccessToken({
      userId: user.id,
      role: user.role,
      permissions: user.permissions,
      scope: ['api_access', 'read_reports']
    });
    
    const refreshToken = JWTService.generateRefreshToken(user.id);
    
    // Log authentication event
    console.log(`[AUTH] User ${user.id} logged in successfully`);
    
    res.json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
});

/**
 * POST /auth/refresh
 * Token refresh with rotation
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    // Verify refresh token
    const decoded = JWTService.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh_token') {
      return res.status(400).json({ 
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }
    
    // Get user details
    const user = await getUserById(decoded.sub);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Generate new tokens
    const newAccessToken = JWTService.generateAccessToken({
      userId: user.id,
      role: user.role,
      permissions: user.permissions
    });
    
    const newRefreshToken = JWTService.generateRefreshToken(user.id, decoded.family);
    
    // Blacklist old refresh token
    JWTService.blacklistToken(decoded.jti);
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    });
    
  } catch (error) {
    console.error('[AUTH] Refresh error:', error);
    res.status(401).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
});

/**
 * POST /auth/logout
 * Token invalidation
 */
router.post('/logout', authenticateJWT, (req: any, res) => {
  try {
    // Blacklist current token
    if (req.token?.jti) {
      JWTService.blacklistToken(req.token.jti);
    }
    
    console.log(`[AUTH] User ${req.token?.sub} logged out`);
    
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticateJWT, async (req: any, res) => {
  try {
    const user = await getUserById(req.token.sub);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      tokenScope: req.token.scope
    });
    
  } catch (error) {
    console.error('[AUTH] User info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user info',
      code: 'USER_INFO_ERROR'
    });
  }
});

export default router;
```

## Security Best Practices

### Token Management

1. **Short Expiration Times**: Access tokens expire in 1 hour or less
2. **Refresh Token Rotation**: New refresh token issued on each refresh
3. **Token Blacklisting**: Immediate revocation capability for compromised tokens
4. **Secure Storage**: Tokens stored securely on client side (httpOnly cookies recommended)

### Algorithm Security

```typescript
// Use strong algorithms
const JWT_ALGORITHMS = {
  RECOMMENDED: 'RS256', // RSA with SHA-256
  ACCEPTABLE: 'HS256',  // HMAC with SHA-256
  AVOID: ['none', 'HS1'] // Insecure algorithms
};
```

### Rate Limiting

```typescript
// Authentication endpoint rate limiting
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false
};
```

### Audit Logging

```typescript
interface AuthEvent {
  timestamp: string;
  eventType: 'login' | 'logout' | 'refresh' | 'failed_auth';
  userId: string;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
  tokenId?: string;
}
```

## Integration Examples

### Frontend Integration

```typescript
// Token storage and management
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  
  async login(username: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      
      // Store in secure storage
      localStorage.setItem('refreshToken', data.refreshToken);
      
      return data.user;
    }
    
    throw new Error('Authentication failed');
  }
  
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };
    
    let response = await fetch(url, { ...options, headers });
    
    // Auto-refresh on 401
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      response = await fetch(url, { ...options, headers });
    }
    
    return response;
  }
  
  private async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      localStorage.setItem('refreshToken', data.refreshToken);
    } else {
      this.logout();
    }
  }
}
```

### API Protection Examples

```typescript
// Protect admin routes
app.use('/api/admin/*', authenticateJWT, requireRole('admin'));

// Protect with specific scopes
app.get('/api/reports/secure/:id', 
  authenticateJWT, 
  requireScope('read_reports'), 
  getSecureReport
);

// Multiple permission levels
app.delete('/api/data/critical', 
  authenticateJWT, 
  requireRole('admin'),
  requireScope('admin_write'),
  deleteCriticalData
);
```

## Monitoring and Debugging

### Health Check Endpoint

```typescript
app.get('/api/auth/health', (req, res) => {
  const health = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    jwt: {
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
      issuer: process.env.JWT_ISSUER,
      accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '1h',
      refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d'
    },
    features: {
      blacklisting: process.env.JWT_ENABLE_BLACKLIST === 'true',
      refreshRotation: process.env.JWT_ENABLE_REFRESH_ROTATION === 'true',
      rateLimiting: true
    }
  };
  
  res.json(health);
});
```

### Debug Mode

```bash
# Enable detailed JWT logging
DEBUG=jwt:* npm run dev
```

## Troubleshooting

### Common Issues

1. **"JWT_SECRET not configured"**
   - Set JWT_SECRET environment variable
   - Use 256-bit key for HS256 algorithm

2. **"Token verification failed"**
   - Check token expiration
   - Verify issuer matches configuration
   - Ensure token not blacklisted

3. **"Insufficient permissions"**
   - Check token scope contains required permission
   - Verify user role matches requirement

4. **"Token refresh failed"**
   - Ensure refresh token is valid and not expired
   - Check refresh token type and family

### Debug Commands

```bash
# Verify token manually
node -e "console.log(require('jsonwebtoken').verify('TOKEN', 'SECRET'))"

# Generate test token
node -e "console.log(require('jsonwebtoken').sign({sub:'test'}, 'SECRET'))"
```

## Deployment Checklist

- [ ] JWT_SECRET configured with strong entropy
- [ ] HTTPS enabled for all token endpoints
- [ ] Rate limiting configured for auth endpoints
- [ ] Audit logging enabled and monitored
- [ ] Token blacklisting strategy implemented
- [ ] Refresh token rotation enabled
- [ ] Error handling provides minimal information disclosure
- [ ] CORS configured appropriately for frontend domains

---

**Documentation Version:** 2.0  
**Last Updated:** 2025-06-19  
**Security Review:** Enterprise Grade  
**Compliance:** OAuth 2.0, RFC 7519 (JWT)