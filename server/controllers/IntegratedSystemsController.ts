import { Request, Response } from 'express';
import { jwtTestResultService } from '../services/JWTTestResultService.js';
import { automatedRecoveryService } from '../services/AutomatedRecoveryService.js';
import { googleSheetsService } from '../services/GoogleSheetsService.js';
import fs from 'fs';
import path from 'path';

interface IntegratedRequest extends Request {
  testClaims?: any;
}

export const IntegratedSystemsController = {
  /**
   * Execute complete test workflow with all three systems
   */
  async executeCompleteWorkflow(req: IntegratedRequest, res: Response) {
    try {
      const { testData, enableRecovery = true, exportToSheets = true, userId } = req.body;

      if (!testData) {
        return res.status(400).json({
          error: 'Test data required for workflow execution',
          code: 'MISSING_TEST_DATA'
        });
      }

      const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const results: any = {
        workflowId,
        startTime: new Date().toISOString(),
        systems: {}
      };

      // Step 1: Create JWT-signed test result
      try {
        const secureResult = await jwtTestResultService.createSecureTestResult(testData, userId);
        const token = await jwtTestResultService.signTestResult(testData, userId);
        
        results.systems.jwtSigning = {
          success: true,
          resultId: secureResult.id,
          token,
          signature: secureResult.signature
        };
      } catch (error) {
        results.systems.jwtSigning = {
          success: false,
          error: error instanceof Error ? error.message : 'JWT signing failed'
        };
      }

      // Step 2: Check for recovery triggers and execute if needed
      if (enableRecovery) {
        try {
          const triggeredScenarios = automatedRecoveryService.shouldTriggerRecovery(testData);
          
          if (triggeredScenarios.length > 0) {
            const recoveryExecutions = [];
            
            for (const scenarioId of triggeredScenarios) {
              const execution = await automatedRecoveryService.executeRecovery(scenarioId, `workflow_${workflowId}`);
              recoveryExecutions.push(execution);
            }
            
            results.systems.recovery = {
              success: true,
              triggered: true,
              scenarios: triggeredScenarios,
              executions: recoveryExecutions.map(e => ({
                id: e.id,
                status: e.status,
                stepsCompleted: e.steps.length,
                validationsPassed: e.validationResults.filter(v => v.passed).length
              }))
            };
          } else {
            results.systems.recovery = {
              success: true,
              triggered: false,
              message: 'No recovery scenarios triggered'
            };
          }
        } catch (error) {
          results.systems.recovery = {
            success: false,
            error: error instanceof Error ? error.message : 'Recovery execution failed'
          };
        }
      }

      // Step 3: Export to Google Sheets
      if (exportToSheets) {
        try {
          const exportResult = await googleSheetsService.autoExportResults(testData);
          results.systems.sheetsExport = exportResult;
        } catch (error) {
          results.systems.sheetsExport = {
            success: false,
            error: error instanceof Error ? error.message : 'Sheets export failed',
            timestamp: new Date().toISOString()
          };
        }
      }

      results.endTime = new Date().toISOString();
      results.duration = Date.now() - new Date(results.startTime).getTime();

      res.json({
        success: true,
        workflow: results,
        message: 'Complete workflow executed successfully'
      });

    } catch (error) {
      console.error('[INTEGRATED] Workflow execution error:', error);
      res.status(500).json({
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Validate system integration and health
   */
  async validateSystemIntegration(req: Request, res: Response) {
    try {
      const validationResults = {
        timestamp: new Date().toISOString(),
        systems: {}
      };

      // Test JWT Service
      try {
        const testData = { testName: 'Integration Validation', executionSummary: { totalRequests: 1 } };
        const token = await jwtTestResultService.signTestResult(testData);
        const claims = await jwtTestResultService.verifyTestResultToken(token);
        
        validationResults.systems.jwt = {
          operational: true,
          configured: jwtTestResultService.getStatus().configured,
          tokenGeneration: !!token,
          tokenVerification: !!claims,
          message: 'JWT service operational'
        };
      } catch (error) {
        validationResults.systems.jwt = {
          operational: false,
          error: error instanceof Error ? error.message : 'JWT validation failed'
        };
      }

      // Test Recovery Service
      try {
        const recoveryStatus = automatedRecoveryService.getStatus();
        const scenarios = automatedRecoveryService.getScenarios();
        
        validationResults.systems.recovery = {
          operational: true,
          enabled: recoveryStatus.enabled,
          scenarios: recoveryStatus.scenarios,
          activeExecutions: recoveryStatus.activeExecutions,
          message: `Recovery service with ${scenarios.length} scenarios`
        };
      } catch (error) {
        validationResults.systems.recovery = {
          operational: false,
          error: error instanceof Error ? error.message : 'Recovery validation failed'
        };
      }

      // Test Google Sheets Service
      try {
        const sheetsStatus = googleSheetsService.getStatus();
        let connectionTest = null;
        
        if (sheetsStatus.configured) {
          connectionTest = await googleSheetsService.testConnection();
        }
        
        validationResults.systems.sheets = {
          operational: sheetsStatus.configured,
          configured: sheetsStatus.configured,
          autoExportEnabled: sheetsStatus.autoExportEnabled,
          connectionTest,
          message: sheetsStatus.configured ? 'Google Sheets operational' : 'Google Sheets not configured'
        };
      } catch (error) {
        validationResults.systems.sheets = {
          operational: false,
          error: error instanceof Error ? error.message : 'Sheets validation failed'
        };
      }

      const overallHealth = Object.values(validationResults.systems).every((system: any) => system.operational);

      res.json({
        success: true,
        healthy: overallHealth,
        validation: validationResults,
        message: overallHealth ? 'All systems operational' : 'Some systems require attention'
      });

    } catch (error) {
      console.error('[INTEGRATED] System validation error:', error);
      res.status(500).json({
        error: 'System validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(req: Request, res: Response) {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          jwt: jwtTestResultService.getStatus(),
          recovery: automatedRecoveryService.getStatus(),
          sheets: googleSheetsService.getStatus()
        },
        integration: {
          workflowsExecuted: 0, // This would be tracked in a real system
          lastExecution: null,
          averageExecutionTime: 0
        }
      };

      res.json({
        success: true,
        status,
        message: 'System status retrieved successfully'
      });

    } catch (error) {
      console.error('[INTEGRATED] Status retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Execute recovery workflow with validation
   */
  async executeRecoveryWorkflow(req: IntegratedRequest, res: Response) {
    try {
      const { scenarioId, validateAfterRecovery = true } = req.body;
      const claims = req.testClaims;

      if (!scenarioId) {
        return res.status(400).json({
          error: 'Recovery scenario ID required',
          code: 'MISSING_SCENARIO_ID'
        });
      }

      // Execute recovery
      const execution = await automatedRecoveryService.executeRecovery(
        scenarioId, 
        claims?.userId || 'api_request'
      );

      let validationResults = null;

      // Run additional validation if requested and recovery was successful
      if (validateAfterRecovery && execution.status === 'completed') {
        try {
          // Run a quick test suite to validate recovery
          const testResults = await this.runQuickValidationSuite();
          validationResults = testResults;
        } catch (error) {
          validationResults = {
            success: false,
            error: error instanceof Error ? error.message : 'Validation failed'
          };
        }
      }

      res.json({
        success: true,
        recovery: {
          executionId: execution.id,
          scenarioId: execution.scenarioId,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          stepsExecuted: execution.steps.length,
          validationsPassed: execution.validationResults.filter(v => v.passed).length,
          totalValidations: execution.validationResults.length
        },
        postRecoveryValidation: validationResults,
        message: `Recovery ${execution.status === 'completed' ? 'completed successfully' : 'execution finished with status: ' + execution.status}`
      });

    } catch (error) {
      console.error('[INTEGRATED] Recovery workflow error:', error);
      res.status(500).json({
        error: 'Recovery workflow failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Export test results with multiple formats and JWT signing
   */
  async exportSecureResults(req: IntegratedRequest, res: Response) {
    try {
      const { format = 'json', includeToken = true, exportToSheets = false } = req.query;
      const claims = req.testClaims;

      // Load latest test results
      const summaryPath = path.join(process.cwd(), 'docs/reports/elite-summary.json');
      
      if (!fs.existsSync(summaryPath)) {
        return res.status(404).json({
          error: 'No test results available for export',
          code: 'NO_RESULTS_FOUND'
        });
      }

      const testData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      
      // Create secure result with signature
      const secureResult = await jwtTestResultService.createSecureTestResult(testData, claims?.userId);
      
      // Generate JWT token if requested
      let token = null;
      if (includeToken) {
        token = await jwtTestResultService.signTestResult(testData, claims?.userId);
      }

      // Export to Google Sheets if requested
      let sheetsResult = null;
      if (exportToSheets) {
        sheetsResult = await googleSheetsService.exportTestResults(testData);
      }

      const exportData = {
        exportId: `export_${Date.now()}`,
        exportedAt: new Date().toISOString(),
        exportedBy: claims?.userId || 'system',
        format,
        secureResult,
        token,
        sheetsExport: sheetsResult
      };

      switch (format) {
        case 'csv':
          return this.exportAsCSV(res, exportData);
        case 'xml':
          return this.exportAsXML(res, exportData);
        default:
          res.json({
            success: true,
            export: exportData,
            message: 'Secure export completed successfully'
          });
      }

    } catch (error) {
      console.error('[INTEGRATED] Secure export error:', error);
      res.status(500).json({
        error: 'Secure export failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Run quick validation suite after recovery
   */
  async runQuickValidationSuite(): Promise<any> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const fetch = (await import('node-fetch')).default;
    
    const tests = [
      { name: 'Health Check', path: '/api/health' },
      { name: 'Auth Status', path: '/api/auth/status' },
      { name: 'Square Status', path: '/api/square/status' }
    ];

    const results = [];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${baseUrl}${test.path}`);
        const responseTime = Date.now() - startTime;

        results.push({
          name: test.name,
          path: test.path,
          status: response.status,
          responseTime,
          passed: response.status === 200 && responseTime < 5000
        });
      } catch (error) {
        results.push({
          name: test.name,
          path: test.path,
          status: 0,
          responseTime: 0,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: results.every(r => r.passed),
      tests: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        avgResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      }
    };
  },

  /**
   * Export data as CSV format
   */
  exportAsCSV(res: Response, data: any) {
    const csvData = this.convertToCSV(data.secureResult);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="secure-test-results-${Date.now()}.csv"`);
    
    if (data.token) {
      res.setHeader('X-JWT-Token', data.token);
    }
    
    res.send(csvData);
  },

  /**
   * Export data as XML format
   */
  exportAsXML(res: Response, data: any) {
    const xmlData = this.convertToXML(data.secureResult);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="secure-test-results-${Date.now()}.xml"`);
    
    if (data.token) {
      res.setHeader('X-JWT-Token', data.token);
    }
    
    res.send(xmlData);
  },

  /**
   * Convert test results to CSV format
   */
  convertToCSV(data: any): string {
    const headers = ['Test Name', 'Status', 'Response Time', 'Error', 'Signature'];
    const rows = [headers.join(',')];

    if (data.failures) {
      data.failures.forEach((failure: any) => {
        const row = [
          `"${failure.name || 'Unknown'}"`,
          `"${failure.statusCode || 'Failed'}"`,
          `"${failure.responseTime || 0}ms"`,
          `"${failure.error || 'No error details'}"`,
          `"${data.signature || 'No signature'}"`
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
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<secureTestResults>\n';
    
    xml += `  <metadata>\n`;
    xml += `    <id>${data.id}</id>\n`;
    xml += `    <timestamp>${data.timestamp}</timestamp>\n`;
    xml += `    <signature>${data.signature}</signature>\n`;
    xml += `    <version>${data.version}</version>\n`;
    xml += `  </metadata>\n`;

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

    xml += '</secureTestResults>';
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