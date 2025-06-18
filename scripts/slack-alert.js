#!/usr/bin/env node

/**
 * Slack Alert System for Peter Digital API Test Failures
 * Sends formatted failure notifications to Slack webhook
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
 * Format Slack message with rich formatting
 */
function formatSlackMessage(summary, config) {
  const timestamp = new Date(summary.reportGeneratedAt).toLocaleString();
  const failureRate = parseFloat(summary.executionSummary.successRate);
  const hasFailures = failureRate < 100;
  
  const color = hasFailures ? 'danger' : 'warning';
  const emoji = hasFailures ? ':rotating_light:' : ':warning:';
  
  const message = {
    username: config.templates.slack.username,
    icon_emoji: config.templates.slack.icon_emoji,
    attachments: [
      {
        color: color,
        title: `${emoji} Peter Digital API Test Alert`,
        title_link: summary.environment,
        fields: [
          {
            title: 'Test Environment',
            value: summary.environment,
            short: true
          },
          {
            title: 'Success Rate',
            value: `${summary.executionSummary.successRate}%`,
            short: true
          },
          {
            title: 'Total Requests',
            value: summary.executionSummary.totalRequests,
            short: true
          },
          {
            title: 'Failed Requests',
            value: summary.executionSummary.failedRequests,
            short: true
          },
          {
            title: 'Average Response Time',
            value: `${summary.executionSummary.averageResponseTime}ms`,
            short: true
          },
          {
            title: 'Critical Alerts',
            value: summary.executionSummary.criticalAlertsTriggered,
            short: true
          }
        ],
        footer: 'Peter Digital API Monitor',
        ts: Math.floor(new Date(summary.reportGeneratedAt).getTime() / 1000)
      }
    ]
  };

  // Add failure details if any
  if (hasFailures) {
    message.attachments[0].fields.push({
      title: 'Quality Gates',
      value: `Success Rate: ${summary.qualityGates.passedSuccessRate ? ':white_check_mark:' : ':x:'}\nResponse Time: ${summary.qualityGates.passedResponseTime ? ':white_check_mark:' : ':x:'}`,
      short: false
    });

    if (summary.recommendations && summary.recommendations.length > 0) {
      message.attachments[0].fields.push({
        title: 'Recommendations',
        value: summary.recommendations.map(rec => `• ${rec}`).join('\n'),
        short: false
      });
    }
  }

  return message;
}

/**
 * Send message to Slack webhook
 */
async function sendSlackMessage(message, webhookUrl, retryConfig) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(message);
    const url = new URL(webhookUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, response: data });
        } else {
          reject(new Error(`Slack webhook returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Retry logic for failed webhook calls
 */
async function sendWithRetry(message, webhookUrl, retryConfig) {
  let lastError;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await sendSlackMessage(message, webhookUrl, retryConfig);
      console.log(`✅ Slack alert sent successfully (attempt ${attempt})`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️  Slack alert attempt ${attempt} failed:`, error.message);
      
      if (attempt < retryConfig.maxRetries) {
        console.log(`🔄 Retrying in ${retryConfig.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Main execution function
 */
async function sendSlackAlert() {
  console.log('🔔 Slack Alert System - Peter Digital API Monitor');
  console.log('================================================\n');

  // Load configuration
  const config = loadConfig();
  if (!config) {
    console.error('❌ Failed to load alert configuration');
    process.exit(1);
  }

  // Check if Slack alerts are enabled
  if (!config.slackEnabled) {
    console.log('ℹ️  Slack alerts are disabled in configuration');
    return;
  }

  // Check webhook URL
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('❌ SLACK_WEBHOOK_URL environment variable not set');
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
    console.log('✅ All thresholds passed - no alert needed');
    return;
  }

  try {
    // Format and send Slack message
    const message = formatSlackMessage(summary, config);
    await sendWithRetry(message, webhookUrl, config.retryConfig);
    
    console.log('📊 Alert Details:');
    console.log(`   Success Rate: ${summary.executionSummary.successRate}%`);
    console.log(`   Failed Requests: ${summary.executionSummary.failedRequests}`);
    console.log(`   Critical Alerts: ${summary.executionSummary.criticalAlertsTriggered}`);
    console.log(`   Response Time: ${summary.executionSummary.averageResponseTime}ms`);
    
  } catch (error) {
    console.error('❌ Failed to send Slack alert:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendSlackAlert()
    .then(() => {
      console.log('\n✅ Slack alert process completed');
    })
    .catch((error) => {
      console.error('\n❌ Slack alert process failed:', error);
      process.exit(1);
    });
}

export { sendSlackAlert };