/**
 * Enhanced Authentication Middleware for Peter Digital Enterprise Security Platform
 * Provides comprehensive JWT validation, scope checking, and security monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { EnhancedJWTService } from '../services/EnhancedJWTService';

interface AuthenticatedRequest extends Request {
  user?: any;
  token?: any;
  authContext?: {
    userId: string;
    role: string;
    permissions: string[];
    scope: string[];
    sessionId?: string;
    tokenType: string;
  };
}

/**
 * Core JWT authentication middleware with enhanced security
 */
export function enhancedAuthenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_TOKEN',
      message: 'Access token must be provided in Authorization header'
    });
  }
  
  try {
    const decoded = EnhancedJWTService.verifyToken(token);
    
    // Create auth context
    req.authContext = {
      userId: decoded.sub,
      role: decoded.role || 'user',
      permissions: decoded.permissions || [],
      scope: decoded.scope || [],
      sessionId: decoded.sessionId,
      tokenType: decoded.type
    };
    
    // Legacy compatibility
    req.user = decoded;
    req.token = decoded;
    
    // Log successful authentication
    logAuthEvent('auth_success', {
      userId: decoded.sub,
      tokenType: decoded.type,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    next();
  } catch (error) {
    // Log failed authentication
    logAuthEvent('auth_failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      message: error instanceof Error ? error.message : 'Token validation failed'
    });
  }
}

/**
 * Scope-based authorization middleware factory
 */
export function requireScope(requiredScopes: string | string[]) {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_CONTEXT'
      });
    }
    
    const hasRequiredScope = scopes.some(scope => 
      EnhancedJWTService.hasScope(req.token, scope)
    );
    
    if (!hasRequiredScope) {
      logAuthEvent('scope_denied', {
        userId: req.authContext.userId,
        required: scopes,
        provided: req.authContext.scope,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient scope',
        code: 'INSUFFICIENT_SCOPE',
        required: scopes,
        provided: req.authContext.scope
      });
    }
    
    next();
  };
}

/**
 * Permission-based authorization middleware factory
 */
export function requirePermission(requiredPermissions: string | string[]) {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_CONTEXT'
      });
    }
    
    const hasRequiredPermission = permissions.some(permission => 
      EnhancedJWTService.hasPermission(req.token, permission)
    );
    
    if (!hasRequiredPermission) {
      logAuthEvent('permission_denied', {
        userId: req.authContext.userId,
        required: permissions,
        provided: req.authContext.permissions,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        provided: req.authContext.permissions
      });
    }
    
    next();
  };
}

/**
 * Role-based authorization middleware factory
 */
export function requireRole(requiredRoles: string | string[]) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_CONTEXT'
      });
    }
    
    const hasRequiredRole = roles.includes(req.authContext.role);
    
    if (!hasRequiredRole) {
      logAuthEvent('role_denied', {
        userId: req.authContext.userId,
        required: roles,
        provided: req.authContext.role,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient role',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        provided: req.authContext.role
      });
    }
    
    next();
  };
}

/**
 * Admin access middleware (shorthand for admin role)
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireRole('admin')(req, res, next);
}

/**
 * Token type validation middleware
 */
export function requireTokenType(allowedTypes: string | string[]) {
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_CONTEXT'
      });
    }
    
    if (!types.includes(req.authContext.tokenType)) {
      return res.status(403).json({ 
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
        required: types,
        provided: req.authContext.tokenType
      });
    }
    
    next();
  };
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function authRateLimit() {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip;
    const now = Date.now();
    
    const userAttempts = attempts.get(key);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }
    
    if (userAttempts.count >= MAX_ATTEMPTS) {
      logAuthEvent('rate_limit_exceeded', {
        ip: req.ip,
        attempts: userAttempts.count,
        endpoint: req.path
      });
      
      return res.status(429).json({
        error: 'Too many authentication attempts',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
    }
    
    userAttempts.count++;
    next();
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return next();
  }
  
  try {
    const decoded = EnhancedJWTService.verifyToken(token);
    
    req.authContext = {
      userId: decoded.sub,
      role: decoded.role || 'user',
      permissions: decoded.permissions || [],
      scope: decoded.scope || [],
      sessionId: decoded.sessionId,
      tokenType: decoded.type
    };
    
    req.user = decoded;
    req.token = decoded;
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
  }
  
  next();
}

/**
 * Session validation middleware
 */
export function validateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authContext?.sessionId) {
    return res.status(401).json({
      error: 'Invalid session',
      code: 'NO_SESSION'
    });
  }
  
  // In production, validate session against session store
  // For now, just ensure session ID exists
  next();
}

/**
 * API key authentication middleware
 */
export function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'NO_API_KEY'
    });
  }
  
  try {
    const decoded = EnhancedJWTService.verifyToken(apiKey);
    
    if (decoded.type !== 'api_key') {
      return res.status(401).json({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY'
      });
    }
    
    req.authContext = {
      userId: decoded.sub,
      role: 'api_client',
      permissions: decoded.permissions || [],
      scope: decoded.scope || [],
      tokenType: decoded.type
    };
    
    req.user = decoded;
    req.token = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
}

/**
 * Combine multiple auth methods (try API key first, then JWT)
 */
export function flexibleAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;
  
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  } else if (authHeader) {
    return enhancedAuthenticateJWT(req, res, next);
  } else {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_AUTH',
      message: 'Provide either Authorization header or X-API-Key header'
    });
  }
}

/**
 * Log authentication events for security monitoring
 */
function logAuthEvent(event: string, data: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
    source: 'auth_middleware'
  };
  
  console.log(`[AUTH_EVENT] ${event}:`, JSON.stringify(data));
  
  // In production, send to security monitoring system
  // writeAuthLog(logEntry);
}

/**
 * Create composite middleware for common patterns
 */
export const authPatterns = {
  // Admin only with full permissions
  adminOnly: [enhancedAuthenticateJWT, requireRole('admin')],
  
  // API access with read permissions
  apiRead: [enhancedAuthenticateJWT, requireScope('api_access'), requirePermission('read')],
  
  // API access with write permissions
  apiWrite: [enhancedAuthenticateJWT, requireScope('api_access'), requirePermission('write')],
  
  // Test report access
  reportAccess: [enhancedAuthenticateJWT, requireScope('read_reports')],
  
  // Flexible authentication for public APIs
  flexible: [flexibleAuth],
  
  // Optional auth for public endpoints with user context
  optional: [optionalAuth]
};

// Export individual functions and patterns
export {
  AuthenticatedRequest,
  enhancedAuthenticateJWT as authenticate,
  requireScope as scope,
  requirePermission as permission,
  requireRole as role,
  requireAdmin as admin
};