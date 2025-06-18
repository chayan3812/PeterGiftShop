#!/usr/bin/env node

/**
 * Automated API Testing Script for Peter Digital Enterprise Security Platform
 * Tests all endpoints from the Postman collection to verify functionality
 */

import http from 'http';
import https from 'https';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// HTTP request helper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test runner function
async function runTest(testName, method, path, data = null, expectedStatus = 200) {
  const url = new URL(BASE_URL + path);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PostmanAPITester/1.0'
    }
  };

  try {
    const response = await makeRequest(options, data);
    const passed = response.statusCode === expectedStatus;
    
    results.tests.push({
      name: testName,
      method: method,
      path: path,
      status: response.statusCode,
      expected: expectedStatus,
      passed: passed,
      responseSize: response.body.length
    });

    if (passed) {
      results.passed++;
      console.log(`✅ ${testName}: ${method} ${path} - ${response.statusCode}`);
    } else {
      results.failed++;
      console.log(`❌ ${testName}: ${method} ${path} - ${response.statusCode} (expected ${expectedStatus})`);
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: testName,
      method: method,
      path: path,
      status: 'ERROR',
      expected: expectedStatus,
      passed: false,
      error: error.message
    });
    console.log(`❌ ${testName}: ${method} ${path} - ERROR: ${error.message}`);
  }
}

// Main test suite
async function runAllTests() {
  console.log('🧪 Peter Digital API Test Suite');
  console.log('================================\n');

  // System Health Tests
  console.log('📊 System Health Tests');
  await runTest('Health Check', 'GET', '/api/health');
  await runTest('Square Status', 'GET', '/api/square/status');
  
  // Authentication Tests
  console.log('\n🔐 Authentication Tests');
  await runTest('Auth Status', 'GET', '/api/auth/status');
  
  // Gift Card Tests
  console.log('\n🎁 Gift Card Tests');
  await runTest('Purchase Gift Card', 'POST', '/api/gift-cards/purchase', {
    amount: '50.00',
    recipientEmail: 'test@example.com',
    senderName: 'API Test',
    message: 'Test purchase',
    deliveryType: 'instant'
  });
  
  await runTest('Check Balance (Invalid)', 'POST', '/api/gift-cards/check-balance', {
    code: 'INVALID-CODE'
  }, 404);
  
  // Webhook Tests
  console.log('\n🪝 Webhook Tests');
  await runTest('Process Webhook', 'POST', '/api/webhooks/gift-cards', {
    merchant_id: 'test_merchant',
    type: 'gift_card.updated',
    event_id: 'test_event_123',
    created_at: new Date().toISOString(),
    data: {
      type: 'gift_card',
      id: 'test_gc_123',
      object: {
        gift_card: {
          id: 'test_gc_123',
          type: 'DIGITAL',
          state: 'ACTIVE',
          balance_money: { amount: 5000, currency: 'USD' }
        }
      }
    }
  });
  
  await runTest('Webhook Logs', 'GET', '/api/webhooks/logs');
  await runTest('Webhook Stats', 'GET', '/api/webhooks/stats');
  
  // Fraud Detection Tests
  console.log('\n🛡️ Fraud Detection Tests');
  await runTest('Fraud Signals', 'GET', '/api/fraud/signals');
  await runTest('Fraud Statistics', 'GET', '/api/fraud/stats');
  
  // Threat Intelligence Tests
  console.log('\n🌍 Threat Intelligence Tests');
  await runTest('Threat Map', 'GET', '/api/threats/map');
  await runTest('Threat Statistics', 'GET', '/api/threats/stats');
  
  // Analytics Tests
  console.log('\n📈 Analytics Tests');
  await runTest('Analytics Data', 'GET', '/api/analytics/data');
  
  // AI Digest Tests
  console.log('\n🤖 AI Digest Tests');
  await runTest('Latest Digest', 'GET', '/api/digest/latest');
  await runTest('Digest List', 'GET', '/api/digest/list');
  await runTest('Generate Digest', 'POST', '/api/digest/generate', { period: 'daily' });
  await runTest('Digest Stats', 'GET', '/api/digest/stats');
  
  // Auto-Responder Tests
  console.log('\n⚡ Auto-Responder Tests');
  await runTest('Auto-Responder Rules', 'GET', '/api/auto-responder/rules');
  await runTest('Trigger Auto-Responder', 'POST', '/api/auto-responder/trigger', {
    event: {
      type: 'fraud_detected',
      score: 75,
      ip_address: '192.168.1.100',
      transaction_amount: 150.00,
      timestamp: new Date().toISOString()
    }
  });
  await runTest('Auto-Responder Stats', 'GET', '/api/auto-responder/stats');
  await runTest('Response History', 'GET', '/api/auto-responder/responses');
  await runTest('Security Alerts', 'GET', '/api/auto-responder/alerts');
  await runTest('Blocked IPs', 'GET', '/api/auto-responder/blocked-ips');
  
  // Threat Replay Tests
  console.log('\n🎯 Threat Replay Tests');
  await runTest('Execute Threat Replay', 'POST', '/api/threats/replay', {
    scenario: 'medium_fraud_score',
    merchantId: 'test_merchant_api',
    simulateScore: 75,
    geoLocation: 'United States',
    transactionAmount: 200.00,
    fraudType: 'account_takeover'
  });
  await runTest('Replay History', 'GET', '/api/threats/replay-history');
  await runTest('Replay Scenarios', 'GET', '/api/threats/replay-scenarios');
  await runTest('Replay Stats', 'GET', '/api/threats/replay-stats');
  await runTest('Learning Updates', 'GET', '/api/threats/learning-updates');
  await runTest('Audit Log', 'GET', '/api/threats/audit-log');
  await runTest('Toggle Learning', 'POST', '/api/threats/learning/toggle', { enabled: true });
  await runTest('Update Threshold', 'POST', '/api/threats/learning/threshold', {
    thresholdType: 'fraud_threshold',
    value: 85
  });
  
  // Results Summary
  console.log('\n🎯 Test Results Summary');
  console.log('========================');
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  - ${test.name}: ${test.method} ${test.path} (${test.status})`);
    });
  }
  
  // Export results to JSON
  fs.writeFileSync('docs/api-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results exported to docs/api-test-results.json');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the test suite
runAllTests().catch(console.error);