import { google } from 'googleapis';
import { EnvironmentService } from './services/EnvironmentService.js';

/**
 * Google Sheets Integration for Advanced Analytics
 * Exports security metrics, fraud reports, and system analytics to Google Sheets
 */

export interface AnalyticsData {
  timestamp: string;
  category: string;
  metrics: Record<string, any>;
  summary?: string;
}

export class GoogleSheetsIntegration {
  private static sheets: any = null;
  private static spreadsheetId: string | null = null;
  private static isConfigured = false;

  /**
   * Initialize Google Sheets integration
   */
  static async initialize(): Promise<void> {
    const config = EnvironmentService.getConfig();
    
    if (!config.googleSheets.credentialsPath && !config.googleSheets.credentials) {
      console.log('[SHEETS] Google Sheets not configured - analytics export disabled');
      return;
    }

    try {
      let auth;
      
      if (config.googleSheets.credentialsPath) {
        // Use service account file
        auth = new google.auth.GoogleAuth({
          keyFile: config.googleSheets.credentialsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else if (config.googleSheets.credentials) {
        // Use credentials from environment
        const credentials = JSON.parse(config.googleSheets.credentials);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth });
      this.spreadsheetId = config.googleSheets.spreadsheetId;
      this.isConfigured = true;
      
      console.log('[SHEETS] Google Sheets integration initialized');
      
      // Initialize default worksheets
      await this.initializeWorksheets();
      
    } catch (error) {
      console.error('[SHEETS] Initialization failed:', (error as Error).message);
      this.isConfigured = false;
    }
  }

  /**
   * Initialize default worksheets
   */
  private static async initializeWorksheets(): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    const worksheets = [
      {
        name: 'Security_Metrics',
        headers: ['Timestamp', 'Category', 'Metric', 'Value', 'Severity', 'Description']
      },
      {
        name: 'Fraud_Detection',
        headers: ['Timestamp', 'Transaction_ID', 'Risk_Score', 'Amount', 'Location', 'Status', 'AI_Analysis']
      },
      {
        name: 'Threat_Intelligence',
        headers: ['Timestamp', 'Threat_Type', 'Source_IP', 'Threat_Level', 'Indicators', 'Mitigation']
      },
      {
        name: 'System_Health',
        headers: ['Timestamp', 'Component', 'Status', 'Health_Score', 'Metrics', 'Alerts']
      },
      {
        name: 'Alert_Summary',
        headers: ['Timestamp', 'Alert_Type', 'Severity', 'Channel', 'Status', 'Response_Time']
      }
    ];

    for (const worksheet of worksheets) {
      try {
        // Check if worksheet exists
        const response = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId
        });

        const existingSheet = response.data.sheets?.find(
          (sheet: any) => sheet.properties.title === worksheet.name
        );

        if (!existingSheet) {
          // Create worksheet
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: worksheet.name
                  }
                }
              }]
            }
          });

          // Add headers
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${worksheet.name}!A1:${String.fromCharCode(65 + worksheet.headers.length - 1)}1`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [worksheet.headers]
            }
          });
        }
      } catch (error) {
        console.error(`[SHEETS] Error initializing worksheet ${worksheet.name}:`, (error as Error).message);
      }
    }
  }

  /**
   * Export security metrics to Google Sheets
   */
  static async exportSecurityMetrics(metrics: {
    category: string;
    data: Record<string, any>;
    severity?: string;
    description?: string;
  }): Promise<boolean> {
    if (!this.isConfigured || !this.sheets || !this.spreadsheetId) {
      console.log('[SHEETS] Not configured - skipping metrics export');
      return false;
    }

    try {
      const timestamp = new Date().toISOString();
      const rows: any[][] = [];

      Object.entries(metrics.data).forEach(([metric, value]) => {
        rows.push([
          timestamp,
          metrics.category,
          metric,
          value,
          metrics.severity || 'info',
          metrics.description || ''
        ]);
      });

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Security_Metrics!A:F',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });

      return true;
    } catch (error) {
      console.error('[SHEETS] Security metrics export failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Export fraud detection data
   */
  static async exportFraudData(fraudData: {
    transactionId: string;
    riskScore: number;
    amount: number;
    location?: string;
    status: string;
    aiAnalysis?: string;
  }): Promise<boolean> {
    if (!this.isConfigured || !this.sheets || !this.spreadsheetId) return false;

    try {
      const row = [
        new Date().toISOString(),
        fraudData.transactionId,
        fraudData.riskScore,
        fraudData.amount,
        fraudData.location || 'Unknown',
        fraudData.status,
        fraudData.aiAnalysis || 'Not analyzed'
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Fraud_Detection!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [row]
        }
      });

      return true;
    } catch (error) {
      console.error('[SHEETS] Fraud data export failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Health check for Google Sheets integration
   */
  static async healthCheck(): Promise<{ status: string; spreadsheetId?: string; error?: string }> {
    if (!this.isConfigured) {
      return { status: 'not_configured', error: 'Google Sheets credentials not provided' };
    }

    if (!this.sheets || !this.spreadsheetId) {
      return { status: 'not_initialized', error: 'Google Sheets service not initialized' };
    }

    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return { 
        status: 'operational', 
        spreadsheetId: this.spreadsheetId 
      };
    } catch (error) {
      return { 
        status: 'error', 
        error: (error as Error).message 
      };
    }
  }

  /**
   * Get integration status
   */
  static getStatus(): {
    configured: boolean;
    spreadsheetId: string | null;
    worksheets: string[];
  } {
    return {
      configured: this.isConfigured,
      spreadsheetId: this.spreadsheetId,
      worksheets: [
        'Security_Metrics',
        'Fraud_Detection', 
        'Threat_Intelligence',
        'System_Health',
        'Alert_Summary'
      ]
    };
  }
}

export default GoogleSheetsIntegration;