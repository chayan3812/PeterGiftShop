#!/usr/bin/env node

/**
 * Mailgun Email Alert System for Peter Digital API Test Failures
 * Sends formatted HTML email notifications with detailed test results
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration paths
const ALERT_CONFIG_PATH = path.join(__dirname, '../config/alert-config.json');
const ELITE_SUMMARY_PATH = path.join(__dirname, '../docs/reports/elite-summary.json');

/**
 * Load configuration files
 */
function loadConfig() {
  try {
    const alertConfig = JSON.parse(fs.readFileSync(ALERT_CONFIG_PATH, 'utf8'));
    return alertConfig;
  } catch (error) {
    console.error('Failed to load alert configuration:', error.message);
    return null;
  }
}

/**
 * Load test summary from elite Newman report
 */
function loadTestSummary() {
  try {
    const summary = JSON.parse(fs.readFileSync(ELITE_SUMMARY_PATH, 'utf8'));
    return summary;
  } catch (error) {
    console.error('Failed to load test summary:', error.message);
    return null;
  }
}

/**
 * Generate HTML email template
 */
function generateHtmlEmail(summary) {
  const timestamp = new Date(summary.reportGeneratedAt).toLocaleString();
  const failureRate = parseFloat(summary.executionSummary.successRate);
  const hasFailures = failureRate < 100;
  
  const statusColor = hasFailures ? '#dc3545' : '#ffc107';
  const statusText = hasFailures ? 'FAILURES DETECTED' : 'PERFORMANCE ALERT';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Peter Digital API Test Alert</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .metric-card { background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 14px; }
        .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .recommendations { background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-success { background-color: #d4edda; color: #155724; }
        .status-danger { background-color: #f8d7da; color: #721c24; }
        .quality-gates { margin: 20px 0; }
        .quality-gate { display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background-color: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ ${statusText}</h1>
            <p>Peter Digital Enterprise Security Platform</p>
        </div>
        
        <div class="content">
            <h2>Test Execution Summary</h2>
            <p><strong>Environment:</strong> ${summary.environment}</p>
            <p><strong>Report Generated:</strong> ${timestamp}</p>
            
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value" style="color: ${hasFailures ? '#dc3545' : '#28a745'}">${summary.executionSummary.successRate}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${summary.executionSummary.totalRequests}</div>
                    <div class="metric-label">Total Requests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="color: ${summary.executionSummary.failedRequests > 0 ? '#dc3545' : '#28a745'}">${summary.executionSummary.failedRequests}</div>
                    <div class="metric-label">Failed Requests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${summary.executionSummary.averageResponseTime}ms</div>
                    <div class="metric-label">Avg Response Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${summary.executionSummary.criticalAlertsTriggered}</div>
                    <div class="metric-label">Critical Alerts</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${summary.coverageAnalysis.endpointsCovered}</div>
                    <div class="metric-label">Endpoints Tested</div>
                </div>
            </div>

            <div class="quality-gates">
                <h3>Quality Gates</h3>
                <div class="quality-gate">
                    <span>Success Rate Threshold (95%)</span>
                    <span class="status-badge ${summary.qualityGates.passedSuccessRate ? 'status-success' : 'status-danger'}">
                        ${summary.qualityGates.passedSuccessRate ? 'PASSED' : 'FAILED'}
                    </span>
                </div>
                <div class="quality-gate">
                    <span>Response Time Threshold (500ms)</span>
                    <span class="status-badge ${summary.qualityGates.passedResponseTime ? 'status-success' : 'status-danger'}">
                        ${summary.qualityGates.passedResponseTime ? 'PASSED' : 'FAILED'}
                    </span>
                </div>
            </div>

            <div class="alert-box">
                <h3>🔍 Coverage Analysis</h3>
                <ul>
                    <li>Authentication: ${summary.coverageAnalysis.authenticationTested ? '✅' : '❌'}</li>
                    <li>Fraud Detection: ${summary.coverageAnalysis.fraudDetectionTested ? '✅' : '❌'}</li>
                    <li>Threat Intelligence: ${summary.coverageAnalysis.threatIntelligenceTested ? '✅' : '❌'}</li>
                    <li>Gift Card Operations: ${summary.coverageAnalysis.giftCardOperationsTested ? '✅' : '❌'}</li>
                    <li>Webhook Handling: ${summary.coverageAnalysis.webhookHandlingTested ? '✅' : '❌'}</li>
                </ul>
            </div>

            ${summary.recommendations && summary.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>📋 Recommendations</h3>
                <ul>
                    ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                <h3>🔗 Quick Links</h3>
                <p><strong>HTML Report:</strong> docs/reports/elite-api-report.html</p>
                <p><strong>JSON Report:</strong> docs/reports/elite-api-report.json</p>
                <p><strong>Elite Summary:</strong> docs/reports/elite-summary.json</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Peter Digital Enterprise Security Platform - API Monitoring System</p>
            <p>This alert was generated automatically based on test failure thresholds</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Send email via Mailgun API
 */
async function sendMailgunEmail(htmlContent, subject, recipient, config) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    
    if (!apiKey || !domain) {
      reject(new Error('MAILGUN_API_KEY or MAILGUN_DOMAIN not set'));
      return;
    }

    const formData = new URLSearchParams();
    formData.append('from', `Peter Digital Monitor <noreply@${domain}>`);
    formData.append('to', recipient);
    formData.append('subject', subject);
    formData.append('html', htmlContent);

    const auth = Buffer.from(`api:${apiKey}`).toString('base64');
    const postData = formData.toString();
    
    const options = {
      hostname: 'api.mailgun.net',
      port: 443,
      path: `/v3/${domain}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, response: JSON.parse(data) });
        } else {
          reject(new Error(`Mailgun API returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Retry logic for failed email sends
 */
async function sendWithRetry(htmlContent, subject, recipient, config) {
  let lastError;
  
  for (let attempt = 1; attempt <= config.retryConfig.maxRetries; attempt++) {
    try {
      const result = await sendMailgunEmail(htmlContent, subject, recipient, config);
      console.log(`✅ Email alert sent successfully (attempt ${attempt})`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️  Email alert attempt ${attempt} failed:`, error.message);
      
      if (attempt < config.retryConfig.maxRetries) {
        console.log(`🔄 Retrying in ${config.retryConfig.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, config.retryConfig.retryDelay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Main execution function
 */
async function sendMailgunAlert() {
  console.log('📧 Mailgun Email Alert System - Peter Digital API Monitor');
  console.log('======================================================\n');

  // Load configuration
  const config = loadConfig();
  if (!config) {
    console.error('❌ Failed to load alert configuration');
    process.exit(1);
  }

  // Check if email alerts are enabled
  if (!config.emailEnabled) {
    console.log('ℹ️  Email alerts are disabled in configuration');
    return;
  }

  // Check required environment variables
  const recipient = process.env.ALERT_RECIPIENT_EMAIL;
  if (!recipient) {
    console.error('❌ ALERT_RECIPIENT_EMAIL environment variable not set');
    process.exit(1);
  }

  // Load test summary
  const summary = loadTestSummary();
  if (!summary) {
    console.error('❌ Failed to load test summary');
    process.exit(1);
  }

  // Check if alert should be sent based on thresholds
  const successRate = parseFloat(summary.executionSummary.successRate);
  const shouldAlert = successRate < (100 - config.thresholds.failureRate * 100) ||
                     summary.executionSummary.criticalAlertsTriggered >= config.thresholds.criticalAlerts ||
                     parseFloat(summary.executionSummary.averageResponseTime) > config.thresholds.responseTime;

  if (!shouldAlert) {
    console.log('✅ All thresholds passed - no email alert needed');
    return;
  }

  try {
    // Generate HTML email content
    const htmlContent = generateHtmlEmail(summary);
    const subject = `${config.templates.email.subject} - ${summary.executionSummary.successRate}% Success Rate`;
    
    // Send email with retry logic
    await sendWithRetry(htmlContent, subject, recipient, config);
    
    console.log('📊 Email Alert Details:');
    console.log(`   Recipient: ${recipient}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Success Rate: ${summary.executionSummary.successRate}%`);
    console.log(`   Failed Requests: ${summary.executionSummary.failedRequests}`);
    console.log(`   Critical Alerts: ${summary.executionSummary.criticalAlertsTriggered}`);
    
  } catch (error) {
    console.error('❌ Failed to send email alert:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendMailgunAlert()
    .then(() => {
      console.log('\n✅ Email alert process completed');
    })
    .catch((error) => {
      console.error('\n❌ Email alert process failed:', error);
      process.exit(1);
    });
}

export { sendMailgunAlert };