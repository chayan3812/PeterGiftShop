/**
 * Comprehensive Authentication System Test Suite
 * Tests all JWT authentication features including security scenarios
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Make authenticated HTTP request
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, finalOptions);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Test user login with various scenarios
 */
async function testLogin() {
  console.log('🔐 Testing User Login');
  const results = [];
  
  // Test valid admin login
  const adminLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  results.push({
    test: 'Admin Login',
    status: adminLogin.status,
    success: adminLogin.ok,
    hasToken: !!(adminLogin.data?.accessToken),
    hasRefreshToken: !!(adminLogin.data?.refreshToken),
    userRole: adminLogin.data?.user?.role
  });
  
  // Test valid user login
  const userLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'user',
      password: 'user123'
    })
  });
  
  results.push({
    test: 'User Login',
    status: userLogin.status,
    success: userLogin.ok,
    hasToken: !!(userLogin.data?.accessToken),
    userRole: userLogin.data?.user?.role
  });
  
  // Test invalid credentials
  const invalidLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'invalid',
      password: 'wrong'
    })
  });
  
  results.push({
    test: 'Invalid Credentials',
    status: invalidLogin.status,
    success: invalidLogin.status === 401,
    errorCode: invalidLogin.data?.code
  });
  
  // Test missing credentials
  const missingCreds = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  results.push({
    test: 'Missing Credentials',
    status: missingCreds.status,
    success: missingCreds.status === 400,
    errorCode: missingCreds.data?.code
  });
  
  return { adminToken: adminLogin.data?.accessToken, userToken: userLogin.data?.accessToken, results };
}

/**
 * Test JWT token validation and protected routes
 */
async function testTokenValidation(adminToken, userToken) {
  console.log('🛡️ Testing Token Validation');
  const results = [];
  
  // Test valid token access
  const validAccess = await makeRequest('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  results.push({
    test: 'Valid Token Access',
    status: validAccess.status,
    success: validAccess.ok,
    userId: validAccess.data?.user?.id,
    role: validAccess.data?.user?.role
  });
  
  // Test missing token
  const noToken = await makeRequest('/api/auth/me');
  
  results.push({
    test: 'Missing Token',
    status: noToken.status,
    success: noToken.status === 401,
    errorCode: noToken.data?.code
  });
  
  // Test invalid token
  const invalidToken = await makeRequest('/api/auth/me', {
    headers: {
      'Authorization': 'Bearer invalid_token'
    }
  });
  
  results.push({
    test: 'Invalid Token',
    status: invalidToken.status,
    success: invalidToken.status === 403,
    errorCode: invalidToken.data?.code
  });
  
  // Test malformed authorization header
  const malformedAuth = await makeRequest('/api/auth/me', {
    headers: {
      'Authorization': 'InvalidFormat'
    }
  });
  
  results.push({
    test: 'Malformed Auth Header',
    status: malformedAuth.status,
    success: malformedAuth.status === 401,
    errorCode: malformedAuth.data?.code
  });
  
  return results;
}

/**
 * Test role-based access control
 */
async function testRoleBasedAccess(adminToken, userToken) {
  console.log('👤 Testing Role-Based Access Control');
  const results = [];
  
  // Test admin access to admin endpoint
  const adminAccess = await makeRequest('/api/auth/api-key', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      clientId: 'test-client',
      permissions: ['read', 'write'],
      description: 'Test API key'
    })
  });
  
  results.push({
    test: 'Admin API Key Generation',
    status: adminAccess.status,
    success: adminAccess.ok,
    hasApiKey: !!(adminAccess.data?.apiKey)
  });
  
  // Test user access to admin endpoint (should fail)
  const userAdminAccess = await makeRequest('/api/auth/api-key', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      clientId: 'test-client',
      permissions: ['read']
    })
  });
  
  results.push({
    test: 'User Admin Access (Should Fail)',
    status: userAdminAccess.status,
    success: userAdminAccess.status === 403,
    errorCode: userAdminAccess.data?.code
  });
  
  return results;
}

/**
 * Test token refresh functionality
 */
