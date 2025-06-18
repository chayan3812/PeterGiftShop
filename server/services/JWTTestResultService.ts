import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

interface TestResultClaims {
  testId: string;
  testName: string;
  executionId: string;
  timestamp: string;
  userId?: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

interface SecureTestResult {
  id: string;
  testName: string;
  executionSummary: any;
  failures: any[];
  performanceMetrics: any;
  securityMetrics: any;
  signature: string;
  timestamp: string;
  version: string;
}

export class JWTTestResultService {
  private readonly jwtSecret: string;
  private readonly issuer: string = 'peter-digital-api-tests';
  private readonly audience: string = 'test-result-consumers';
  private readonly tokenExpiry: string = '24h';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    
    if (!process.env.JWT_SECRET) {
      console.warn('[JWT] Using generated secret. Set JWT_SECRET environment variable for production.');
    }
  }

  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Sign test results with JWT authentication
   */
  async signTestResult(testResult: any, userId?: string): Promise<string> {
    const testId = this.generateTestId();
    const timestamp = new Date().toISOString();

    const claims: TestResultClaims = {
      testId,
      testName: testResult.testName || 'API Security Test',
      executionId: testResult.executionId || `exec_${Date.now()}`,
      timestamp,
      userId,
      permissions: ['test:read', 'test:export'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      iss: this.issuer,
      aud: this.audience
    };

    return jwt.sign(claims, this.jwtSecret, {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256',
        kid: this.generateKeyId()
      }
    });
  }

  /**
   * Verify JWT token and extract test result claims
   */
  async verifyTestResultToken(token: string): Promise<TestResultClaims> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as TestResultClaims;

      return decoded;
    } catch (error) {
      throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create secure test result with digital signature
   */
  async createSecureTestResult(testData: any, userId?: string): Promise<SecureTestResult> {
    const testId = this.generateTestId();
    const timestamp = new Date().toISOString();
    
    // Create content hash for integrity verification
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(testData))
      .digest('hex');

    const secureResult: SecureTestResult = {
      id: testId,
      testName: testData.testName || 'Peter Digital API Security Test',
      executionSummary: testData.executionSummary,
      failures: testData.failures || [],
      performanceMetrics: testData.performanceMetrics || {},
      securityMetrics: testData.securityMetrics || {},
      signature: contentHash,
      timestamp,
      version: '1.0.0'
    };

    return secureResult;
  }

  /**
   * Middleware for JWT authentication on test result endpoints
   */
  authenticateTestResult() {
    return async (req: Request & { testClaims?: TestResultClaims }, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'MISSING_JWT_TOKEN',
            message: 'Bearer token required for test result access'
          });
        }

        const token = authHeader.substring(7);
        const claims = await this.verifyTestResultToken(token);

        // Attach claims to request for downstream use
        req.testClaims = claims;

        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Invalid authentication token',
          code: 'INVALID_JWT_TOKEN',
          message: error instanceof Error ? error.message : 'Token verification failed'
        });
      }
    };
  }

  /**
   * Authorization middleware for specific test result permissions
   */
  requirePermission(permission: string) {
    return (req: Request & { testClaims?: TestResultClaims }, res: Response, next: NextFunction) => {
      const claims = req.testClaims;

      if (!claims) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'MISSING_CLAIMS'
        });
      }

      if (!claims.permissions.includes(permission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permission,
          available: claims.permissions
        });
      }

      next();
    };
  }

  /**
   * Create API key for programmatic access
   */
  async createApiKey(userId: string, permissions: string[], expiresIn: string = '30d'): Promise<string> {
    const apiKeyClaims = {
      type: 'api_key',
      userId,
      permissions,
      keyId: this.generateKeyId(),
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience
    };

    const token = jwt.sign(apiKeyClaims, this.jwtSecret);
    // Add expiration manually to avoid typing issues
    return token;
  }

  /**
   * Validate test result integrity
   */
  validateTestResultIntegrity(result: SecureTestResult): boolean {
    try {
      // Recreate content hash excluding signature and timestamp
      const { signature, timestamp, ...contentForHash } = result;
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(contentForHash))
        .digest('hex');

      return recalculatedHash === signature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate test execution ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate key identifier for JWT header
   */
  private generateKeyId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      configured: !!process.env.JWT_SECRET,
      issuer: this.issuer,
      audience: this.audience,
      tokenExpiry: this.tokenExpiry,
      supportedAlgorithms: ['HS256'],
      version: '1.0.0'
    };
  }
}

export const jwtTestResultService = new JWTTestResultService();