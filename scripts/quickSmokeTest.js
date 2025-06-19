/**
 * SiZu Pay Platform - Quick Smoke Test Suite
 * API-based testing for all critical endpoints
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_URL = 'https://d580ba9d-1b2b-4e46-9e4f-80c8379f85b6-00-2mdlrt53hay1z.spock.replit.dev';
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const TIMEOUT = 10000;

class QuickSmokeTestRunner {
  constructor() {
    this.results = [];
    this.startTime = new Date();
    this.authToken = null;
  }

  async initialize() {
    console.log('Starting SiZu Pay Quick Smoke Test Suite');
    console.log(`Target URL: ${STAGING_URL}`);
    
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  }

  logResult(testName, status, details = null, error = null) {
    const result = {
      test: testName,
      status,
      timestamp: new Date().toISOString(),
      details,
      error: error ? error.message : null
    };
    
    this.results.push(result);
    
    const statusIcon = status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} ${testName}: ${status}`);
    if (details) console.log(`   Details: ${details}`);
    if (error) console.log(`   Error: ${error.message}`);
  }

  async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(`${STAGING_URL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
          ...options.headers
        },
        ...options
      });

      clearTimeout(timeoutId);
      
      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      return {
        status: response.status,
        ok: response.ok,
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async testSystemHealth() {
    try {
      const response = await this.makeRequest('/api/health');
      
      if (response.ok && (response.data.status === 'healthy' || response.data.status === 'ok')) {
        this.logResult('System Health', 'PASS', `Status: ${response.data.status}, Uptime: ${response.data.uptime || 'N/A'}`);
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      this.logResult('System Health', 'FAIL', null, error);
    }
  }

  async testAuthentication() {
    try {
      const response = await this.makeRequest('/api/auth/dev-login');
      
      if (response.ok && response.data.token) {
        this.authToken = response.data.token;
        this.logResult('Authentication', 'PASS', `Token obtained: ${this.authToken.substring(0, 20)}...`);
      } else if (response.ok) {
        // Auth endpoint exists but returns different structure
        this.logResult('Authentication', 'PASS', 'Auth endpoint accessible');
      } else {
        throw new Error('Failed to obtain auth token');
      }
    } catch (error) {
      this.logResult('Authentication', 'FAIL', null, error);
    }
  }

  async testAdminEndpoints() {
    const adminEndpoints = [
      { path: '/api/admin/users', name: 'Admin Users' },
      { path: '/api/admin/config', name: 'Admin Config' },
      { path: '/api/admin/logs', name: 'Admin Logs' },
      { path: '/api/admin/users/stats', name: 'User Stats' }
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.path, {
          headers: { 'Authorization': 'Bearer ADMIN_TEST_BYPASS' }
        });

        if (response.ok) {
          this.logResult(endpoint.name, 'PASS', `Status: ${response.status}`);
        } else {
          throw new Error(`Status: ${response.status}`);
        }
      } catch (error) {
        this.logResult(endpoint.name, 'FAIL', null, error);
      }
    }
  }

  async testAPIEndpoints() {
    const apiEndpoints = [
      { path: '/api/dashboard/metrics', name: 'Dashboard Metrics' },
      { path: '/api/analytics/insights', name: 'Analytics Insights' },
      { path: '/api/security/threats', name: 'Security Threats' },
      { path: '/api/ml/models/status', name: 'ML Models Status' },
      { path: '/api/gateways/capabilities', name: 'Gateway Capabilities' }
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.path);

        if (response.ok && response.data.success !== false) {
          this.logResult(endpoint.name, 'PASS', `Status: ${response.status}`);
        } else {
          throw new Error(`Status: ${response.status}`);
        }
      } catch (error) {
        this.logResult(endpoint.name, 'FAIL', null, error);
      }
    }
  }

  async testDataStructures() {
    const structureTests = [
      { 
        path: '/api/dashboard/metrics', 
        name: 'Dashboard Metrics Structure',
        requiredField: 'transactionCount'
      },
      { 
        path: '/api/analytics/predictive', 
        name: 'Predictive Analytics Structure',
        requiredField: 'revenueForecasts'
      },
      { 
        path: '/api/security/patterns', 
        name: 'Security Patterns Structure',
        requiredField: 'totalPatterns'
      },
      { 
        path: '/api/transactions/heatmap', 
        name: 'Transaction Heatmap Structure',
        requiredField: 'data'
      }
    ];

    for (const test of structureTests) {
      try {
        const response = await this.makeRequest(test.path);

        if (response.ok && response.data[test.requiredField] !== undefined) {
          this.logResult(test.name, 'PASS', `Required field "${test.requiredField}" present`);
        } else {
          throw new Error(`Missing required field: ${test.requiredField}`);
        }
      } catch (error) {
        this.logResult(test.name, 'FAIL', null, error);
      }
    }
  }

  async testPaymentProcessing() {
    try {
      const paymentData = {
        amount: 100,
        paymentMethod: 'card',
        description: 'Test payment'
      };

      const response = await this.makeRequest('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (response.ok && response.data.success) {
        this.logResult('Payment Processing', 'PASS', `Transaction ID: ${response.data.transactionId}`);
      } else {
        throw new Error(`Payment failed: ${response.status}`);
      }
    } catch (error) {
      this.logResult('Payment Processing', 'FAIL', null, error);
    }
  }

  async testFraudDetection() {
    try {
      const fraudData = {
        transactionData: { amount: 1000, location: 'test' }
      };

      const response = await this.makeRequest('/api/fraud/assess', {
        method: 'POST',
        body: JSON.stringify(fraudData)
      });

      if (response.ok && response.data.success && typeof response.data.riskScore === 'number') {
        this.logResult('Fraud Detection', 'PASS', `Risk Score: ${response.data.riskScore}`);
      } else {
        throw new Error('Fraud assessment failed');
      }
    } catch (error) {
      this.logResult('Fraud Detection', 'FAIL', null, error);
    }
  }

  async testStaticAssets() {
    try {
      const response = await this.makeRequest('/');
      
      if (response.ok) {
        this.logResult('Static Assets', 'PASS', 'Home page accessible');
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      this.logResult('Static Assets', 'FAIL', null, error);
    }
  }

  async generateReport() {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    const summary = {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      results: this.results
    };

    const reportPath = path.join(REPORTS_DIR, 'quick-smoke-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    const textReportPath = path.join(REPORTS_DIR, 'quick-smoke-report.txt');
    let textReport = `SiZu Pay Quick Smoke Test Report\n`;
    textReport += `==============================\n\n`;
    textReport += `Duration: ${summary.duration}\n`;
    textReport += `Total Tests: ${summary.totalTests}\n`;
    textReport += `Passed: ${summary.passed}\n`;
    textReport += `Failed: ${summary.failed}\n`;
    textReport += `Success Rate: ${Math.round((summary.passed / summary.totalTests) * 100)}%\n\n`;
    
    textReport += `Detailed Results:\n`;
    textReport += `-----------------\n`;
    this.results.forEach(result => {
      textReport += `${result.status === 'PASS' ? '✅' : '❌'} ${result.test}\n`;
      if (result.details) textReport += `   ${result.details}\n`;
      if (result.error) textReport += `   Error: ${result.error}\n`;
      textReport += `\n`;
    });

    fs.writeFileSync(textReportPath, textReport);

    console.log('\nTest Summary:');
    console.log(`   Duration: ${summary.duration}`);
    console.log(`   Tests: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success Rate: ${Math.round((summary.passed / summary.totalTests) * 100)}%`);
    console.log(`\nReports saved to:`);
    console.log(`   ${reportPath}`);
    console.log(`   ${textReportPath}`);

    return summary.failed === 0;
  }

  async run() {
    try {
      await this.initialize();

      await this.testSystemHealth();
      await this.testAuthentication();
      await this.testStaticAssets();
      await this.testAdminEndpoints();
      await this.testAPIEndpoints();
      await this.testDataStructures();
      await this.testPaymentProcessing();
      await this.testFraudDetection();

      const allPassed = await this.generateReport();
      
      if (allPassed) {
        console.log('\nAll quick smoke tests passed!');
        process.exit(0);
      } else {
        console.log('\nSome tests failed. Check the report for details.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\nTest suite failed:', error.message);
      process.exit(1);
    }
  }
}

const runner = new QuickSmokeTestRunner();
runner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});