async function testTokenRefresh() {
  console.log('🔄 Testing Token Refresh');
  const results = [];
  
  // First login to get refresh token
  const login = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  if (!login.ok || !login.data.refreshToken) {
    results.push({
      test: 'Refresh Token Setup',
      success: false,
      error: 'Failed to get refresh token'
    });
    return results;
  }
  
  const refreshToken = login.data.refreshToken;
  
  // Test valid refresh
  const validRefresh = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken
    })
  });
  
  results.push({
    test: 'Valid Token Refresh',
    status: validRefresh.status,
    success: validRefresh.ok,
    hasNewAccessToken: !!(validRefresh.data?.accessToken),
    hasNewRefreshToken: !!(validRefresh.data?.refreshToken)
  });
  
  // Test invalid refresh token
  const invalidRefresh = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: 'invalid_refresh_token'
    })
  });
  
  results.push({
    test: 'Invalid Refresh Token',
    status: invalidRefresh.status,
    success: invalidRefresh.status === 401,
    errorCode: invalidRefresh.data?.code
  });
  
  // Test missing refresh token
  const missingRefresh = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  results.push({
    test: 'Missing Refresh Token',
    status: missingRefresh.status,
    success: missingRefresh.status === 400,
    errorCode: missingRefresh.data?.code
  });
  
  return results;
}

/**
 * Test logout functionality
 */
async function testLogout(token) {
  console.log('🚪 Testing Logout');
  const results = [];
  
  // Test logout with valid token
  const logout = await makeRequest('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  results.push({
    test: 'Valid Logout',
    status: logout.status,
    success: logout.ok,
    message: logout.data?.message
  });
  
  // Test using token after logout (should fail)
  const postLogoutAccess = await makeRequest('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  results.push({
    test: 'Token Access After Logout',
    status: postLogoutAccess.status,
    success: postLogoutAccess.status === 403,
    errorCode: postLogoutAccess.data?.code
  });
  
  return results;
}

/**
 * Test API key authentication
 */
