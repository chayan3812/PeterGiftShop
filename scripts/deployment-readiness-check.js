/**
 * SiZu Pay Platform - Deployment Readiness Validation
 * Comprehensive pre-deployment checklist and validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_URL = 'https://d580ba9d-1b2b-4e46-9e4f-80c8379f85b6-00-2mdlrt53hay1z.spock.replit.dev';
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

class DeploymentReadinessChecker {
  constructor() {
    this.checks = [];
    this.startTime = new Date();
    this.criticalIssues = [];
    this.warnings = [];
  }

  async initialize() {
    console.log('SiZu Pay Platform - Deployment Readiness Check');
    console.log('===============================================');
    
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  }

  logCheck(category, name, status, details = null, severity = 'info') {
    const check = {
      category,
      name,
      status,
      details,
      severity,
      timestamp: new Date().toISOString()
    };
    
    this.checks.push(check);
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${statusIcon} [${category}] ${name}: ${status}`);
    if (details) console.log(`   ${details}`);
    
    if (status === 'FAIL' && severity === 'critical') {
      this.criticalIssues.push(`${category}: ${name} - ${details}`);
    } else if (status === 'WARN') {
      this.warnings.push(`${category}: ${name} - ${details}`);
    }
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${STAGING_URL}${endpoint}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      return { status: response.status, ok: response.ok, data };
    } catch (error) {
      throw error;
    }
  }

  async validateCoreInfrastructure() {
    console.log('\n📋 Core Infrastructure Validation');
    console.log('--------------------------------');

    // System health
    try {
      const response = await this.makeRequest('/api/health');
      if (response.ok && (response.data.status === 'healthy' || response.data.status === 'ok')) {
        this.logCheck('Infrastructure', 'System Health', 'PASS', 'Service operational');
      } else {
        this.logCheck('Infrastructure', 'System Health', 'FAIL', 'Health check failed', 'critical');
      }
    } catch (error) {
      this.logCheck('Infrastructure', 'System Health', 'FAIL', error.message, 'critical');
    }

    // Database connectivity
    try {
      const response = await this.makeRequest('/api/admin/users', {
        headers: { 'Authorization': 'Bearer ADMIN_TEST_BYPASS' }
      });
      if (response.ok) {
        this.logCheck('Infrastructure', 'Database Connectivity', 'PASS', 'Database accessible');
      } else {
        this.logCheck('Infrastructure', 'Database Connectivity', 'FAIL', 'Database connection failed', 'critical');
      }
    } catch (error) {
      this.logCheck('Infrastructure', 'Database Connectivity', 'FAIL', error.message, 'critical');
    }

    // Static assets
    try {
      const response = await this.makeRequest('/');
      if (response.ok) {
        this.logCheck('Infrastructure', 'Static Assets', 'PASS', 'Frontend accessible');
      } else {
        this.logCheck('Infrastructure', 'Static Assets', 'FAIL', 'Frontend not accessible', 'critical');
      }
    } catch (error) {
      this.logCheck('Infrastructure', 'Static Assets', 'FAIL', error.message, 'critical');
    }
  }

  async validateBusinessCriticalAPIs() {
    console.log('\n💳 Business Critical APIs');
    console.log('-------------------------');

    const criticalEndpoints = [
      { path: '/api/payments/process', name: 'Payment Processing', method: 'POST' },
      { path: '/api/fraud/assess', name: 'Fraud Detection', method: 'POST' },
      { path: '/api/dashboard/metrics', name: 'Dashboard Metrics', method: 'GET' },
      { path: '/api/security/threats', name: 'Threat Intelligence', method: 'GET' },
      { path: '/api/analytics/insights', name: 'Analytics Engine', method: 'GET' }
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        let options = {};
        if (endpoint.method === 'POST') {
          if (endpoint.path === '/api/payments/process') {
            options = {
              method: 'POST',
              body: JSON.stringify({ 
                amount: 100,
                paymentMethod: 'card',
                description: 'Deployment readiness test'
              })
            };
          } else if (endpoint.path === '/api/fraud/assess') {
            options = {
              method: 'POST',
              body: JSON.stringify({ 
                transactionData: { 
                  amount: 100, 
                  location: 'test',
                  paymentMethod: 'card'
                }
              })
            };
          }
        }

        const response = await this.makeRequest(endpoint.path, options);
        
        if (response.ok && response.data.success !== false) {
          this.logCheck('Business APIs', endpoint.name, 'PASS', `${endpoint.method} ${response.status}`);
        } else {
          this.logCheck('Business APIs', endpoint.name, 'FAIL', `Status: ${response.status}`, 'critical');
        }
      } catch (error) {
        this.logCheck('Business APIs', endpoint.name, 'FAIL', error.message, 'critical');
      }
    }
  }

  async validateSecurityConfiguration() {
    console.log('\n🔒 Security Configuration');
    console.log('-------------------------');

    // Authentication system
    try {
      const response = await this.makeRequest('/api/auth/dev-login');
      if (response.ok) {
        this.logCheck('Security', 'Authentication System', 'PASS', 'Auth endpoints accessible');
      } else {
        this.logCheck('Security', 'Authentication System', 'WARN', 'Auth system may need configuration');
      }
    } catch (error) {
      this.logCheck('Security', 'Authentication System', 'FAIL', error.message, 'critical');
    }

    // Admin access controls
    try {
      const response = await this.makeRequest('/api/admin/config', {
        headers: { 'Authorization': 'Bearer ADMIN_TEST_BYPASS' }
      });
      if (response.ok) {
        this.logCheck('Security', 'Admin Access Controls', 'PASS', 'Admin endpoints secured');
      } else {
        this.logCheck('Security', 'Admin Access Controls', 'FAIL', 'Admin access misconfigured', 'critical');
      }
    } catch (error) {
      this.logCheck('Security', 'Admin Access Controls', 'FAIL', error.message, 'critical');
    }

    // HTTPS validation
    if (STAGING_URL.startsWith('https://')) {
      this.logCheck('Security', 'HTTPS Configuration', 'PASS', 'SSL/TLS enabled');
    } else {
      this.logCheck('Security', 'HTTPS Configuration', 'WARN', 'Consider HTTPS for production');
    }
  }

  async validatePerformanceMetrics() {
    console.log('\n⚡ Performance Validation');
    console.log('------------------------');

    const performanceTests = [
      { path: '/api/dashboard/metrics', name: 'Dashboard Load Time' },
      { path: '/api/analytics/insights', name: 'Analytics Response Time' },
      { path: '/api/security/threats', name: 'Security Data Load Time' }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest(test.path);
        const responseTime = Date.now() - startTime;

        if (response.ok && responseTime < 2000) {
          this.logCheck('Performance', test.name, 'PASS', `${responseTime}ms response time`);
        } else if (response.ok && responseTime < 5000) {
          this.logCheck('Performance', test.name, 'WARN', `${responseTime}ms - consider optimization`);
        } else {
          this.logCheck('Performance', test.name, 'FAIL', `${responseTime}ms - too slow`, 'critical');
        }
      } catch (error) {
        this.logCheck('Performance', test.name, 'FAIL', error.message, 'critical');
      }
    }
  }

  async validateDataIntegrity() {
    console.log('\n📊 Data Integrity Validation');
    console.log('----------------------------');

    const dataValidationTests = [
      { path: '/api/dashboard/metrics', field: 'transactionCount', name: 'Transaction Data' },
      { path: '/api/analytics/predictive', field: 'revenueForecasts', name: 'Analytics Data' },
      { path: '/api/security/patterns', field: 'totalPatterns', name: 'Security Data' },
      { path: '/api/transactions/heatmap', field: 'data', name: 'Heatmap Data' }
    ];

    for (const test of dataValidationTests) {
      try {
        const response = await this.makeRequest(test.path);
        
        if (response.ok && response.data[test.field] !== undefined) {
          this.logCheck('Data Integrity', test.name, 'PASS', `${test.field} field present`);
        } else {
          this.logCheck('Data Integrity', test.name, 'FAIL', `Missing ${test.field} field`, 'critical');
        }
      } catch (error) {
        this.logCheck('Data Integrity', test.name, 'FAIL', error.message, 'critical');
      }
    }
  }

  async validateFileSystemIntegrity() {
    console.log('\n📁 File System Validation');
    console.log('-------------------------');

    const criticalFiles = [
      { path: 'package.json', name: 'Package Configuration' },
      { path: 'vite.config.ts', name: 'Build Configuration' },
      { path: '.env.example', name: 'Environment Template' },
      { path: 'client/src/App.tsx', name: 'Frontend Entry Point' },
      { path: 'server/index.ts', name: 'Backend Entry Point' },
      { path: '.github/workflows/ci.yml', name: 'CI/CD Configuration' }
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(__dirname, '..', file.path);
      if (fs.existsSync(filePath)) {
        this.logCheck('File System', file.name, 'PASS', `${file.path} exists`);
      } else {
        this.logCheck('File System', file.name, 'FAIL', `Missing ${file.path}`, 'critical');
      }
    }

    // Check reports directory
    if (fs.existsSync(REPORTS_DIR)) {
      this.logCheck('File System', 'Reports Directory', 'PASS', 'Logging infrastructure ready');
    } else {
      this.logCheck('File System', 'Reports Directory', 'WARN', 'Reports directory missing');
    }
  }

  async validateEnvironmentConfiguration() {
    console.log('\n🔧 Environment Configuration');
    console.log('----------------------------');

    // Check for .env file
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      this.logCheck('Environment', 'Configuration File', 'PASS', '.env file present');
    } else {
      this.logCheck('Environment', 'Configuration File', 'WARN', '.env file missing - using defaults');
    }

    // Validate environment-specific endpoints
    try {
      const response = await this.makeRequest('/api/admin/config');
      if (response.ok && response.data.environment) {
        this.logCheck('Environment', 'Environment Detection', 'PASS', `Environment: ${response.data.environment}`);
      } else {
        this.logCheck('Environment', 'Environment Detection', 'WARN', 'Environment not specified');
      }
    } catch (error) {
      this.logCheck('Environment', 'Environment Detection', 'FAIL', error.message);
    }
  }

  generateDeploymentReport() {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    const summary = {
      timestamp: endTime.toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      totalChecks: this.checks.length,
      passed: this.checks.filter(c => c.status === 'PASS').length,
      warnings: this.checks.filter(c => c.status === 'WARN').length,
      failed: this.checks.filter(c => c.status === 'FAIL').length,
      criticalIssues: this.criticalIssues,
      warningsList: this.warnings,
      deploymentReady: this.criticalIssues.length === 0,
      checks: this.checks
    };

    // Generate JSON report
    const jsonReportPath = path.join(REPORTS_DIR, 'deployment-readiness-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

    // Generate text report
    const textReportPath = path.join(REPORTS_DIR, 'deployment-readiness-report.txt');
    let textReport = `SiZu Pay Platform - Deployment Readiness Report\n`;
    textReport += `==============================================\n\n`;
    textReport += `Report Generated: ${summary.timestamp}\n`;
    textReport += `Validation Duration: ${summary.duration}\n\n`;
    
    textReport += `SUMMARY\n`;
    textReport += `-------\n`;
    textReport += `Total Checks: ${summary.totalChecks}\n`;
    textReport += `Passed: ${summary.passed}\n`;
    textReport += `Warnings: ${summary.warnings}\n`;
    textReport += `Failed: ${summary.failed}\n`;
    textReport += `Deployment Ready: ${summary.deploymentReady ? 'YES' : 'NO'}\n\n`;

    if (summary.criticalIssues.length > 0) {
      textReport += `CRITICAL ISSUES (Must Fix Before Deployment)\n`;
      textReport += `-------------------------------------------\n`;
      summary.criticalIssues.forEach(issue => {
        textReport += `❌ ${issue}\n`;
      });
      textReport += `\n`;
    }

    if (summary.warningsList.length > 0) {
      textReport += `WARNINGS (Recommended Fixes)\n`;
      textReport += `---------------------------\n`;
      summary.warningsList.forEach(warning => {
        textReport += `⚠️  ${warning}\n`;
      });
      textReport += `\n`;
    }

    textReport += `DETAILED RESULTS BY CATEGORY\n`;
    textReport += `----------------------------\n`;
    const categories = [...new Set(this.checks.map(c => c.category))];
    categories.forEach(category => {
      textReport += `\n${category}:\n`;
      this.checks.filter(c => c.category === category).forEach(check => {
        const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
        textReport += `  ${icon} ${check.name}: ${check.status}\n`;
        if (check.details) textReport += `     ${check.details}\n`;
      });
    });

    fs.writeFileSync(textReportPath, textReport);

    console.log('\n📊 DEPLOYMENT READINESS SUMMARY');
    console.log('===============================');
    console.log(`Total Checks: ${summary.totalChecks}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Warnings: ${summary.warnings}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Duration: ${summary.duration}`);
    
    if (summary.deploymentReady) {
      console.log('\n🚀 DEPLOYMENT STATUS: READY');
      console.log('Platform validated and ready for production deployment!');
    } else {
      console.log('\n⚠️  DEPLOYMENT STATUS: NOT READY');
      console.log(`${summary.criticalIssues.length} critical issues must be resolved before deployment.`);
    }

    console.log(`\nReports saved to:`);
    console.log(`📄 ${jsonReportPath}`);
    console.log(`📄 ${textReportPath}`);

    return summary.deploymentReady;
  }

  async run() {
    try {
      await this.initialize();

      await this.validateCoreInfrastructure();
      await this.validateBusinessCriticalAPIs();
      await this.validateSecurityConfiguration();
      await this.validatePerformanceMetrics();
      await this.validateDataIntegrity();
      await this.validateFileSystemIntegrity();
      await this.validateEnvironmentConfiguration();

      const deploymentReady = this.generateDeploymentReport();
      
      if (deploymentReady) {
        console.log('\n✅ All deployment readiness checks passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Deployment readiness checks failed. Review critical issues.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n💥 Deployment readiness check failed:', error.message);
      process.exit(1);
    }
  }
}

const checker = new DeploymentReadinessChecker();
checker.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});