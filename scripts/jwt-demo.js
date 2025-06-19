/**
 * JWT-Signed Test Result API Demo
 * Demonstrates secure test result sharing with JWT authentication
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = 'peter_digital_jwt_secret_key_2025_secure';
const BASE_URL = 'http://localhost:5000';

/**
 * Generate JWT token for test result access
 */
function generateAccessToken(reportId, userId = 'system', expiresIn = '24h') {
  const payload = {
    type: 'test_result_access',
    scope: 'read_reports',
    reportId,
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    iss: 'peter-digital-security-platform'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Generate complete signed URL
 */
function generateSignedUrl(reportId, userId = 'system') {
  const token = generateAccessToken(reportId, userId);
  return `${BASE_URL}/api/test-results/secure/${reportId}?token=${token}`;
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Demo: Generate signed URLs for test reports
 */
function demoSignedUrls() {
  console.log('🔐 JWT-Signed Test Result API Demo');
  console.log('=====================================\n');

  const reports = ['elite-summary', 'fraud-analysis', 'security-audit'];
  const users = ['admin', 'auditor', 'developer'];

  console.log('📊 Generating Signed URLs:\n');

  reports.forEach(reportId => {
    users.forEach(userId => {
      const signedUrl = generateSignedUrl(reportId, userId);
      const token = generateAccessToken(reportId, userId);
      const decoded = verifyToken(token);
      
      console.log(`Report: ${reportId} | User: ${userId}`);
      console.log(`URL: ${signedUrl}`);
      console.log(`Valid: ${decoded ? 'Yes' : 'No'} | Expires: ${new Date(decoded.exp * 1000).toLocaleString()}`);
      console.log('---');
    });
  });
}

/**
 * Demo: Slack integration example
 */
function demoSlackIntegration() {
  console.log('\n💬 Slack Integration Examples:\n');

  const reportId = 'elite-summary';
  const signedUrl = generateSignedUrl(reportId, 'slack_bot');

  console.log('Slack Message Format:');
  console.log(`🧪 API Test Results Available: [View Elite Summary](${signedUrl})`);
  console.log('\nSlack Block Kit Format:');
  console.log(JSON.stringify({
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "🧪 *API Test Results*\nElite test suite completed with 95.7% success rate"
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Report"
          },
          "url": signedUrl,
          "action_id": "view_report"
        }
      }
    ]
  }, null, 2));
}

/**
 * Demo: Email integration example
 */
function demoEmailIntegration() {
  console.log('\n📧 Email Integration Example:\n');

  const reportId = 'elite-summary';
  const signedUrl = generateSignedUrl(reportId, 'email_system');

  const emailHtml = `
<html>
<body>
  <h2>API Test Results - Elite Summary</h2>
  <p>Your API test suite has completed with the following results:</p>
  <ul>
    <li>Total Requests: 47</li>
    <li>Success Rate: 95.7%</li>
    <li>Failed Tests: 2</li>
    <li>Average Response Time: 143ms</li>
  </ul>
  <p>
    <a href="${signedUrl}" style="background-color: #0079F2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      View Detailed Report
    </a>
  </p>
  <p><em>This link expires in 24 hours</em></p>
</body>
</html>`;

  console.log('Email HTML Template:');
  console.log(emailHtml);
}

/**
 * Demo: Dashboard widget example
 */
function demoDashboardWidget() {
  console.log('\n📊 Dashboard Widget Example:\n');

  const reports = ['elite-summary', 'fraud-analysis', 'security-audit'];
  const dashboardData = reports.map(reportId => {
    const signedUrl = generateSignedUrl(reportId, 'dashboard');
    const token = generateAccessToken(reportId, 'dashboard');
    const decoded = verifyToken(token);
    
    return {
      reportId,
      title: reportId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      signedUrl,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      secure: true
    };
  });

  console.log('Dashboard Widget JSON:');
  console.log(JSON.stringify(dashboardData, null, 2));
}

/**
 * Demo: API usage examples
 */
function demoApiUsage() {
  console.log('\n🌐 API Usage Examples:\n');

  const reportId = 'elite-summary';
  const signedUrl = generateSignedUrl(reportId, 'api_client');

  console.log('cURL Example:');
  console.log(`curl -H "Accept: application/json" "${signedUrl}"`);

  console.log('\nJavaScript Fetch Example:');
  console.log(`
fetch('${signedUrl}')
  .then(response => response.json())
  .then(data => {
    console.log('Test Results:', data);
    // Process the secure test result data
  })
  .catch(error => console.error('Error:', error));
`);

  console.log('\nPython Requests Example:');
  console.log(`
import requests

response = requests.get('${signedUrl}')
if response.status_code == 200:
    test_data = response.json()
    print(f"Report: {test_data['reportId']}")
    print(f"Success Rate: {test_data['data']['executionSummary']['successRate']}%")
else:
    print(f"Error: {response.status_code}")
`);
}

/**
 * Demo: Security features
 */
function demoSecurityFeatures() {
  console.log('\n🛡️ Security Features Demo:\n');

  const reportId = 'elite-summary';
  const validToken = generateAccessToken(reportId, 'security_demo');
  
  // Demonstrate token expiration
  const shortToken = jwt.sign({
    type: 'test_result_access',
    scope: 'read_reports',
    reportId,
    sub: 'security_demo',
    iat: Math.floor(Date.now() / 1000),
    iss: 'peter-digital-security-platform'
  }, JWT_SECRET, { expiresIn: '1s' });

  console.log('Valid Token Verification:');
  console.log(`Token: ${validToken.substring(0, 50)}...`);
  console.log(`Valid: ${verifyToken(validToken) ? 'Yes' : 'No'}`);

  // Wait to demonstrate expiration
  setTimeout(() => {
    console.log('\nExpired Token Verification:');
    console.log(`Token: ${shortToken.substring(0, 50)}...`);
    console.log(`Valid: ${verifyToken(shortToken) ? 'Yes' : 'No'}`);
    
    console.log('\n✅ Security Features:');
    console.log('• JWT-based authentication');
    console.log('• Token expiration enforcement');
    console.log('• Scope-based access control');
    console.log('• Report-specific permissions');
    console.log('• Audit logging capability');
  }, 1500);
}

/**
 * Main demo execution
 */
function runDemo() {
  demoSignedUrls();
  demoSlackIntegration();
  demoEmailIntegration();
  demoDashboardWidget();
  demoApiUsage();
  demoSecurityFeatures();
}

// Execute demo
runDemo();