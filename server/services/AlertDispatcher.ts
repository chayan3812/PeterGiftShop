import { activityLogger } from '../db/activity-log';

interface AlertPayload {
  type: 'fraud' | 'geo-threat';
  score: number;
  summary: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

interface AlertConfig {
  slackWebhookUrl?: string;
  mailgunApiKey?: string;
  alertEmailTo?: string;
  minScoreThreshold: number;
  enableSlack: boolean;
  enableEmail: boolean;
  enableConsole: boolean;
}

const unsentAlerts: AlertPayload[] = [];

export const AlertDispatcher = {
  config: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    mailgunApiKey: process.env.MAILGUN_API_KEY,
    alertEmailTo: process.env.ALERT_EMAIL_TO,
    minScoreThreshold: 85,
    enableSlack: !!process.env.SLACK_WEBHOOK_URL,
    enableEmail: !!(process.env.MAILGUN_API_KEY && process.env.ALERT_EMAIL_TO),
    enableConsole: true
  } as AlertConfig,

  async dispatch(payload: AlertPayload): Promise<void> {
    try {
      // Determine severity if not provided
      if (!payload.severity) {
        payload.severity = this.calculateSeverity(payload.score);
      }

      // Check if alert meets threshold
      if (payload.score < this.config.minScoreThreshold && payload.severity !== 'critical') {
        return;
      }

      const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Log alert activity
      activityLogger.log('webhook', {
        action: 'alert_dispatched',
        alert_id: alertId,
        type: payload.type,
        score: payload.score,
        severity: payload.severity,
        summary: payload.summary
      }, 'alert_dispatcher');

      // Dispatch to all configured channels
      const results = await Promise.allSettled([
        this.sendSlackAlert(payload, alertId),
        this.sendEmailAlert(payload, alertId),
        this.sendConsoleAlert(payload, alertId)
      ]);

      // Handle any failed dispatches
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Alert dispatch failed for channel ${index}:`, result.reason);
          unsentAlerts.push({ ...payload, metadata: { alertId, failedChannel: index } });
        }
      });

    } catch (error) {
      console.error('Alert dispatcher error:', error);
      unsentAlerts.push(payload);
    }
  },

  calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 95) return 'critical';
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  },

  async sendSlackAlert(payload: AlertPayload, alertId: string): Promise<void> {
    if (!this.config.enableSlack || !this.config.slackWebhookUrl) {
      throw new Error('Slack not configured');
    }

    const color = this.getSeverityColor(payload.severity!);
    const emoji = this.getSeverityEmoji(payload.severity!);
    
    const slackMessage = {
      text: `${emoji} Fraud Alert - ${payload.severity?.toUpperCase()}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Alert Type',
              value: payload.type === 'fraud' ? 'Fraud Detection' : 'Geo-Threat',
              short: true
            },
            {
              title: 'Risk Score',
              value: `${payload.score}/100`,
              short: true
            },
            {
              title: 'Summary',
              value: payload.summary,
              short: false
            },
            {
              title: 'Timestamp',
              value: new Date(payload.timestamp).toLocaleString(),
              short: true
            },
            {
              title: 'Alert ID',
              value: alertId,
              short: true
            }
          ],
          footer: 'Square Fraud Detection Engine',
          ts: Math.floor(new Date(payload.timestamp).getTime() / 1000)
        }
      ]
    };

    const response = await fetch(this.config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  },

  async sendEmailAlert(payload: AlertPayload, alertId: string): Promise<void> {
    if (!this.config.enableEmail || !this.config.mailgunApiKey || !this.config.alertEmailTo) {
      throw new Error('Email not configured');
    }

    const subject = `🚨 ${payload.severity?.toUpperCase()} Fraud Alert - Score ${payload.score}/100`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px;">
          <h2 style="color: #ef4444; margin: 0 0 16px 0;">
            🚨 Fraud Detection Alert
          </h2>
          
          <div style="background: #374151; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <table style="width: 100%; color: white;">
              <tr>
                <td style="padding: 8px 0;"><strong>Alert Type:</strong></td>
                <td style="padding: 8px 0;">${payload.type === 'fraud' ? 'Fraud Detection' : 'Geo-Threat Intelligence'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Risk Score:</strong></td>
                <td style="padding: 8px 0; color: #ef4444;"><strong>${payload.score}/100</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Severity:</strong></td>
                <td style="padding: 8px 0; color: ${this.getSeverityColor(payload.severity!)};"><strong>${payload.severity?.toUpperCase()}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Summary:</strong></td>
                <td style="padding: 8px 0;">${payload.summary}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Timestamp:</strong></td>
                <td style="padding: 8px 0;">${new Date(payload.timestamp).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Alert ID:</strong></td>
                <td style="padding: 8px 0; font-family: monospace;">${alertId}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 20px; padding: 12px; background: #1e40af; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px;">
              This is an automated alert from your Square Fraud Detection Engine.
              Please review your admin dashboard for more details.
            </p>
          </div>
        </div>
      </div>
    `;

    // Mailgun API call simulation (in production, use actual Mailgun SDK or API)
    const mailgunData = new FormData();
    mailgunData.append('from', 'Square Fraud Alert <alerts@yourdomain.com>');
    mailgunData.append('to', this.config.alertEmailTo);
    mailgunData.append('subject', subject);
    mailgunData.append('html', htmlBody);

    console.log(`📧 Email alert prepared for ${this.config.alertEmailTo}:`, {
      subject,
      alertId,
      score: payload.score,
      type: payload.type
    });

    // In production, uncomment and configure:
    // const response = await fetch(`https://api.mailgun.net/v3/yourdomain.com/messages`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(`api:${this.config.mailgunApiKey}`).toString('base64')}`
    //   },
    //   body: mailgunData
    // });
  },

  async sendConsoleAlert(payload: AlertPayload, alertId: string): Promise<void> {
    if (!this.config.enableConsole) {
      return;
    }

    const emoji = this.getSeverityEmoji(payload.severity!);
    const timestamp = new Date(payload.timestamp).toLocaleString();
    
    console.log(`\n${emoji} FRAUD ALERT [${payload.severity?.toUpperCase()}] ${emoji}`);
    console.log(`├─ Alert ID: ${alertId}`);
    console.log(`├─ Type: ${payload.type}`);
    console.log(`├─ Score: ${payload.score}/100`);
    console.log(`├─ Summary: ${payload.summary}`);
    console.log(`├─ Time: ${timestamp}`);
    console.log(`└─ Status: Dispatched\n`);
  },

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  },

  getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  },

  getUnsentAlerts(): AlertPayload[] {
    return [...unsentAlerts];
  },

  clearUnsentAlerts(): void {
    unsentAlerts.length = 0;
  },

  getConfig(): AlertConfig {
    return { ...this.config };
  },

  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
};