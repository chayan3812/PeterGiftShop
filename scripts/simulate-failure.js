/**
 * Failure Simulation Script for Peter Digital Enterprise Security Platform
 * Simulates realistic API test failures to trigger the complete alerting infrastructure
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
 * Generate realistic failure scenario
 */
function generateFailureScenario() {
  const timestamp = new Date().toISOString();
  
  const failureScenario = {
    reportGeneratedAt: timestamp,
    testName: "Gift Card Balance Check Failure Simulation",
    executionSummary: {
      totalRequests: 51,
      failCount: 3,
      successRate: 94.12,
      avgResponseTime: 15.8,
      totalTime: 9420,
      criticalAlerts: 1,
      passedSuccessRate: false,
      passedResponseTime: false
    },
    failures: [
      {
        name: "GET /api/gift-cards/check-balance",
        error: "500 Internal Server Error - Square API timeout during balance lookup",
        responseTime: 30000,
        statusCode: 500,
        details: {
          endpoint: "/api/gift-cards/check-balance",
          method: "GET",
          expectedStatus: 200,
          actualStatus: 500,
          errorType: "TIMEOUT_ERROR",
          squareApiError: "Connection timeout after 30s",
          giftCardCode: "GC_TEST_INVALID_123"
        }
      },
      {
        name: "POST /api/gift-cards/issue",
        error: "422 Unprocessable Entity - Invalid amount parameter",
        responseTime: 125,
        statusCode: 422,
        details: {
          endpoint: "/api/gift-cards/issue",
          method: "POST",
          expectedStatus: 201,
          actualStatus: 422,
          errorType: "VALIDATION_ERROR",
          validationErrors: ["Amount must be between $1 and $2000"]
        }
      },
      {
        name: "GET /api/admin/users",
        error: "401 Unauthorized - Authentication token expired",
        responseTime: 8,
        statusCode: 401,
        details: {
          endpoint: "/api/admin/users",
          method: "GET",
          expectedStatus: 200,
          actualStatus: 401,
          errorType: "AUTH_ERROR",
          tokenExpired: true
        }
      }
    ],
    performanceMetrics: {
      p95ResponseTime: 30000,
      p99ResponseTime: 30000,
      errorRate: 5.88,
      throughput: 5.41,
      criticalEndpoints: ["/api/gift-cards/check-balance"]
    },
    securityMetrics: {
      authFailures: 1,
      suspiciousRequests: 0,
      rateLimitHits: 0,
      securityScore: 8.5
    },
    alertTriggers: {
      successRateBelow95: true,
      responseTimeAbove1000ms: true,
      criticalEndpointFailure: true,
      squareApiTimeout: true
    }
  };

  return failureScenario;
}

/**
 * Write failure scenario to reports
 */
function writeFailureData(scenario) {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  try {
    fs.writeFileSync(ELITE_SUMMARY_PATH, JSON.stringify(scenario, null, 2));
    console.log('✅ Failure scenario written to:', ELITE_SUMMARY_PATH);
    return true;
  } catch (error) {
    console.error('❌ Failed to write failure data:', error.message);
    return false;
  }
}

/**
 * Trigger alert systems sequentially
 */
async function triggerAlertSystems() {
  console.log('🚨 Activating Alert Systems...');
  console.log('');

  const alertSystems = [
    {
      name: 'AI Failure Analyzer',
      script: 'ai-failure-analyzer.js',
      icon: '🤖'
    },
    {
      name: 'Slack Alert System',
      script: 'slack-alert.js',
      icon: '💬'
    },
    {
      name: 'Mailgun Email System',
      script: 'mailgun-alert.js',
      icon: '📧'
    },
    {
      name: 'Telegram Alert System',
      script: 'telegram-alert.js',
      icon: '📱'
    }
  ];

  const results = [];

  for (const system of alertSystems) {
    console.log(`${system.icon} Triggering: ${system.name}`);
    
    try {
      const child = spawn('node', [system.script], {
        cwd: __dirname,
        stdio: 'pipe',
        env: { ...process.env, BASE_URL: 'http://localhost:5000' }
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const exitCode = await new Promise((resolve) => {
        child.on('close', resolve);
      });

      const result = {
        system: system.name,
        success: exitCode === 0,
        exitCode,
        output: output.trim(),
        error: errorOutput.trim()
      };

      results.push(result);

      if (result.success) {
        console.log(`✅ ${system.name} - Success`);
      } else {
        console.log(`⚠️ ${system.name} - Warning (exit code: ${exitCode})`);
      }

      // Show key output lines
      if (output.trim()) {
        const keyLines = output.split('\n').filter(line => 
          line.includes('✅') || line.includes('❌') || line.includes('⚠️') || 
          line.includes('Report saved') || line.includes('completed')
        );
        keyLines.slice(0, 2).forEach(line => console.log(`   ${line.trim()}`));
      }

      console.log('');
      
    } catch (error) {
      console.log(`❌ ${system.name} - Error: ${error.message}`);
      results.push({
        system: system.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Generate summary report
 */
function generateSummaryReport(scenario, alertResults) {
  const timestamp = new Date().toLocaleString();
  const successfulAlerts = alertResults.filter(r => r.success).length;
  const totalAlerts = alertResults.length;

  const summary = `
# Failure Simulation Report

**Generated:** ${timestamp}
**Scenario:** Gift Card Balance Check Failure

## Simulated Failure Details

- **Primary Endpoint:** \`GET /api/gift-cards/check-balance\`
- **Error Type:** 500 Internal Server Error (Square API Timeout)
- **Response Time:** 30,000ms
- **Additional Failures:** 2 secondary endpoints

## Alert System Performance

- **Total Alert Systems:** ${totalAlerts}
- **Successfully Triggered:** ${successfulAlerts}
- **Success Rate:** ${((successfulAlerts / totalAlerts) * 100).toFixed(1)}%

## Alert Results

${alertResults.map(result => `
### ${result.system}
- **Status:** ${result.success ? '✅ Success' : '⚠️ Warning'}
- **Exit Code:** ${result.exitCode || 'N/A'}
${result.error ? `- **Note:** ${result.error}` : ''}
`).join('')}

## Files Generated

- \`docs/reports/elite-summary.json\` - Complete failure data
- \`docs/failure-analysis-report.md\` - AI analysis (if OpenAI configured)
- Alert notifications sent to configured channels

## Next Steps

1. Review failure analysis report for root cause details
2. Check configured alert channels for notifications
3. Verify alert templates rendered correctly
4. Update alert thresholds if needed

---

*This simulation validates the complete Peter Digital Enterprise Alerting Infrastructure.*
`;

  try {
    fs.writeFileSync(path.join(__dirname, '../docs/simulation-report.md'), summary);
    console.log('📄 Simulation report saved: docs/simulation-report.md');
  } catch (error) {
    console.log('⚠️ Could not save simulation report:', error.message);
  }
}

/**
 * Main simulation execution
 */
async function runFailureSimulation() {
  console.log('🧪 Failure Simulation - Peter Digital Enterprise Security Platform');
  console.log('=========================================================================');
  console.log('');

  console.log('🎯 Generating realistic failure scenario...');
  const scenario = generateFailureScenario();
  
  console.log('💾 Writing failure data to reports...');
  const writeSuccess = writeFailureData(scenario);
  
  if (!writeSuccess) {
    console.error('❌ Failed to write failure data. Aborting simulation.');
    process.exit(1);
  }

  console.log('');
  console.log('🔥 Simulated Failure Summary:');
  console.log('============================');
  console.log(`Primary Failure: ${scenario.failures[0].name}`);
  console.log(`Error: ${scenario.failures[0].error}`);
  console.log(`Response Time: ${scenario.failures[0].responseTime}ms`);
  console.log(`Total Failed Tests: ${scenario.executionSummary.failCount}`);
  console.log(`Success Rate: ${scenario.executionSummary.successRate}%`);
  console.log('');

  const alertResults = await triggerAlertSystems();
  
  console.log('📊 Alert System Summary:');
  console.log('========================');
  alertResults.forEach(result => {
    console.log(`${result.success ? '✅' : '⚠️'} ${result.system}: ${result.success ? 'Success' : 'Warning'}`);
  });
  console.log('');

  generateSummaryReport(scenario, alertResults);
  
  console.log('✅ Failure simulation completed successfully!');
  console.log('');
  console.log('📄 Generated Files:');
  console.log('   • docs/reports/elite-summary.json (failure data)');
  console.log('   • docs/failure-analysis-report.md (AI analysis)');
  console.log('   • docs/simulation-report.md (this simulation)');
  console.log('');
  console.log('🔔 Check your configured alert channels for notifications:');
  console.log('   • Slack workspace');
  console.log('   • Email inbox');
  console.log('   • Telegram chat');
}

/**
 * Execute if run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runFailureSimulation().catch(error => {
    console.error('Fatal error during failure simulation:', error);
    process.exit(1);
  });
}

export { runFailureSimulation, generateFailureScenario, triggerAlertSystems };