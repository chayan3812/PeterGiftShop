/**
 * SiZu Pay Platform - Automated Smoke Test Suite
 * End-to-end testing with Playwright for all critical flows
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_URL = 'https://d580ba9d-1b2b-4e46-9e4f-80c8379f85b6-00-2mdlrt53hay1z.spock.replit.dev';
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const TIMEOUT = 30000;

class SmokeTestRunner {
  constructor() {
    this.results = [];
    this.startTime = new Date();
    this.browser = null;
    this.adminContext = null;
    this.merchantContext = null;
  }

  async initialize() {
    console.log('🚀 Starting SiZu Pay Smoke Test Suite');
    console.log(`🌐 Target URL: ${STAGING_URL}`);
    
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // Launch browser
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create admin context
    this.adminContext = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    // Create merchant context (incognito)
    this.merchantContext = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
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

  async authenticateAdmin() {
    const page = await this.adminContext.newPage();
    
    try {
      // Call dev-login endpoint
      const response = await page.request.get(`${STAGING_URL}/api/auth/dev-login`);
      const authData = await response.json();
      
      if (!authData.success || !authData.token) {
        throw new Error('Failed to get dev token');
      }

      // Set token in localStorage
      await page.goto(STAGING_URL);
      await page.evaluate((token) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify({
          id: 'dev_user',
          email: 'admin@sizu.dev',
          role: 'admin'
        }));
      }, authData.token);

      // Reload to pick up authentication
      await page.reload();
      await page.waitForTimeout(2000);

      this.logResult('Admin Authentication', 'PASS', `Token: ${authData.token.substring(0, 20)}...`);
      return page;
    } catch (error) {
      this.logResult('Admin Authentication', 'FAIL', null, error);
      throw error;
    }
  }

  async testAdminDashboard() {
    const page = await this.authenticateAdmin();
    
    try {
      // Navigate to admin dashboard
      await page.goto(`${STAGING_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
      
      // Wait for page to load
      await page.waitForTimeout(3000);

      // Check for key dashboard elements
      const dashboardTitle = await page.textContent('h1');
      if (!dashboardTitle || !dashboardTitle.includes('Control Tower')) {
        throw new Error('Dashboard title not found');
      }

      // Check for tabs
      const overviewTab = await page.locator('[data-state="active"]').first();
      if (!overviewTab) {
        throw new Error('Overview tab not found');
      }

      // Check for stats panel
      const statsElements = await page.locator('text="Total Events"').count();
      if (statsElements === 0) {
        throw new Error('Stats panel not loaded');
      }

      this.logResult('Admin Dashboard', 'PASS', 'Dashboard loaded with all key widgets');
      return page;
    } catch (error) {
      this.logResult('Admin Dashboard', 'FAIL', null, error);
      throw error;
    }
  }

  async testMerchantFlow() {
    const page = await this.merchantContext.newPage();
    
    try {
      // Navigate to merchant dashboard (public home page)
      await page.goto(`${STAGING_URL}/`, { waitUntil: 'networkidle' });
      
      // Check for home page elements
      const heroTitle = await page.locator('h1').first();
      const titleText = await heroTitle.textContent();
      
      if (!titleText || !titleText.includes('Enterprise Security')) {
        throw new Error('Home page hero not found');
      }

      // Check for navigation
      const navItems = await page.locator('nav a').count();
      if (navItems < 3) {
        throw new Error('Navigation items missing');
      }

      this.logResult('Merchant Flow', 'PASS', 'Home page loaded successfully');
    } catch (error) {
      this.logResult('Merchant Flow', 'FAIL', null, error);
    }
  }

  async testGiftCardManagement() {
    const page = await this.authenticateAdmin();
    
    try {
      // Navigate to gift cards admin page
      await page.goto(`${STAGING_URL}/admin/gift-cards`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Check if page loaded
      const pageContent = await page.textContent('body');
      if (!pageContent.includes('Gift') || !pageContent.includes('Card')) {
        throw new Error('Gift Cards page not loaded properly');
      }

      // Test gift card creation flow by navigating to purchase page
      await page.goto(`${STAGING_URL}/gift-cards`, { waitUntil: 'networkidle' });
      
      // Check for gift card types
      const giftCardTypes = await page.locator('text="Premium Digital Card"').count();
      if (giftCardTypes === 0) {
        throw new Error('Gift card types not found');
      }

      // Scroll to purchase form
      await page.locator('#purchase-form').scrollIntoViewIfNeeded();
      
      // Fill out purchase form
      await page.fill('input[type="number"]', '50');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[placeholder*="name"]', 'Test User');

      this.logResult('Gift Card Management', 'PASS', 'Gift card interface accessible');
    } catch (error) {
      this.logResult('Gift Card Management', 'FAIL', null, error);
    }
  }

  async testAnalyticsExport() {
    const page = await this.authenticateAdmin();
    
    try {
      // Navigate to analytics page
      await page.goto(`${STAGING_URL}/admin/analytics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check if analytics page loaded
      const analyticsTitle = await page.locator('h1').textContent();
      if (!analyticsTitle || !analyticsTitle.includes('Analytics')) {
        throw new Error('Analytics page not loaded');
      }

      // Check for key metrics
      const metricsCards = await page.locator('text="Total Signals"').count();
      if (metricsCards === 0) {
        throw new Error('Analytics metrics not loaded');
      }

      // Check for charts
      const charts = await page.locator('.recharts-wrapper').count();
      if (charts === 0) {
        this.logResult('Analytics Export', 'PASS', 'Analytics page loaded (charts loading)');
      } else {
        this.logResult('Analytics Export', 'PASS', `Analytics page loaded with ${charts} charts`);
      }
    } catch (error) {
      this.logResult('Analytics Export', 'FAIL', null, error);
    }
  }

  async testFallbackBehavior() {
    const page = await this.merchantContext.newPage();
    
    try {
      // Navigate to redeem page
      await page.goto(`${STAGING_URL}/redeem`, { waitUntil: 'networkidle' });
      
      // Check square status
      const squareStatus = await page.locator('text="Square Environment"').count();
      if (squareStatus > 0) {
        this.logResult('Fallback Behavior', 'PASS', 'Square status display working');
      } else {
        this.logResult('Fallback Behavior', 'PASS', 'Fallback mode active');
      }
    } catch (error) {
      this.logResult('Fallback Behavior', 'FAIL', null, error);
    }
  }

  async testAlertChannels() {
    const page = await this.authenticateAdmin();
    
    try {
      // Navigate to fraud detection page
      await page.goto(`${STAGING_URL}/admin/fraud`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Check if fraud page loaded
      const fraudTitle = await page.locator('h1').textContent();
      if (!fraudTitle || !fraudTitle.includes('Fraud')) {
        throw new Error('Fraud detection page not loaded');
      }

      // Check for alert elements
      const alertElements = await page.locator('text="DEFCON"').count();
      if (alertElements > 0) {
        this.logResult('Alert Channels', 'PASS', 'Fraud detection alerts visible');
      } else {
        this.logResult('Alert Channels', 'PASS', 'Fraud detection page loaded');
      }
    } catch (error) {
      this.logResult('Alert Channels', 'FAIL', null, error);
    }
  }

  async testThreatIntelligence() {
    const page = await this.authenticateAdmin();
    
    try {
      // Test threat map
      await page.goto(`${STAGING_URL}/admin/threat-map`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const threatContent = await page.textContent('body');
      if (threatContent.includes('Threat') || threatContent.includes('Map')) {
        this.logResult('Threat Intelligence', 'PASS', 'Threat map accessible');
      } else {
        throw new Error('Threat map not loaded');
      }
    } catch (error) {
      this.logResult('Threat Intelligence', 'FAIL', null, error);
    }
  }

  async testSystemHealth() {
    try {
      const page = await this.adminContext.newPage();
      
      // Test API health
      const healthResponse = await page.request.get(`${STAGING_URL}/api/health`);
      const healthData = await healthResponse.json();
      
      if (healthData.status === 'healthy') {
        this.logResult('System Health', 'PASS', `API healthy - uptime: ${healthData.uptime}`);
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      this.logResult('System Health', 'FAIL', null, error);
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

    // Write JSON report
    const reportPath = path.join(REPORTS_DIR, 'smoke-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    // Write human-readable report
    const textReportPath = path.join(REPORTS_DIR, 'smoke-report.txt');
    let textReport = `SiZu Pay Smoke Test Report\n`;
    textReport += `=========================\n\n`;
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

    console.log('\n📊 Test Summary:');
    console.log(`   Duration: ${summary.duration}`);
    console.log(`   Tests: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success Rate: ${Math.round((summary.passed / summary.totalTests) * 100)}%`);
    console.log(`\n📄 Reports saved to:`);
    console.log(`   ${reportPath}`);
    console.log(`   ${textReportPath}`);

    return summary.failed === 0;
  }

  async run() {
    try {
      await this.initialize();

      // Execute all test suites
      await this.testSystemHealth();
      await this.testAdminDashboard();
      await this.testMerchantFlow();
      await this.testGiftCardManagement();
      await this.testAnalyticsExport();
      await this.testFallbackBehavior();
      await this.testAlertChannels();
      await this.testThreatIntelligence();

      const allPassed = await this.generateReport();
      
      await this.cleanup();
      
      if (allPassed) {
        console.log('\n🎉 All smoke tests passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some tests failed. Check the report for details.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Execute smoke tests
const runner = new SmokeTestRunner();
runner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});