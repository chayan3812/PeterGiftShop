import { Request, Response } from 'express';
import { jwtTestResultService } from '../services/JWTTestResultService.js';
import fs from 'fs';
import path from 'path';

interface TestResultRequest extends Request {
  testClaims?: any;
}

export const SecureTestResultController = {
  /**
   * Create signed test result with JWT authentication
   */
  async createSignedResult(req: TestResultRequest, res: Response) {
    try {
      const { testData, userId } = req.body;

      if (!testData) {
        return res.status(400).json({
          error: 'Test data required',
          code: 'MISSING_TEST_DATA'
        });
      }

      // Create secure test result
      const secureResult = await jwtTestResultService.createSecureTestResult(testData, userId);
      
      // Generate JWT token for the result
      const token = await jwtTestResultService.signTestResult(testData, userId);

      res.status(201).json({
        success: true,
        result: secureResult,
        token,
        expiresIn: '24h',
        message: 'Signed test result created successfully'
      });

    } catch (error) {
      console.error('[SECURE_TEST] Create signed result error:', error);
      res.status(500).json({
        error: 'Failed to create signed test result',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Retrieve test result with JWT verification
   */
  async getSecureResult(req: TestResultRequest, res: Response) {
    try {
      const { resultId } = req.params;
      const claims = req.testClaims;

      // Load test result from file system
      const reportsDir = path.join(process.cwd(), 'docs/reports');
      const resultPath = path.join(reportsDir, `${resultId}.json`);

      if (!fs.existsSync(resultPath)) {
        return res.status(404).json({
          error: 'Test result not found',
          code: 'RESULT_NOT_FOUND',
          resultId
        });
      }

      const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      
      // Verify integrity if it's a secure result
      if (resultData.signature) {
        const isValid = jwtTestResultService.validateTestResultIntegrity(resultData);
        if (!isValid) {
          return res.status(400).json({
            error: 'Test result integrity check failed',
            code: 'INTEGRITY_VIOLATION',
            resultId
          });
        }
      }

      res.json({
        success: true,
        result: resultData,
        claims,
        verified: true,
        message: 'Test result retrieved and verified successfully'
      });

    } catch (error) {
      console.error('[SECURE_TEST] Get secure result error:', error);
      res.status(500).json({
        error: 'Failed to retrieve test result',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Export test results to various formats with authentication
   */
  async exportResults(req: TestResultRequest, res: Response) {
    try {
      const { format = 'json', includeMetrics = true } = req.query;
      const claims = req.testClaims;

      // Load latest elite summary
      const summaryPath = path.join(process.cwd(), 'docs/reports/elite-summary.json');
      
      if (!fs.existsSync(summaryPath)) {
        return res.status(404).json({
          error: 'No test results available for export',
          code: 'NO_RESULTS_FOUND'
        });
      }

      const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

      // Create export data based on permissions
      const exportData = {
        exportId: `export_${Date.now()}`,
        exportedAt: new Date().toISOString(),
        exportedBy: claims?.userId || 'system',
        format,
        testResults: summaryData
      };

      // Add metrics if user has permission and requested
      if (includeMetrics && claims?.permissions.includes('test:metrics')) {
        exportData.testResults.detailedMetrics = {
          executionDetails: summaryData.executionSummary,
          performanceBreakdown: summaryData.performanceMetrics,
          securityAnalysis: summaryData.securityMetrics
        };
      }

      // Generate signed export token
      const exportToken = await jwtTestResultService.signTestResult(exportData, claims?.userId);

      switch (format) {
        case 'csv':
          return this.exportAsCSV(res, exportData, exportToken);
        case 'xml':
          return this.exportAsXML(res, exportData, exportToken);
        default:
          res.json({
            success: true,
            export: exportData,
            token: exportToken,
            message: 'Test results exported successfully'
          });
      }

    } catch (error) {
      console.error('[SECURE_TEST] Export results error:', error);
      res.status(500).json({
        error: 'Failed to export test results',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Create API key for programmatic access
   */
  async createApiKey(req: TestResultRequest, res: Response) {
    try {
      const { userId, permissions = ['test:read'], expiresIn = '30d' } = req.body;
      const claims = req.testClaims;

      // Check if user has permission to create API keys
      if (!claims?.permissions.includes('admin:api_keys')) {
        return res.status(403).json({
          error: 'Insufficient permissions to create API keys',
          code: 'PERMISSION_DENIED'
        });
      }

      const apiKey = await jwtTestResultService.createApiKey(userId, permissions, expiresIn);

      res.status(201).json({
        success: true,
        apiKey,
        keyId: `key_${Date.now()}`,
        permissions,
        expiresIn,
        createdBy: claims.userId,
        message: 'API key created successfully'
      });

    } catch (error) {
      console.error('[SECURE_TEST] Create API key error:', error);
      res.status(500).json({
        error: 'Failed to create API key',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Verify token and get claims information
   */
  async verifyToken(req: TestResultRequest, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Token required for verification',
          code: 'MISSING_TOKEN'
        });
      }

      const claims = await jwtTestResultService.verifyTestResultToken(token);

      res.json({
        success: true,
        valid: true,
        claims,
        message: 'Token verified successfully'
      });

    } catch (error) {
      res.status(401).json({
        success: false,
        valid: false,
        error: 'Token verification failed',
        message: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  },

  /**
   * Get service status and configuration
   */
  async getStatus(req: Request, res: Response) {
    try {
      const status = jwtTestResultService.getStatus();
      
      res.json({
        success: true,
        service: 'JWT Test Result Service',
        status,
        endpoints: {
          '/api/secure-test/create': 'Create signed test result',
          '/api/secure-test/result/:id': 'Get secure test result (JWT required)',
          '/api/secure-test/export': 'Export test results (JWT required)',
          '/api/secure-test/api-key': 'Create API key (admin required)',
          '/api/secure-test/verify': 'Verify JWT token'
        },
        message: 'JWT Test Result Service is operational'
      });

    } catch (error) {
      console.error('[SECURE_TEST] Status error:', error);
      res.status(500).json({
        error: 'Failed to get service status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Export data as CSV format
   */
  exportAsCSV(res: Response, data: any, token: string) {
    const csvData = this.convertToCSV(data.testResults);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="test-results-${Date.now()}.csv"`);
    res.setHeader('X-Export-Token', token);
    res.send(csvData);
  },

  /**
   * Export data as XML format
   */
  exportAsXML(res: Response, data: any, token: string) {
    const xmlData = this.convertToXML(data.testResults);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="test-results-${Date.now()}.xml"`);
    res.setHeader('X-Export-Token', token);
    res.send(xmlData);
  },

  /**
   * Convert test results to CSV format
   */
  convertToCSV(data: any): string {
    const headers = ['Test Name', 'Status', 'Response Time', 'Error'];
    const rows = [headers.join(',')];

    if (data.failures) {
      data.failures.forEach((failure: any) => {
        const row = [
          `"${failure.name || 'Unknown'}"`,
          `"${failure.statusCode || 'Failed'}"`,
          `"${failure.responseTime || 0}ms"`,
          `"${failure.error || 'No error details'}"`
        ];
        rows.push(row.join(','));
      });
    }

    return rows.join('\n');
  },

  /**
   * Convert test results to XML format
   */
  convertToXML(data: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testResults>\n';
    
    if (data.executionSummary) {
      xml += '  <summary>\n';
      xml += `    <totalRequests>${data.executionSummary.totalRequests || 0}</totalRequests>\n`;
      xml += `    <failCount>${data.executionSummary.failCount || 0}</failCount>\n`;
      xml += `    <successRate>${data.executionSummary.successRate || 0}</successRate>\n`;
      xml += '  </summary>\n';
    }

    if (data.failures) {
      xml += '  <failures>\n';
      data.failures.forEach((failure: any) => {
        xml += '    <failure>\n';
        xml += `      <name>${this.escapeXML(failure.name || 'Unknown')}</name>\n`;
        xml += `      <error>${this.escapeXML(failure.error || 'No details')}</error>\n`;
        xml += `      <responseTime>${failure.responseTime || 0}</responseTime>\n`;
        xml += '    </failure>\n';
      });
      xml += '  </failures>\n';
    }

    xml += '</testResults>';
    return xml;
  },

  /**
   * Escape XML special characters
   */
  escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
};