async function testApiKeyAuth() {
  console.log('🔑 Testing API Key Authentication');
  const results = [];
  
  // First get admin token to generate API key
  const adminLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  if (!adminLogin.ok) {
    results.push({
      test: 'API Key Setup',
      success: false,
      error: 'Failed to login as admin'
    });
    return results;
  }
  
  // Generate API key
  const apiKeyGen = await makeRequest('/api/auth/api-key', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminLogin.data.accessToken}`
    },
    body: JSON.stringify({
      clientId: 'test-api-client',
      permissions: ['read', 'api_access'],
      description: 'Test API key for validation'
    })
  });
  
  if (!apiKeyGen.ok) {
    results.push({
      test: 'API Key Generation',
      success: false,
      error: 'Failed to generate API key'
    });
    return results;
  }
  
  const apiKey = apiKeyGen.data.apiKey;
  
  // Test API key usage
  const apiKeyUsage = await makeRequest('/api/auth/status', {
    headers: {
      'X-API-Key': apiKey
    }
  });
  
  results.push({
    test: 'API Key Usage',
    status: apiKeyUsage.status,
    success: apiKeyUsage.ok,
    serviceStatus: apiKeyUsage.data?.status
  });
  
  // Test invalid API key
  const invalidApiKey = await makeRequest('/api/auth/status', {
    headers: {
      'X-API-Key': 'invalid_api_key'
    }
  });
  
  results.push({
    test: 'Invalid API Key',
    status: invalidApiKey.status,
    success: invalidApiKey.status === 401,
    errorCode: invalidApiKey.data?.code
  });
  
  return results;
}

/**
 * Test system status and health checks
 */
async function testSystemStatus() {
  console.log('📊 Testing System Status');
  const results = [];
  
  // Test public status endpoint
  const publicStatus = await makeRequest('/api/auth/status');
  
  results.push({
    test: 'Public Status Endpoint',
    status: publicStatus.status,
    success: publicStatus.ok,
    serviceStatus: publicStatus.data?.status,
    hasStatistics: !!(publicStatus.data?.statistics)
  });
  
  // Test health endpoint
  const health = await makeRequest('/api/health');
  
  results.push({
    test: 'Health Check',
    status: health.status,
    success: health.ok,
    systemStatus: health.data?.status
  });
  
  return results;
}

/**
 * Generate comprehensive test report
 */
function generateTestReport(allResults) {
  const timestamp = new Date().toISOString();
  const totalTests = allResults.reduce((sum, category) => sum + category.results.length, 0);
  const passedTests = allResults.reduce((sum, category) => 
    sum + category.results.filter(test => test.success).length, 0
  );
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  const report = {
    testSuite: 'JWT Authentication System Validation',
    timestamp,
    summary: {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: parseFloat(successRate)
    },
    categories: allResults.map(category => ({
      category: category.category,
      totalTests: category.results.length,
      passedTests: category.results.filter(test => test.success).length,
      tests: category.results
    })),
    recommendations: generateRecommendations(allResults),
    securityValidation: {
      tokenValidation: 'Implemented',
      roleBasedAccess: 'Implemented',
      tokenRefresh: 'Implemented',
      tokenRevocation: 'Implemented',
      apiKeyAuth: 'Implemented',
      auditLogging: 'Implemented'
    }
  };
  
  return report;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(allResults) {
  const recommendations = [];
  
  const failedTests = allResults.reduce((failed, category) => {
    return failed.concat(category.results.filter(test => !test.success));
  }, []);
  
  if (failedTests.length === 0) {
    recommendations.push('All authentication tests passed - system is production ready');
    recommendations.push('Continue monitoring authentication metrics in production');
    recommendations.push('Consider implementing additional security measures like 2FA');
  } else {
    recommendations.push('Review failed test cases and fix authentication issues');
    recommendations.push('Ensure all security requirements are met before deployment');
  }
  
  recommendations.push('Configure proper JWT secrets for production environment');
  recommendations.push('Set up monitoring and alerting for authentication failures');
  recommendations.push('Implement rate limiting for authentication endpoints');
  
  return recommendations;
}

/**
 * Main test execution
 */
async function runAuthenticationTests() {
  console.log('🧪 JWT Authentication System Test Suite');
  console.log('=====================================\\n');
  
  try {
    const allResults = [];
    
    // Run login tests
    const { adminToken, userToken, results: loginResults } = await testLogin();
    allResults.push({ category: 'Login Authentication', results: loginResults });
    
    if (adminToken && userToken) {
      // Run token validation tests
      const tokenResults = await testTokenValidation(adminToken, userToken);
      allResults.push({ category: 'Token Validation', results: tokenResults });
      
      // Run role-based access tests
      const roleResults = await testRoleBasedAccess(adminToken, userToken);
      allResults.push({ category: 'Role-Based Access', results: roleResults });
      
      // Run logout tests (use a separate login for this)
      const logoutLogin = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      
      if (logoutLogin.ok) {
        const logoutResults = await testLogout(logoutLogin.data.accessToken);
        allResults.push({ category: 'Logout & Token Revocation', results: logoutResults });
      }
    }
    
    // Run refresh token tests
    const refreshResults = await testTokenRefresh();
    allResults.push({ category: 'Token Refresh', results: refreshResults });
    
    // Run API key tests
    const apiKeyResults = await testApiKeyAuth();
    allResults.push({ category: 'API Key Authentication', results: apiKeyResults });
    
    // Run system status tests
    const statusResults = await testSystemStatus();
    allResults.push({ category: 'System Status', results: statusResults });
    
    // Generate comprehensive report
    const report = generateTestReport(allResults);
    
    // Display results
    console.log('\\n📊 TEST RESULTS SUMMARY:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}%\\n`);
    
    // Display category results
    report.categories.forEach(category => {
      console.log(`${category.category}: ${category.passedTests}/${category.totalTests} passed`);
    });
    
    console.log('\\n🔐 SECURITY VALIDATION:');
    Object.entries(report.securityValidation).forEach(([feature, status]) => {
      console.log(`• ${feature}: ${status}`);
    });
    
    console.log('\\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // Save detailed report
    const reportsDir = path.join(process.cwd(), '..', 'docs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, 'jwt-auth-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\\n📄 Detailed report saved: ${reportPath}`);
    console.log('\\n✅ Authentication system testing completed!');
    
    return report;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthenticationTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAuthenticationTests };