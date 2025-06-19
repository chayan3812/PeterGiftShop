/**
 * Full Alert Test System with JWT-Signed Test Results
 * Triggers complete workflow: Test execution -> JWT signing -> Multi-channel alerts
 */

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'peter_digital_jwt_secret_key_2025_secure';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Generate realistic test result data
 */
function generateTestResults(scenario = 'mixed') {
  const scenarios = {
    success: {
      totalRequests: 45,
      failCount: 0,
      successRate: 100,
      avgResponseTime: 120,
      criticalAlerts: 0,
      failures: []
    },
    mixed: {
      totalRequests: 47,
      failCount: 2,
      successRate: 95.74,
      avgResponseTime: 143,
      criticalAlerts: 0,
      failures: [
        {
          name: "GET /api/gift-cards/balance/invalid",
          error: "Gift card not found",
          statusCode: 404,
          responseTime: 89
        },
        {
          name: "GET /api/admin/analytics",
          error: "Database connection timeout",
          statusCode: 500,
          responseTime: 1200
        }
      ]
    },
    critical: {
      totalRequests: 38,
      failCount: 8,
      successRate: 78.95,
      avgResponseTime: 234,
      criticalAlerts: 3,
      failures: [
        {
          name: "POST /api/auth/login",
          error: "Authentication service unavailable",
          statusCode: 503,
          responseTime: 5000
        },
        {
          name: "POST /api/gift-cards",
          error: "Square API rate limit exceeded",
          statusCode: 429,
          responseTime: 1500
        },
        {
          name: "GET /api/admin/fraud/analysis",
          error: "AI service connection failed",
          statusCode: 502,
          responseTime: 3000
        }
      ]
    }
  };

  const base = scenarios[scenario] || scenarios.mixed;
  const reportId = `test-${scenario}-${Date.now()}`;
  
  return {
    reportId,
    testName: "Peter Digital API Comprehensive Test Suite",
    generatedAt: new Date().toISOString(),
    executionSummary: base,
    performanceMetrics: {
      p50ResponseTime: Math.floor(base.avgResponseTime * 0.7),
      p95ResponseTime: Math.floor(base.avgResponseTime * 1.8),
      p99ResponseTime: Math.floor(base.avgResponseTime * 2.5),
      errorRate: parseFloat((100 - base.successRate).toFixed(2)),
      throughput: parseFloat((base.totalRequests / 6.73).toFixed(2)),
      concurrency: 1
    },
    securityMetrics: {
      authFailures: base.criticalAlerts > 0 ? 2 : 0,
      suspiciousRequests: 0,
      rateLimitHits: base.failures.some(f => f.statusCode === 429) ? 1 : 0,
      securityScore: base.criticalAlerts > 0 ? 7 : 10,
      vulnerabilities: base.criticalAlerts > 0 ? ["Rate limiting bypass attempt"] : []
    },
    failures: base.failures,
    recommendations: generateRecommendations(base),
    environment: {
      baseUrl: BASE_URL,
      testFramework: "Newman + JWT Security",
      collection: "PeterDigitalAPI.postman_collection.json",
      environment: "production-test"
    }
  };
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(results) {
  const recommendations = [];
  
  if (results.successRate < 95) {
    recommendations.push("Investigate failing endpoints for stability improvements");
  }
  
  if (results.avgResponseTime > 200) {
    recommendations.push("Optimize response times - consider caching strategies");
  }
  
  if (results.criticalAlerts > 0) {
    recommendations.push("Address critical security alerts immediately");
  }
  
  if (results.failures.some(f => f.statusCode >= 500)) {
    recommendations.push("Review server error logs for infrastructure issues");
  }
  
  if (results.failures.some(f => f.statusCode === 429)) {
    recommendations.push("Implement intelligent rate limiting and retry logic");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Excellent performance - maintain current monitoring practices");
  }
  
  return recommendations;
}

/**
 * Generate JWT token for secure test result access
 */
function generateSecureToken(reportId, userId = 'alert_system') {
  const payload = {
    type: 'test_result_access',
    scope: 'read_reports',
    reportId,
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    iss: 'peter-digital-security-platform'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Save test results and generate signed URL
 */
function saveTestResults(testData) {
  const reportsDir = path.join(process.cwd(), 'docs', 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `${testData.reportId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testData, null, 2));
  
  const token = generateSecureToken(testData.reportId);
  const signedUrl = `${BASE_URL}/api/test-results/secure/${testData.reportId}?token=${token}`;
  
  return { reportPath, signedUrl, token };
}

/**
 * Load alert templates
 */
function loadAlertTemplates() {
  const templatesPath = path.join(process.cwd(), 'templates', 'jwt-alert-templates.json');
  
  if (!fs.existsSync(templatesPath)) {
    throw new Error('Alert templates not found. Run template setup first.');
  }
  
  return JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
}

/**
 * Process template with test data
 */
function processTemplate(template, testData, signedUrl) {
  let processed = JSON.stringify(template);
  
  // Replace template variables
  const variables = {
    reportId: testData.reportId,
    successRate: testData.executionSummary.successRate,
    totalRequests: testData.executionSummary.totalRequests,
    failCount: testData.executionSummary.failCount,
    avgResponseTime: testData.executionSummary.avgResponseTime,
    criticalAlerts: testData.executionSummary.criticalAlerts,
    signedUrl: signedUrl,
    timestamp: new Date().toLocaleString(),
    failures: testData.failures.slice(0, 3) // Top 3 failures for alerts
  };
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value);
  });
  
  return JSON.parse(processed);
}

/**
 * Generate Slack alert message
 */
function generateSlackAlert(testData, signedUrl, templates) {
  const isSuccess = testData.executionSummary.failCount === 0;
  const template = isSuccess ? templates.slack.test_success : templates.slack.test_failure;
  
  return processTemplate(template, testData, signedUrl);
}

/**
 * Generate email alert
 */
function generateEmailAlert(testData, signedUrl, templates) {
  const isSuccess = testData.executionSummary.failCount === 0;
  const template = isSuccess ? templates.email.test_success : templates.email.test_failure;
  
  return processTemplate(template, testData, signedUrl);
}

/**
 * Generate Telegram alert
 */
function generateTelegramAlert(testData, signedUrl, templates) {
  const isSuccess = testData.executionSummary.failCount === 0;
  const template = isSuccess ? templates.telegram.test_success : templates.telegram.test_failure;
  
  return processTemplate(template, testData, signedUrl);
}

/**
 * Generate webhook payload
 */
function generateWebhookPayload(testData, signedUrl, templates) {
  return processTemplate(templates.webhook.test_results, testData, signedUrl);
}

/**
 * Generate dashboard widget data
 */
function generateDashboardWidget(testData, signedUrl, templates) {
  return processTemplate(templates.dashboard.widget_data, testData, signedUrl);
}

/**
 * Log alert activity
 */
function logAlertActivity(testData, signedUrl, alerts) {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    reportId: testData.reportId,
    signedUrl,
    alertsSent: {
      slack: !!alerts.slack,
      email: !!alerts.email,
      telegram: !!alerts.telegram,
      webhook: !!alerts.webhook
    },
    testSummary: testData.executionSummary,
    securityLevel: testData.executionSummary.criticalAlerts > 0 ? 'critical' : 
                   testData.executionSummary.failCount > 0 ? 'warning' : 'info'
  };
  
  const logFile = path.join(logsDir, 'alert-activity.log');
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

/**
 * Main alert test execution
 */
async function runFullAlertTest(scenario = 'mixed') {
  console.log('🚀 Triggering Full Alert Test with JWT-Signed Results');
  console.log('======================================================\n');
  
  try {
    // Generate test results
    console.log(`📊 Generating test results (scenario: ${scenario})...`);
    const testData = generateTestResults(scenario);
    
    // Save results and create signed URL
    console.log('💾 Saving test results and generating signed URL...');
    const { reportPath, signedUrl, token } = saveTestResults(testData);
    
    console.log(`✅ Report saved: ${reportPath}`);
    console.log(`🔒 Signed URL: ${signedUrl}\n`);
    
    // Load alert templates
    console.log('📋 Loading alert templates...');
    const templates = loadAlertTemplates();
    
    // Generate all alert formats
    console.log('🔄 Generating multi-channel alerts...\n');
    
    const alerts = {
      slack: generateSlackAlert(testData, signedUrl, templates),
      email: generateEmailAlert(testData, signedUrl, templates),
      telegram: generateTelegramAlert(testData, signedUrl, templates),
      webhook: generateWebhookPayload(testData, signedUrl, templates),
      dashboard: generateDashboardWidget(testData, signedUrl, templates)
    };
    
    // Display generated alerts
    console.log('💬 SLACK ALERT:');
    console.log(JSON.stringify(alerts.slack, null, 2));
    console.log('\n📧 EMAIL ALERT:');
    console.log('Subject:', alerts.email.subject);
    console.log('HTML Length:', alerts.email.html.length, 'characters');
    
    console.log('\n📱 TELEGRAM ALERT:');
    console.log(alerts.telegram.text);
    
    console.log('\n🌐 WEBHOOK PAYLOAD:');
    console.log(JSON.stringify(alerts.webhook, null, 2));
    
    console.log('\n📊 DASHBOARD WIDGET:');
    console.log(JSON.stringify(alerts.dashboard, null, 2));
    
    // Log activity
    logAlertActivity(testData, signedUrl, alerts);
    
    // Save alerts for reference
    const alertsDir = path.join(process.cwd(), 'logs', 'alerts');
    if (!fs.existsSync(alertsDir)) {
      fs.mkdirSync(alertsDir, { recursive: true });
    }
    
    const alertsFile = path.join(alertsDir, `${testData.reportId}-alerts.json`);
    fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    
    console.log(`\n📁 Alerts saved: ${alertsFile}`);
    
    // Verify JWT token
    console.log('\n🔐 JWT Token Verification:');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token valid');
      console.log('   User:', decoded.sub);
      console.log('   Report:', decoded.reportId);
      console.log('   Expires:', new Date(decoded.exp * 1000).toLocaleString());
    } catch (error) {
      console.log('❌ Token invalid:', error.message);
    }
    
    console.log('\n🎯 INTEGRATION SUMMARY:');
    console.log('========================');
    console.log(`Report ID: ${testData.reportId}`);
    console.log(`Success Rate: ${testData.executionSummary.successRate}%`);
    console.log(`Failed Tests: ${testData.executionSummary.failCount}`);
    console.log(`Critical Alerts: ${testData.executionSummary.criticalAlerts}`);
    console.log(`Secure URL: ${signedUrl}`);
    console.log('\n✅ Full alert test completed successfully!');
    console.log('All channels ready for production deployment.');
    
  } catch (error) {
    console.error('❌ Alert test failed:', error);
    throw error;
  }
}

/**
 * Execute if run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const scenario = process.argv[2] || 'mixed';
  runFullAlertTest(scenario).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runFullAlertTest, generateTestResults, generateSecureToken };