import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

/**
 * Secure Test Result Controller
 * Provides JWT-authenticated access to test report data
 */
export class TestResultController {
  
  /**
   * Get secure test report with JWT authentication
   */
  static async getSecureReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { token } = req.query;

      // Validate inputs
      if (!reportId) {
        res.status(400).json({ 
          error: 'Report ID is required',
          code: 'MISSING_REPORT_ID'
        });
        return;
      }

      if (!token || typeof token !== 'string') {
        res.status(403).json({ 
          error: 'JWT token is required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('[TEST_RESULTS] JWT_SECRET not configured');
        res.status(500).json({ 
          error: 'Server configuration error',
          code: 'JWT_NOT_CONFIGURED'
        });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (jwtError) {
        console.log(`[TEST_RESULTS] JWT verification failed for reportId: ${reportId}`);
        res.status(403).json({ 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
        return;
      }

      // Validate JWT payload
      if (!decoded || typeof decoded !== 'object') {
        res.status(403).json({ 
          error: 'Invalid token payload',
          code: 'INVALID_PAYLOAD'
        });
        return;
      }

      // Check if token has required permissions
      if (decoded.type !== 'test_result_access' || decoded.scope !== 'read_reports') {
        res.status(403).json({ 
          error: 'Token does not have required permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      // Sanitize reportId to prevent path traversal
      const sanitizedReportId = reportId.replace(/[^a-zA-Z0-9\-_]/g, '');
      if (sanitizedReportId !== reportId) {
        res.status(400).json({ 
          error: 'Invalid report ID format',
          code: 'INVALID_REPORT_ID'
        });
        return;
      }

      // Check if report file exists
      const reportPath = path.join(process.cwd(), 'docs', 'reports', `${sanitizedReportId}.json`);
      
      if (!fs.existsSync(reportPath)) {
        console.log(`[TEST_RESULTS] Report not found: ${sanitizedReportId}`);
        res.status(404).json({ 
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND',
          reportId: sanitizedReportId
        });
        return;
      }

      // Read and parse report file
      let reportData: any;
      try {
        const fileContent = fs.readFileSync(reportPath, 'utf-8');
        reportData = JSON.parse(fileContent);
      } catch (parseError) {
        console.error(`[TEST_RESULTS] Error reading report ${sanitizedReportId}:`, parseError);
        res.status(500).json({ 
          error: 'Error reading report file',
          code: 'READ_ERROR'
        });
        return;
      }

      // Log successful access
      this.logAccess(sanitizedReportId, decoded, req);

      // Return secure report data
      res.json({
        success: true,
        reportId: sanitizedReportId,
        timestamp: new Date().toISOString(),
        accessedBy: decoded.sub || decoded.userId || 'unknown',
        data: reportData
      });

    } catch (error) {
      console.error('[TEST_RESULTS] Unexpected error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Generate signed JWT token for test result access
   */
  static generateAccessToken(reportId: string, userId: string = 'system', expiresIn: string = '24h'): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = {
      type: 'test_result_access',
      scope: 'read_reports',
      reportId,
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      iss: 'peter-digital-security-platform'
    };

    return jwt.sign(payload, jwtSecret, { expiresIn });
  }

  /**
   * Generate complete signed URL for test result access
   */
  static generateSignedUrl(reportId: string, userId: string = 'system', baseUrl?: string): string {
    const token = this.generateAccessToken(reportId, userId);
    const base = baseUrl || process.env.BASE_URL || 'http://localhost:5000';
    return `${base}/api/test-results/secure/${reportId}?token=${token}`;
  }

  /**
   * List available test reports
   */
  static async listReports(req: Request, res: Response): Promise<void> {
    try {
      const reportsDir = path.join(process.cwd(), 'docs', 'reports');
      
      if (!fs.existsSync(reportsDir)) {
        res.json({
          success: true,
          reports: [],
          message: 'Reports directory not found'
        });
        return;
      }

      const files = fs.readdirSync(reportsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const reportId = file.replace('.json', '');
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            reportId,
            filename: file,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            signedUrl: this.generateSignedUrl(reportId)
          };
        });

      res.json({
        success: true,
        count: files.length,
        reports: files
      });

    } catch (error) {
      console.error('[TEST_RESULTS] Error listing reports:', error);
      res.status(500).json({ 
        error: 'Error listing reports',
        code: 'LIST_ERROR'
      });
    }
  }

  /**
   * Log access attempt for audit trail
   */
  private static logAccess(reportId: string, tokenPayload: any, req: Request): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      reportId,
      userId: tokenPayload.sub || tokenPayload.userId || 'unknown',
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      tokenType: tokenPayload.type,
      scope: tokenPayload.scope
    };

    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, 'test-report-access.log');
      const logLine = JSON.stringify(logEntry) + '\n';
      
      fs.appendFileSync(logFile, logLine);
      console.log(`[TEST_RESULTS] Access logged: ${reportId} by ${logEntry.userId}`);
    } catch (logError) {
      console.error('[TEST_RESULTS] Failed to log access:', logError);
    }
  }

  /**
   * API endpoint to generate signed URL for test reports
   */
  static async generateSignedUrl(req: Request, res: Response): Promise<void> {
    try {
      const { reportId, userId = 'system', expiresIn = '24h' } = req.body;

      if (!reportId) {
        res.status(400).json({ 
          error: 'Report ID is required',
          code: 'MISSING_REPORT_ID'
        });
        return;
      }

      // Verify report exists
      const reportsDir = path.join(process.cwd(), 'docs', 'reports');
      const reportPath = path.join(reportsDir, `${reportId}.json`);

      if (!fs.existsSync(reportPath)) {
        res.status(404).json({ 
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND',
          reportId
        });
        return;
      }

      // Generate signed URL
      const signedUrl = this.generateSignedUrl(reportId, userId, expiresIn);

      // Log the URL generation
      console.log(`[TEST_RESULTS] Generated signed URL for report ${reportId} by user ${userId}`);

      res.json({
        success: true,
        reportId,
        userId,
        signedUrl,
        expiresIn,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('[TEST_RESULTS] Error generating signed URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate signed URL',
        code: 'URL_GENERATION_ERROR'
      });
    }
  }
}