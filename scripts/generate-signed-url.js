/**
 * Generate Signed URLs for Secure Test Result Access
 * Creates JWT-authenticated URLs for sharing test reports securely
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate JWT token for test result access
 */
function generateAccessToken(reportId, userId = 'system', expiresIn = '24h') {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not configured');
  }

  const payload = {
    type: 'test_result_access',
    scope: 'read_reports',
    reportId,
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    iss: 'peter-digital-security-platform'
  };

  return jwt.sign(payload, jwtSecret, { expiresIn });
}

/**
 * Generate complete signed URL
 */
function generateSignedUrl(reportId, userId = 'system', baseUrl = null) {
  const token = generateAccessToken(reportId, userId);
  const base = baseUrl || process.env.BASE_URL || 'http://localhost:5000';
  return `${base}/api/test-results/secure/${reportId}?token=${token}`;
}

/**
 * List available reports
 */
function listAvailableReports() {
  const reportsDir = path.join(process.cwd(), 'docs', 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  return fs.readdirSync(reportsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

/**
 * Generate signed URLs for all available reports
 */
function generateAllSignedUrls(userId = 'system', baseUrl = null) {
  const reports = listAvailableReports();
  
  return reports.map(reportId => ({
    reportId,
    signedUrl: generateSignedUrl(reportId, userId, baseUrl),
    expiresIn: '24h'
  }));
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JWT-Signed Test Result URL Generator

Usage:
  node generate-signed-url.js [options] [reportId]

Options:
  --user-id <id>     User ID for the token (default: system)
  --expires <time>   Token expiration time (default: 24h)
  --base-url <url>   Base URL for the API (default: http://localhost:5000)
  --list             List all available reports
  --all              Generate URLs for all available reports

Examples:
  node generate-signed-url.js elite-summary
  node generate-signed-url.js --user-id admin --expires 7d elite-api-report
  node generate-signed-url.js --list
  node generate-signed-url.js --all
`);
    return;
  }

  try {
    // Parse command line arguments
    const reportId = args.find(arg => !arg.startsWith('--'));
    const userId = args.includes('--user-id') ? args[args.indexOf('--user-id') + 1] : 'system';
    const expiresIn = args.includes('--expires') ? args[args.indexOf('--expires') + 1] : '24h';
    const baseUrl = args.includes('--base-url') ? args[args.indexOf('--base-url') + 1] : null;

    if (args.includes('--list')) {
      console.log('Available Test Reports:');
      const reports = listAvailableReports();
      if (reports.length === 0) {
        console.log('  No reports found in docs/reports/');
      } else {
        reports.forEach(report => console.log(`  - ${report}`));
      }
      return;
    }

    if (args.includes('--all')) {
      console.log('Generating signed URLs for all reports...\n');
      const allUrls = generateAllSignedUrls(userId, baseUrl);
      
      if (allUrls.length === 0) {
        console.log('No reports found to generate URLs for.');
        return;
      }

      allUrls.forEach(({ reportId, signedUrl, expiresIn }) => {
        console.log(`Report: ${reportId}`);
        console.log(`URL: ${signedUrl}`);
        console.log(`Expires: ${expiresIn}`);
        console.log('---');
      });
      return;
    }

    if (!reportId) {
      console.error('Error: Report ID is required');
      console.log('Use --help for usage information');
      process.exit(1);
    }

    // Check if report exists
    const reportPath = path.join(process.cwd(), 'docs', 'reports', `${reportId}.json`);
    if (!fs.existsSync(reportPath)) {
      console.error(`Error: Report '${reportId}' not found`);
      console.log('Available reports:');
      const available = listAvailableReports();
      available.forEach(report => console.log(`  - ${report}`));
      process.exit(1);
    }

    // Generate signed URL
    const signedUrl = generateSignedUrl(reportId, userId, baseUrl);
    
    console.log('✅ Signed URL Generated Successfully');
    console.log('');
    console.log(`Report ID: ${reportId}`);
    console.log(`User ID: ${userId}`);
    console.log(`Expires: ${expiresIn}`);
    console.log('');
    console.log('Signed URL:');
    console.log(signedUrl);
    console.log('');
    console.log('Usage Examples:');
    console.log(`curl "${signedUrl}"`);
    console.log('');
    console.log('For Slack/Teams:');
    console.log(`[View Test Report](${signedUrl})`);

  } catch (error) {
    console.error('Error generating signed URL:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAccessToken, generateSignedUrl, listAvailableReports, generateAllSignedUrls };