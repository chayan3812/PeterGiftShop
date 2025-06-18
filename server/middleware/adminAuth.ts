import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    username: string;
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // For demo purposes, we'll simulate admin authentication
  // In production, this would check actual session/JWT tokens
  
  // Simulate authenticated admin user
  req.user = {
    id: 1,
    role: 'admin',
    username: 'admin'
  };

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied - Administrator privileges required',
      code: 'ADMIN_ACCESS_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

export function auditLog(action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const adminUser = req.user?.username || 'unknown';
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`[ADMIN AUDIT] ${timestamp} - User: ${adminUser} - Action: ${action} - IP: ${ip} - Path: ${req.path}`);
    
    next();
  };
}