import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { activityLogger } from '../db/activity-log.js';

interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  range?: string;
  headers: string[];
}

interface ExportResult {
  success: boolean;
  spreadsheetId?: string;
  sheetUrl?: string;
  rowsAdded?: number;
  errorMessage?: string;
  timestamp: string;
}

interface TestResultRow {
  timestamp: string;
  testName: string;
  totalRequests: number;
  failCount: number;
  successRate: number;
  avgResponseTime: number;
  criticalAlerts: number;
  topFailures: string;
  executionId: string;
}

export class GoogleSheetsService {
  private auth: any;
  private sheets: any;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize Google Sheets authentication
   */
  private async initializeAuth() {
    try {
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials/google-credentials.json';
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;

      if (fs.existsSync(credentialsPath)) {
        // Use service account file
        this.auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else if (serviceAccountEmail && privateKey) {
        // Use environment variables
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
            type: 'service_account'
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else {
        console.warn('[SHEETS] Google Sheets credentials not configured');
        return;
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isConfigured = true;
      console.log('[SHEETS] Google Sheets service initialized');

    } catch (error) {
      console.error('[SHEETS] Failed to initialize Google Sheets:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Export test results to Google Sheets
   */
  async exportTestResults(testData: any, spreadsheetId?: string): Promise<ExportResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        errorMessage: 'Google Sheets service not configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const targetSpreadsheetId = spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      
      if (!targetSpreadsheetId) {
        return await this.createNewSpreadsheet(testData);
      }

      return await this.appendToExistingSheet(testData, targetSpreadsheetId);

    } catch (error) {
      console.error('[SHEETS] Export failed:', error);
      
      activityLogger.log('error', {
        action: 'sheets_export_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 'google_sheets');

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create new spreadsheet for test results
   */
  private async createNewSpreadsheet(testData: any): Promise<ExportResult> {
    try {
      const spreadsheetTitle = `Peter Digital API Test Results - ${new Date().toISOString().split('T')[0]}`;
      
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: spreadsheetTitle
          },
          sheets: [
            {
              properties: {
                title: 'Test Results'
              }
            },
            {
              properties: {
                title: 'Failure Details'
              }
            },
            {
              properties: {
                title: 'Performance Metrics'
              }
            }
          ]
        }
      });

      const spreadsheetId = response.data.spreadsheetId;
      const sheetUrl = response.data.spreadsheetUrl;

      // Set up headers and add data
      await this.setupSpreadsheetHeaders(spreadsheetId);
      await this.addTestResultData(spreadsheetId, testData);
      await this.addFailureDetails(spreadsheetId, testData);
      await this.addPerformanceMetrics(spreadsheetId, testData);

      console.log(`[SHEETS] Created new spreadsheet: ${spreadsheetId}`);

      activityLogger.log('sheets_export', {
        action: 'spreadsheet_created',
        spreadsheetId,
        sheetUrl,
        testName: testData.testName || 'API Test'
      }, 'google_sheets');

      return {
        success: true,
        spreadsheetId,
        sheetUrl,
        rowsAdded: 1,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to create spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Append data to existing spreadsheet
   */
  private async appendToExistingSheet(testData: any, spreadsheetId: string): Promise<ExportResult> {
    try {
      // Check if spreadsheet exists and is accessible
      await this.sheets.spreadsheets.get({ spreadsheetId });

      // Add test result data
      const rowData = this.formatTestResultRow(testData);
      
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Test Results!A:I',
        valueInputOption: 'RAW',
        resource: {
          values: [rowData]
        }
      });

      // Add failure details if any
      if (testData.failures && testData.failures.length > 0) {
        await this.addFailureDetailsToSheet(spreadsheetId, testData.failures);
      }

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      const rowsAdded = response.data.updates?.updatedRows || 1;

      console.log(`[SHEETS] Added ${rowsAdded} rows to spreadsheet: ${spreadsheetId}`);

      activityLogger.log('sheets_export', {
        action: 'data_appended',
        spreadsheetId,
        rowsAdded,
        testName: testData.testName || 'API Test'
      }, 'google_sheets');

      return {
        success: true,
        spreadsheetId,
        sheetUrl,
        rowsAdded,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to append to spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup spreadsheet headers
   */
  private async setupSpreadsheetHeaders(spreadsheetId: string): Promise<void> {
    const headers = [
      ['Timestamp', 'Test Name', 'Total Requests', 'Failed Tests', 'Success Rate %', 'Avg Response Time (ms)', 'Critical Alerts', 'Top Failures', 'Execution ID']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Test Results!A1:I1',
      valueInputOption: 'RAW',
      resource: {
        values: headers
      }
    });

    // Format headers
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 9
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }
        ]
      }
    });
  }

  /**
   * Format test result as spreadsheet row
   */
  private formatTestResultRow(testData: any): string[] {
    const executionSummary = testData.executionSummary || {};
    const timestamp = testData.reportGeneratedAt || new Date().toISOString();
    const topFailures = testData.failures?.slice(0, 3).map((f: any) => `${f.name} (${f.statusCode})`).join('; ') || 'None';

    return [
      new Date(timestamp).toLocaleString(),
      testData.testName || 'Peter Digital API Test',
      (executionSummary.totalRequests || 0).toString(),
      (executionSummary.failCount || 0).toString(),
      (executionSummary.successRate || 100).toString(),
      (executionSummary.avgResponseTime || 0).toString(),
      (executionSummary.criticalAlerts || 0).toString(),
      topFailures,
      testData.executionId || `exec_${Date.now()}`
    ];
  }

  /**
   * Add test result data to spreadsheet
   */
  private async addTestResultData(spreadsheetId: string, testData: any): Promise<void> {
    const rowData = this.formatTestResultRow(testData);
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Test Results!A:I',
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });
  }

