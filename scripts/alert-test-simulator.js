/**
 * Alert Test Simulator for Peter Digital Enterprise Security Platform
 * Simulates API test failures to validate the complete alerting infrastructure
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const REPORTS_DIR = path.join(__dirname, '../docs/reports');
const ELITE_SUMMARY_PATH = path.join(REPORTS_DIR, 'elite-summary.json');

/**
 * Generate simulated failure data
 */
function generateSimulatedFailures() {
  const timestamp = new Date().toISOString();
  
  const simulatedSummary = {
    reportGeneratedAt: timestamp,
    executionSummary: {
      totalRequests: 51,
      failCount: 8,
      successRate: 84.31,
      avgResponseTime: 12.4,
      totalTime: 8532,
      criticalAlerts: 3
    },
    failures: [
      {
        name: "POST /api/auth/token",
        error: "400 Bad Request - Invalid credentials",
        responseTime: 45,
        statusCode: 400
      },
      {
        name: "POST /api/gift-cards/issue",
        error: "500 Internal Server Error - Square API connection failed",
        responseTime: 5000,
        statusCode: 500
      },
      {
        name: "GET /api/admin/users",
        error: "401 Unauthorized - Missing authentication token",
        responseTime: 8,
        statusCode: 401
      },
      {
        name: "POST /api/gift-card-admin/link",
        error: "500 Internal Server Error - Database connection timeout",
        responseTime: 30000,
        statusCode: 500
      },
      {
        name: "GET /api/fraud/signals",
        error: "503 Service Unavailable - AI service overloaded",
        responseTime: 15000,
        statusCode: 503
      },
      {
        name: "POST /api/threats/replay",
        error: "422 Unprocessable Entity - Invalid scenario data",
        responseTime: 250,
        statusCode: 422
      },
      {
        name: "GET /api/digest/latest",
        error: "504 Gateway Timeout - OpenAI API timeout",
        responseTime: 60000,
        statusCode: 504
      },
      {
        name: "POST /api/webhooks/gift-cards",
        error: "400 Bad Request - Malformed webhook payload",
        responseTime: 12,
        statusCode: 400
      }
    ],
    performanceMetrics: {
      p95ResponseTime: 15000,
      p99ResponseTime: 60000,
      errorRate: 15.69,
      throughput: 5.98
    },
    securityMetrics: {
      authFailures: 3,
      suspiciousRequests: 2,
      rateLimitHits: 1,
      securityScore: 7.2
    }
  };

  return simulatedSummary;
}

/**
 * Write simulated failure data
 */
function writeSimulatedData(summary) {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  try {
    fs.writeFileSync(ELITE_SUMMARY_PATH, JSON.stringify(summary, null, 2));
    console.log('✅ Simulated failure data written to:', ELITE_SUMMARY_PATH);
    return true;
  } catch (error) {
    console.error('❌ Failed to write simulated data:', error.message);
    return false;
  }
}

/**
 * Trigger all alert systems
 */
async function triggerAllAlerts() {
  console.log('🚨 Triggering Alert Systems...');
  
  const alertScripts = [
    'ai-failure-analyzer.js',
    'slack-alert.js',
    'mailgun-alert.js',
    'telegram-alert.js'
  ];

  for (const script of alertScripts) {
    console.log(`📡 Triggering: ${script}`);
    
    try {
      const child = spawn('node', [script], {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, BASE_URL: 'http://localhost:5000' }
      });

      await new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ ${script} completed successfully`);
            resolve();
          } else {
            console.log(`⚠️ ${script} completed with code ${code}`);
            resolve(); // Continue with other alerts even if one fails
          }
        });
        
        child.on('error', (error) => {
          console.log(`⚠️ ${script} error: ${error.message}`);
          resolve(); // Continue with other alerts
        });
      });
    } catch (error) {
      console.log(`⚠️ Failed to trigger ${script}: ${error.message}`);
    }
  }
}

/**
 * Main execution function
 */
async function runAlertTest() {
  console.log('🧪 Alert Test Simulator - Peter Digital Enterprise Security Platform');
  console.log('============================================================================');
  console.log('');

  console.log('📊 Generating simulated failure data...');
  const simulatedData = generateSimulatedFailures();
  
  console.log('💾 Writing test data to reports...');
  const writeSuccess = writeSimulatedData(simulatedData);
  
  if (!writeSuccess) {
    console.error('❌ Failed to write test data. Aborting alert test.');
    process.exit(1);
  }

  console.log('');
  console.log('🔥 Simulated Failure Summary:');
  console.log('============================');
  console.log(`Total Requests: ${simulatedData.executionSummary.totalRequests}`);
  console.log(`Failed Tests: ${simulatedData.executionSummary.failCount}`);
  console.log(`Success Rate: ${simulatedData.executionSummary.successRate}%`);
  console.log(`Avg Response Time: ${simulatedData.executionSummary.avgResponseTime}ms`);
  console.log(`Critical Alerts: ${simulatedData.executionSummary.criticalAlerts}`);
  console.log('');

  console.log('🚨 Top Failures:');
  simulatedData.failures.slice(0, 3).forEach((failure, index) => {
    console.log(`${index + 1}. ${failure.name} → ${failure.statusCode} (${failure.responseTime}ms)`);
  });
  console.log('');

  await triggerAllAlerts();
  
  console.log('');
  console.log('✅ Alert test simulation completed!');
  console.log('📄 Check the following for results:');
  console.log('   • docs/failure-analysis-report.md');
  console.log('   • docs/reports/elite-summary.json');
  console.log('   • Slack/Email/Telegram notifications (if configured)');
}

/**
 * Execute if run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runAlertTest().catch(error => {
    console.error('Fatal error during alert test:', error);
    process.exit(1);
  });
}

export { runAlertTest, generateSimulatedFailures, triggerAllAlerts };