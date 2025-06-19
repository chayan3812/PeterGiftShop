/**
 * PDF Export System for Peter Digital Test Reports
 * Converts test reports to professional PDF format using HTML templates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load test report data
 */
function loadTestReport(reportId) {
  const reportsDir = path.join(__dirname, '..', 'docs', 'reports');
  const reportPath = path.join(reportsDir, `${reportId}.json`);
  
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Report not found: ${reportId}`);
  }
  
  return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
}

/**
 * Generate HTML template for PDF conversion
 */
function generateReportHTML(reportData) {
  const summary = reportData.executionSummary || {};
  const performance = reportData.performanceMetrics || {};
  const security = reportData.securityMetrics || {};
  const testDetails = reportData.testDetails || {};
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${reportData.reportId}</title>
    <style>
        @page {
            size: A4;
            margin: 1in;
            @top-center {
                content: "Peter Digital Enterprise Security Platform";
                font-size: 10pt;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 28pt;
            font-weight: bold;
        }
        
        .header p {
            margin: 10px 0 0 0;
            font-size: 14pt;
            opacity: 0.9;
        }
        
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section h2 {
            color: #667eea;
            font-size: 18pt;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .section h3 {
            color: #764ba2;
            font-size: 14pt;
            margin-bottom: 15px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        
        .metric-value {
            font-size: 24pt;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #666;
            font-size: 10pt;
        }
        
        .status-success {
            color: #28a745;
        }
        
        .status-warning {
            color: #ffc107;
        }
        
        .status-error {
            color: #dc3545;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        .table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .recommendations h3 {
            color: #856404;
            margin-top: 0;
        }
        
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .footer {
            text-align: center;
            color: #666;
            font-size: 10pt;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>API Test Report</h1>
        <p>${reportData.testName || 'Comprehensive API Test Suite'}</p>
        <p>Generated: ${new Date(reportData.generatedAt || Date.now()).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value ${summary.successRate >= 95 ? 'status-success' : summary.successRate >= 80 ? 'status-warning' : 'status-error'}">${summary.successRate || 0}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.totalRequests || 0}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${summary.failCount === 0 ? 'status-success' : 'status-warning'}">${summary.failCount || 0}</div>
                <div class="metric-label">Failed Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${summary.avgResponseTime < 200 ? 'status-success' : summary.avgResponseTime < 500 ? 'status-warning' : 'status-error'}">${summary.avgResponseTime || 0}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${summary.criticalAlerts === 0 ? 'status-success' : 'status-error'}">${summary.criticalAlerts || 0}</div>
                <div class="metric-label">Critical Alerts</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${security.securityScore >= 8 ? 'status-success' : security.securityScore >= 6 ? 'status-warning' : 'status-error'}">${security.securityScore || 'N/A'}</div>
                <div class="metric-label">Security Score</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>P50 Response Time</td>
                    <td>${performance.p50ResponseTime || 'N/A'}</td>
                    <td>ms</td>
                    <td class="${performance.p50ResponseTime < 100 ? 'status-success' : performance.p50ResponseTime < 200 ? 'status-warning' : 'status-error'}">${performance.p50ResponseTime < 100 ? 'Excellent' : performance.p50ResponseTime < 200 ? 'Good' : 'Needs Attention'}</td>
                </tr>
                <tr>
                    <td>P95 Response Time</td>
                    <td>${performance.p95ResponseTime || 'N/A'}</td>
                    <td>ms</td>
                    <td class="${performance.p95ResponseTime < 500 ? 'status-success' : performance.p95ResponseTime < 1000 ? 'status-warning' : 'status-error'}">${performance.p95ResponseTime < 500 ? 'Excellent' : performance.p95ResponseTime < 1000 ? 'Good' : 'Needs Attention'}</td>
                </tr>
                <tr>
                    <td>P99 Response Time</td>
                    <td>${performance.p99ResponseTime || 'N/A'}</td>
                    <td>ms</td>
                    <td class="${performance.p99ResponseTime < 1000 ? 'status-success' : performance.p99ResponseTime < 2000 ? 'status-warning' : 'status-error'}">${performance.p99ResponseTime < 1000 ? 'Excellent' : performance.p99ResponseTime < 2000 ? 'Good' : 'Needs Attention'}</td>
                </tr>
                <tr>
                    <td>Error Rate</td>
                    <td>${performance.errorRate || 0}</td>
                    <td>%</td>
                    <td class="${performance.errorRate <= 1 ? 'status-success' : performance.errorRate <= 5 ? 'status-warning' : 'status-error'}">${performance.errorRate <= 1 ? 'Excellent' : performance.errorRate <= 5 ? 'Acceptable' : 'Critical'}</td>
                </tr>
                <tr>
                    <td>Throughput</td>
                    <td>${performance.throughput || 'N/A'}</td>
                    <td>requests/min</td>
                    <td class="${performance.throughput >= 100 ? 'status-success' : performance.throughput >= 50 ? 'status-warning' : 'status-error'}">${performance.throughput >= 100 ? 'High' : performance.throughput >= 50 ? 'Medium' : 'Low'}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Security Analysis</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value ${security.authFailures <= 5 ? 'status-success' : 'status-warning'}">${security.authFailures || 0}</div>
                <div class="metric-label">Auth Failures</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${security.suspiciousRequests === 0 ? 'status-success' : 'status-warning'}">${security.suspiciousRequests || 0}</div>
                <div class="metric-label">Suspicious Requests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${security.rateLimitHits === 0 ? 'status-success' : 'status-warning'}">${security.rateLimitHits || 0}</div>
                <div class="metric-label">Rate Limit Hits</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${(security.vulnerabilities || []).length === 0 ? 'status-success' : 'status-error'}">${(security.vulnerabilities || []).length}</div>
                <div class="metric-label">Vulnerabilities</div>
            </div>
        </div>
    </div>

    ${testDetails.authentication ? `
    <div class="section page-break">
        <h2>Authentication Tests</h2>
        <p><strong>Total:</strong> ${testDetails.authentication.total || 0} | 
           <strong>Passed:</strong> ${testDetails.authentication.passed || 0} | 
           <strong>Failed:</strong> ${testDetails.authentication.failed || 0}</p>
        
        ${testDetails.authentication.endpoints ? `
        <table class="table">
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                ${testDetails.authentication.endpoints.map(endpoint => `
                <tr>
                    <td>${endpoint.name || 'N/A'}</td>
                    <td>${endpoint.method || 'N/A'}</td>
                    <td class="${endpoint.status < 400 ? 'status-success' : endpoint.status < 500 ? 'status-warning' : 'status-error'}">${endpoint.status || 'N/A'}</td>
                    <td>${endpoint.responseTime || 'N/A'}ms</td>
                    <td class="${endpoint.result === 'pass' || endpoint.result === 'expected_failure' ? 'status-success' : 'status-error'}">${endpoint.result || 'N/A'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
    </div>
    ` : ''}

    ${testDetails.systemApis ? `
    <div class="section">
        <h2>System API Tests</h2>
        <p><strong>Total Categories:</strong> ${testDetails.systemApis.categories?.length || 0} | 
           <strong>Total Endpoints:</strong> ${testDetails.systemApis.total || 0} | 
           <strong>Passed:</strong> ${testDetails.systemApis.passed || 0}</p>
        
        ${testDetails.systemApis.categories ? `
        <table class="table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Endpoints</th>
                    <th>Passed</th>
                    <th>Avg Response Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${testDetails.systemApis.categories.map(category => `
                <tr>
                    <td>${category.name || 'N/A'}</td>
                    <td>${category.endpoints || 0}</td>
                    <td class="${category.passed === category.endpoints ? 'status-success' : 'status-warning'}">${category.passed || 0}</td>
                    <td>${category.avgResponseTime || 'N/A'}ms</td>
                    <td class="${category.passed === category.endpoints ? 'status-success' : 'status-warning'}">${category.passed === category.endpoints ? 'All Passed' : 'Some Failed'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
    </div>
    ` : ''}

    ${reportData.recommendations && reportData.recommendations.length > 0 ? `
    <div class="section">
        <div class="recommendations">
            <h3>Recommendations</h3>
            <ul>
                ${reportData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
    ` : ''}

    ${reportData.criticalFindings && reportData.criticalFindings.length > 0 ? `
    <div class="section">
        <h2>Critical Findings</h2>
        <ul>
            ${reportData.criticalFindings.map(finding => `<li>${finding}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="footer">
        <p><strong>Peter Digital Enterprise Security Platform</strong></p>
        <p>Report ID: ${reportData.reportId} | Generated: ${new Date().toLocaleString()}</p>
        <p>Confidential - For authorized personnel only</p>
    </div>
</body>
</html>`;
}

/**
 * Export test report to PDF format
 */
async function exportToPDF(reportId, options = {}) {
  console.log(`📄 Exporting test report to PDF: ${reportId}`);
  
  try {
    // Load report data
    const reportData = loadTestReport(reportId);
    
    // Create exports directory
    const exportsDir = path.join(__dirname, '..', 'docs', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate HTML content
    console.log('  📝 Generating PDF template...');
    const htmlContent = generateReportHTML(reportData);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlFilename = `${reportId}-${timestamp}.html`;
    const htmlPath = path.join(exportsDir, htmlFilename);
    
    // Save HTML file
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log('✅ PDF-ready HTML generated successfully!');
    console.log(`📁 HTML file: ${htmlFilename}`);
    console.log('\n🔧 To convert to PDF, use one of these methods:');
    console.log('1. Browser: Open the HTML file and print to PDF');
    console.log('2. wkhtmltopdf: wkhtmltopdf input.html output.pdf');
    console.log('3. Puppeteer: Use headless Chrome for automated conversion');
    console.log('4. Online converter: Upload HTML and download PDF');
    
    return {
      success: true,
      reportId,
      htmlPath,
      htmlFilename,
      instructions: [
        'Open HTML file in browser and print to PDF',
        'Use wkhtmltopdf for command-line conversion',
        'Use online HTML to PDF converter services'
      ]
    };
    
  } catch (error) {
    console.error('❌ PDF export failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List available reports for export
 */
function listAvailableReports() {
  const reportsDir = path.join(__dirname, '..', 'docs', 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    return [];
  }
  
  return fs.readdirSync(reportsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const reportId = file.replace('.json', '');
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
          reportId,
          testName: data.testName || 'Unknown',
          generatedAt: data.generatedAt || stats.mtime.toISOString(),
          size: stats.size
        };
      } catch (error) {
        return {
          reportId,
          testName: 'Invalid Report',
          generatedAt: stats.mtime.toISOString(),
          size: stats.size,
          error: 'Parse error'
        };
      }
    });
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const reportId = args.find(arg => arg.startsWith('--report='))?.split('=')[1];
  const listReports = args.includes('--list');
  
  if (listReports) {
    console.log('📄 Available Test Reports for PDF Export:');
    console.log('=========================================\n');
    
    const reports = listAvailableReports();
    
    if (reports.length === 0) {
      console.log('No reports found in docs/reports/');
      return;
    }
    
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.reportId}`);
      console.log(`   Test Name: ${report.testName}`);
      console.log(`   Generated: ${new Date(report.generatedAt).toLocaleString()}`);
      console.log(`   Size: ${(report.size / 1024).toFixed(1)}KB\n`);
    });
    
    console.log('Usage: node export-pdf.js --report=REPORT_ID');
    return;
  }
  
  if (!reportId) {
    console.log('❌ Report ID required');
    console.log('Usage: node export-pdf.js --report=REPORT_ID');
    console.log('       node export-pdf.js --list');
    return;
  }
  
  exportToPDF(reportId).then(result => {
    if (!result.success) {
      console.error(`Export failed: ${result.error}`);
      process.exit(1);
    }
    
    console.log(`\n🎯 Successfully generated PDF-ready HTML for report: ${result.reportId}`);
  });
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { exportToPDF, listAvailableReports, generateReportHTML };