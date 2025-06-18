#!/usr/bin/env node

/**
 * Telegram Bot Alert System for Peter Digital API Test Failures
 * Sends formatted text notifications via Telegram Bot API
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
 * Format Telegram message with HTML formatting
 */
function formatTelegramMessage(summary, config) {
  const timestamp = new Date(summary.reportGeneratedAt).toLocaleString();
  const failureRate = parseFloat(summary.executionSummary.successRate);
  const hasFailures = failureRate < 100;
  
  const alertIcon = hasFailures ? '🚨' : '⚠️';
  const statusText = hasFailures ? 'FAILURES DETECTED' : 'PERFORMANCE ALERT';
  
  let message = `${alertIcon} <b>${statusText}</b>\n`;
  message += `<b>Peter Digital Enterprise Security Platform</b>\n\n`;
  
  message += `🌐 <b>Environment:</b> ${summary.environment}\n`;
  message += `📅 <b>Generated:</b> ${timestamp}\n\n`;
  
  message += `📊 <b>Test Results:</b>\n`;
  message += `• Success Rate: <b>${summary.executionSummary.successRate}%</b>\n`;
  message += `• Total Requests: ${summary.executionSummary.totalRequests}\n`;
  message += `• Failed Requests: <b>${summary.executionSummary.failedRequests}</b>\n`;
  message += `• Avg Response Time: ${summary.executionSummary.averageResponseTime}ms\n`;
  message += `• Critical Alerts: <b>${summary.executionSummary.criticalAlertsTriggered}</b>\n\n`;
  
  message += `🎯 <b>Quality Gates:</b>\n`;
  message += `• Success Rate: ${summary.qualityGates.passedSuccessRate ? '✅' : '❌'} (≥95%)\n`;
  message += `• Response Time: ${summary.qualityGates.passedResponseTime ? '✅' : '❌'} (≤500ms)\n\n`;
  
  message += `🔍 <b>Coverage Analysis:</b>\n`;
  message += `• Authentication: ${summary.coverageAnalysis.authenticationTested ? '✅' : '❌'}\n`;
  message += `• Fraud Detection: ${summary.coverageAnalysis.fraudDetectionTested ? '✅' : '❌'}\n`;
  message += `• Threat Intelligence: ${summary.coverageAnalysis.threatIntelligenceTested ? '✅' : '❌'}\n`;
  message += `• Gift Cards: ${summary.coverageAnalysis.giftCardOperationsTested ? '✅' : '❌'}\n`;
  message += `• Webhooks: ${summary.coverageAnalysis.webhookHandlingTested ? '✅' : '❌'}\n`;
  
  if (summary.recommendations && summary.recommendations.length > 0) {
    message += `\n💡 <b>Recommendations:</b>\n`;
    summary.recommendations.forEach(rec => {
      message += `• ${rec}\n`;
    });
  }
  
  message += `\n📋 <b>Reports:</b>\n`;
  message += `• HTML: docs/reports/elite-api-report.html\n`;
  message += `• JSON: docs/reports/elite-api-report.json\n`;
  message += `• Summary: docs/reports/elite-summary.json`;
  
  return message;
}

/**
 * Send message via Telegram Bot API
 */
async function sendTelegramMessage(message, botToken, chatId, config) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: config.templates.telegram.parseMode,
      disable_web_page_preview: true
    });
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
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
        try {
          const response = JSON.parse(data);
          if (response.ok) {
            resolve({ success: true, response: response });
          } else {
            reject(new Error(`Telegram API error: ${response.description}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
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
 * Retry logic for failed message sends
 */
async function sendWithRetry(message, botToken, chatId, config) {
  let lastError;
  
  for (let attempt = 1; attempt <= config.retryConfig.maxRetries; attempt++) {
    try {
      const result = await sendTelegramMessage(message, botToken, chatId, config);
      console.log(`✅ Telegram alert sent successfully (attempt ${attempt})`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️  Telegram alert attempt ${attempt} failed:`, error.message);
      
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
async function sendTelegramAlert() {
  console.log('📱 Telegram Alert System - Peter Digital API Monitor');
  console.log('==================================================\n');

  // Load configuration
  const config = loadConfig();
  if (!config) {
    console.error('❌ Failed to load alert configuration');
    process.exit(1);
  }

  // Check if Telegram alerts are enabled
  if (!config.telegramEnabled) {
    console.log('ℹ️  Telegram alerts are disabled in configuration');
    return;
  }

  // Check required environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable not set');
    process.exit(1);
  }
  
  if (!chatId) {
    console.error('❌ TELEGRAM_CHAT_ID environment variable not set');
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
    console.log('✅ All thresholds passed - no Telegram alert needed');
    return;
  }

  try {
    // Format and send Telegram message
    const message = formatTelegramMessage(summary, config);
    await sendWithRetry(message, botToken, chatId, config);
    
    console.log('📊 Telegram Alert Details:');
    console.log(`   Chat ID: ${chatId}`);
    console.log(`   Message Length: ${message.length} characters`);
    console.log(`   Success Rate: ${summary.executionSummary.successRate}%`);
    console.log(`   Failed Requests: ${summary.executionSummary.failedRequests}`);
    console.log(`   Critical Alerts: ${summary.executionSummary.criticalAlertsTriggered}`);
    
  } catch (error) {
    console.error('❌ Failed to send Telegram alert:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendTelegramAlert()
    .then(() => {
      console.log('\n✅ Telegram alert process completed');
    })
    .catch((error) => {
      console.error('\n❌ Telegram alert process failed:', error);
      process.exit(1);
    });
}

export { sendTelegramAlert };