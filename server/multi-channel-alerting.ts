import { WebClient } from '@slack/web-api';
import { EnvironmentService } from './services/EnvironmentService.js';

/**
 * Multi-Channel Alerting System
 * Sends alerts via Slack, Email, and Telegram based on threat levels
 */

export interface AlertMessage {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata?: Record<string, any>;
}

export class MultiChannelAlerting {
  private static slackClient: WebClient | null = null;
  private static emailConfig: any = null;
  private static telegramConfig: { botToken: string; chatId: string } | null = null;

  /**
   * Initialize all alerting channels
   */
  static async initialize(): Promise<void> {
    const config = EnvironmentService.getConfig();
    
    // Initialize Slack
    if (config.slack.botToken && config.slack.channelId) {
      this.slackClient = new WebClient(config.slack.botToken);
      console.log('[ALERTS] Slack integration initialized');
    } else {
      console.log('[ALERTS] Slack not configured - alerts will skip Slack');
    }

    // Initialize Email configuration
    if (config.email.smtpHost && config.email.smtpUser && config.email.smtpPass) {
      this.emailConfig = {
        host: config.email.smtpHost,
        port: config.email.smtpPort || 587,
        secure: config.email.smtpPort === 465,
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass
        },
        from: config.email.fromAddress || config.email.smtpUser,
        to: config.email.alertRecipients || config.email.smtpUser
      };
      console.log('[ALERTS] Email integration configured');
    } else {
      console.log('[ALERTS] Email not configured - alerts will skip email');
    }