  /**
   * Add failure details to separate sheet
   */
  private async addFailureDetails(spreadsheetId: string, testData: any): Promise<void> {
    if (!testData.failures || testData.failures.length === 0) return;

    const headers = [['Timestamp', 'Test Name', 'Endpoint', 'Status Code', 'Error Message', 'Response Time (ms)']];
    const timestamp = new Date(testData.reportGeneratedAt || Date.now()).toLocaleString();

    const failureRows = testData.failures.map((failure: any) => [
      timestamp,
      testData.testName || 'API Test',
      failure.name || 'Unknown',
      (failure.statusCode || 0).toString(),
      failure.error || 'No error details',
      (failure.responseTime || 0).toString()
    ]);

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Failure Details!A1:F1',
      valueInputOption: 'RAW',
      resource: { values: headers }
    });

    if (failureRows.length > 0) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Failure Details!A:F',
        valueInputOption: 'RAW',
        resource: { values: failureRows }
      });
    }
  }

  /**
   * Add failure details to existing sheet
   */
  private async addFailureDetailsToSheet(spreadsheetId: string, failures: any[]): Promise<void> {
    const timestamp = new Date().toLocaleString();
    
    const failureRows = failures.map((failure: any) => [
      timestamp,
      failure.name || 'Unknown',
      (failure.statusCode || 0).toString(),
      failure.error || 'No error details',
      (failure.responseTime || 0).toString()
    ]);

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Failure Details!A:E',
        valueInputOption: 'RAW',
        resource: { values: failureRows }
      });
    } catch (error) {
      console.warn('[SHEETS] Could not add failure details (sheet may not exist)');
    }
  }

  /**
   * Add performance metrics to spreadsheet
   */
  private async addPerformanceMetrics(spreadsheetId: string, testData: any): Promise<void> {
    const metrics = testData.performanceMetrics || {};
    const securityMetrics = testData.securityMetrics || {};

    const headers = [['Metric', 'Value', 'Timestamp']];
    const timestamp = new Date(testData.reportGeneratedAt || Date.now()).toLocaleString();

    const metricRows = [
      ['P95 Response Time', `${metrics.p95ResponseTime || 0}ms`, timestamp],
      ['P99 Response Time', `${metrics.p99ResponseTime || 0}ms`, timestamp],
      ['Error Rate', `${metrics.errorRate || 0}%`, timestamp],
      ['Throughput', `${metrics.throughput || 0} req/s`, timestamp],
      ['Security Score', `${securityMetrics.securityScore || 0}/10`, timestamp],
      ['Auth Failures', (securityMetrics.authFailures || 0).toString(), timestamp]
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Performance Metrics!A1:C1',
      valueInputOption: 'RAW',
      resource: { values: headers }
    });

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Performance Metrics!A:C',
      valueInputOption: 'RAW',
      resource: { values: metricRows }
    });
  }

  /**
   * Create dashboard with charts and summary
   */
  async createDashboard(spreadsheetId: string): Promise<void> {
    if (!this.isConfigured) return;

    try {
      // Add dashboard sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Dashboard',
                  index: 0
                }
              }
            }
          ]
        }
      });

      // Add dashboard content (summary formulas, charts, etc.)
      const dashboardData = [
        ['Peter Digital API Test Dashboard', '', '', ''],
        ['', '', '', ''],
        ['Latest Test Summary', '', '', ''],
        ['Total Tests Run', '=COUNTA(\'Test Results\'!A:A)-1', '', ''],
        ['Average Success Rate', '=AVERAGE(\'Test Results\'!E:E)', '', ''],
        ['Average Response Time', '=AVERAGE(\'Test Results\'!F:F)', '', ''],
        ['Total Failures', '=SUM(\'Test Results\'!D:D)', '', '']
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Dashboard!A1:D7',
        valueInputOption: 'USER_ENTERED',
        resource: { values: dashboardData }
      });

      console.log('[SHEETS] Dashboard created');

    } catch (error) {
      console.warn('[SHEETS] Could not create dashboard:', error);
    }
  }

  /**
   * Get recent test results from spreadsheet
   */
  async getTestHistory(spreadsheetId: string, limit: number = 10): Promise<any[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Test Results!A:I'
      });

      const rows = response.data.values || [];
      
      // Skip header row and get recent results
      return rows.slice(1, limit + 1).map(row => ({
        timestamp: row[0],
        testName: row[1],
        totalRequests: parseInt(row[2]) || 0,
        failCount: parseInt(row[3]) || 0,
        successRate: parseFloat(row[4]) || 0,
        avgResponseTime: parseFloat(row[5]) || 0,
        criticalAlerts: parseInt(row[6]) || 0,
        topFailures: row[7],
        executionId: row[8]
      }));

    } catch (error) {
      console.error('[SHEETS] Failed to get test history:', error);
      return [];
    }
  }

  /**
   * Auto-export test results based on configuration
   */
  async autoExportResults(testData: any): Promise<ExportResult> {
    const autoExportEnabled = process.env.GOOGLE_SHEETS_AUTO_EXPORT === 'true';
    
    if (!autoExportEnabled || !this.isConfigured) {
      return {
        success: false,
        errorMessage: 'Auto-export not enabled or service not configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await this.exportTestResults(testData);
      
      if (result.success) {
        console.log('[SHEETS] Auto-export completed successfully');
        
        // Create dashboard if this is a new spreadsheet
        if (result.spreadsheetId && !process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
          await this.createDashboard(result.spreadsheetId);
        }
      }

      return result;

    } catch (error) {
      console.error('[SHEETS] Auto-export failed:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Auto-export failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      autoExportEnabled: process.env.GOOGLE_SHEETS_AUTO_EXPORT === 'true',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null,
      credentialsConfigured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
      version: '1.0.0'
    };
  }

  /**
   * Test connection to Google Sheets API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Google Sheets service not configured'
      };
    }

    try {
      // Try to create a test spreadsheet
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: `Connection Test - ${new Date().toISOString()}`
          }
        }
      });

      // Delete the test spreadsheet
      const spreadsheetId = response.data.spreadsheetId;
      
      return {
        success: true,
        message: `Connection successful. Test spreadsheet created: ${spreadsheetId}`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();