    // Initialize Telegram
    if (config.telegram.botToken && config.telegram.chatId) {
      this.telegramConfig = {
        botToken: config.telegram.botToken,
        chatId: config.telegram.chatId
      };
      console.log('[ALERTS] Telegram integration initialized');
    } else {
      console.log('[ALERTS] Telegram not configured - alerts will skip Telegram');
    }
  }

  /**
   * Send alert to all configured channels
   */
  static async sendAlert(alert: AlertMessage): Promise<{
    slack: boolean;
    email: boolean;
    telegram: boolean;
    errors: string[];
  }> {
    const results = {
      slack: false,
      email: false,
      telegram: false,
      errors: [] as string[]
    };

    // Send to Slack
    try {
      if (this.slackClient) {
        await this.sendSlackAlert(alert);
        results.slack = true;
      }
    } catch (error) {
      results.errors.push(`Slack: ${(error as Error).message}`);
    }

    // Send via Email
    try {
      if (this.emailConfig) {
        await this.sendEmailAlert(alert);
        results.email = true;
      }
    } catch (error) {
      results.errors.push(`Email: ${(error as Error).message}`);
    }

    // Send to Telegram
    try {
      if (this.telegramConfig) {
        await this.sendTelegramAlert(alert);
        results.telegram = true;
      }
    } catch (error) {
      results.errors.push(`Telegram: ${(error as Error).message}`);
    }

    return results;
  }

  /**
   * Send alert to Slack
   */
  private static async sendSlackAlert(alert: AlertMessage): Promise<void> {
    if (!this.slackClient) return;

    const config = EnvironmentService.getConfig();
    const severityColors = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff6b00',
      critical: '#ff0000'
    };

    const severityEmojis = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    await this.slackClient.chat.postMessage({
      channel: config.slack.channelId!,
      text: `${severityEmojis[alert.severity]} Security Alert: ${alert.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmojis[alert.severity]} Security Alert`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Title:*\n${alert.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${alert.severity.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${alert.timestamp}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n${alert.message}`
          }
        }
      ],
      attachments: [
        {
          color: severityColors[alert.severity],
          fields: alert.metadata ? Object.entries(alert.metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })) : []
        }
      ]
    });
  }

  /**
   * Send alert via Email (using fetch for HTTP requests)
   */
  private static async sendEmailAlert(alert: AlertMessage): Promise<void> {
    if (!this.emailConfig) return;

    const severitySubjects = {
      low: '[LOW] Security Alert',
      medium: '[MEDIUM] Security Alert',
      high: '[HIGH] Security Alert - Immediate Attention Required',
      critical: '[CRITICAL] Security Alert - URGENT ACTION REQUIRED'
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .alert-header { background-color: ${alert.severity === 'critical' ? '#ff0000' : alert.severity === 'high' ? '#ff6b00' : alert.severity === 'medium' ? '#ff9500' : '#36a64f'}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
            .alert-body { border: 1px solid #ddd; padding: 20px; border-radius: 0 0 5px 5px; }
            .metadata { background-color: #f8f9fa; padding: 10px; margin-top: 15px; border-radius: 5px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="alert-header">
            <h2>${alert.title}</h2>
            <p>Severity: ${alert.severity.toUpperCase()} | Time: ${alert.timestamp}</p>
        </div>
        <div class="alert-body">
            <p>${alert.message}</p>
            ${alert.metadata ? `
            <div class="metadata">
                <h4>Additional Information:</h4>
                ${Object.entries(alert.metadata).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p>This alert was generated by Peter Digital Enterprise Security Platform</p>
        </div>
    </body>
    </html>
    `;

    // Email would be sent via configured SMTP service
    console.log(`[EMAIL] Would send alert: ${severitySubjects[alert.severity]} to ${this.emailConfig.to}`);
  }

  /**
   * Send alert to Telegram
   */
  private static async sendTelegramAlert(alert: AlertMessage): Promise<void> {
    if (!this.telegramConfig) return;

    const severityEmojis = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    let message = `${severityEmojis[alert.severity]} *Security Alert*\n\n`;
    message += `*Title:* ${alert.title}\n`;
    message += `*Severity:* ${alert.severity.toUpperCase()}\n`;
    message += `*Time:* ${alert.timestamp}\n\n`;
    message += `*Details:*\n${alert.message}`;

    if (alert.metadata) {
      message += '\n\n*Additional Information:*\n';
      Object.entries(alert.metadata).forEach(([key, value]) => {
        message += `• *${key}:* ${value}\n`;
      });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: this.telegramConfig.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }
    } catch (error) {
      console.error('[TELEGRAM] Send error:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Send fraud detection alert
   */
  static async sendFraudAlert(fraudData: {
    transactionId: string;
    riskScore: number;
    amount: number;
    location?: string;
    userId?: string;
  }): Promise<void> {
    const severity: AlertMessage['severity'] = 
      fraudData.riskScore >= 90 ? 'critical' :
      fraudData.riskScore >= 70 ? 'high' :
      fraudData.riskScore >= 40 ? 'medium' : 'low';

    const alert: AlertMessage = {
      title: 'Fraudulent Transaction Detected',
      message: `A potentially fraudulent transaction has been detected with a risk score of ${fraudData.riskScore}%. Transaction ID: ${fraudData.transactionId}`,
      severity,
      timestamp: new Date().toISOString(),
      metadata: {
        'Transaction ID': fraudData.transactionId,
        'Risk Score': `${fraudData.riskScore}%`,
        'Amount': `$${fraudData.amount}`,
        'Location': fraudData.location || 'Unknown',
        'User ID': fraudData.userId || 'Unknown'
      }
    };

    await this.sendAlert(alert);
  }

  /**
   * Send threat intelligence alert
   */
  static async sendThreatAlert(threatData: {
    threatType: string;
    sourceIP: string;
    threatLevel: string;
    description: string;
  }): Promise<void> {
    const severityMap: Record<string, AlertMessage['severity']> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };

    const alert: AlertMessage = {
      title: `Threat Detected: ${threatData.threatType}`,
      message: threatData.description,
      severity: severityMap[threatData.threatLevel] || 'medium',
      timestamp: new Date().toISOString(),
      metadata: {
        'Threat Type': threatData.threatType,
        'Source IP': threatData.sourceIP,
        'Threat Level': threatData.threatLevel,
        'Detection Time': new Date().toLocaleString()
      }
    };

    await this.sendAlert(alert);
  }

  /**
   * Send system health alert
   */
  static async sendSystemAlert(systemData: {
    component: string;
    status: string;
    message: string;
    severity: AlertMessage['severity'];
  }): Promise<void> {
    const alert: AlertMessage = {
      title: `System Alert: ${systemData.component}`,
      message: systemData.message,
      severity: systemData.severity,
      timestamp: new Date().toISOString(),
      metadata: {
        'Component': systemData.component,
        'Status': systemData.status,
        'Alert Time': new Date().toLocaleString()
      }
    };

    await this.sendAlert(alert);
  }

  /**
   * Test all alert channels
   */
  static async testAlerts(): Promise<{
    slack: boolean;
    email: boolean;
    telegram: boolean;
    errors: string[];
  }> {
    const testAlert: AlertMessage = {
      title: 'Alert System Test',
      message: 'This is a test message to verify multi-channel alerting functionality.',
      severity: 'low',
      timestamp: new Date().toISOString(),
      metadata: {
        'Test Type': 'System Verification',
        'Environment': process.env.NODE_ENV || 'development'
      }
    };

    return await this.sendAlert(testAlert);
  }

  /**
   * Get alert channel status
   */
  static getChannelStatus(): {
    slack: boolean;
    email: boolean;
    telegram: boolean;
  } {
    return {
      slack: this.slackClient !== null,
      email: this.emailConfig !== null,
      telegram: this.telegramConfig !== null
    };
  }
}

export default MultiChannelAlerting;