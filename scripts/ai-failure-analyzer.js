#!/usr/bin/env node

/**
 * AI-Powered Failure Analysis System for Peter Digital API Tests
 * Analyzes failed tests and generates intelligent recommendations using OpenAI
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration paths
const ALERT_CONFIG_PATH = path.join(__dirname, '../config/alert-config.json');
const ELITE_SUMMARY_PATH = path.join(__dirname, '../docs/reports/elite-summary.json');
const ELITE_REPORT_PATH = path.join(__dirname, '../docs/reports/elite-api-report.json');
const FAILURE_REPORT_PATH = path.join(__dirname, '../docs/failure-analysis-report.md');

/**
 * Load configuration files
 */
function loadConfig() {
  try {
    const alertConfig = JSON.parse(fs.readFileSync(ALERT_CONFIG_PATH, 'utf8'));
    return alertConfig;
  } catch (error) {
    console.error('Failed to load alert configuration:', error.message);
    return null;
  }
}

/**
 * Load test summary and detailed report
 */
function loadTestData() {
  try {
    const summary = JSON.parse(fs.readFileSync(ELITE_SUMMARY_PATH, 'utf8'));
    let detailedReport = null;
    
    if (fs.existsSync(ELITE_REPORT_PATH)) {
      detailedReport = JSON.parse(fs.readFileSync(ELITE_REPORT_PATH, 'utf8'));
    }
    
    return { summary, detailedReport };
  } catch (error) {
    console.error('Failed to load test data:', error.message);
    return null;
  }
}

/**
 * Extract failure patterns from test data
 */
function extractFailurePatterns(summary, detailedReport) {
  const patterns = [];
  
  // Analyze success rate issues
  const successRate = parseFloat(summary.executionSummary.successRate);
  if (successRate < 100) {
    patterns.push({
      type: 'success_rate',
      severity: successRate < 95 ? 'high' : 'medium',
      details: {
        actualRate: successRate,
        expectedRate: 100,
        failedRequests: summary.executionSummary.failedRequests,
        totalRequests: summary.executionSummary.totalRequests
      }
    });
  }
  
  // Analyze response time issues
  const avgResponseTime = parseFloat(summary.executionSummary.averageResponseTime);
  if (avgResponseTime > 500) {
    patterns.push({
      type: 'performance',
      severity: avgResponseTime > 1000 ? 'high' : 'medium',
      details: {
        actualTime: avgResponseTime,
        threshold: 500,
        maxTime: parseFloat(summary.executionSummary.maxResponseTime)
      }
    });
  }
  
  // Analyze critical alerts
  const criticalAlerts = summary.executionSummary.criticalAlertsTriggered;
  if (criticalAlerts > 2) {
    patterns.push({
      type: 'security_alerts',
      severity: 'high',
      details: {
        alertCount: criticalAlerts,
        threshold: 2
      }
    });
  }
  
  // Analyze quality gates
  if (!summary.qualityGates.passedSuccessRate || !summary.qualityGates.passedResponseTime) {
    patterns.push({
      type: 'quality_gate_failure',
      severity: 'high',
      details: {
        successRatePassed: summary.qualityGates.passedSuccessRate,
        responseTimePassed: summary.qualityGates.passedResponseTime
      }
    });
  }
  
  return patterns;
}

/**
 * Generate AI analysis using OpenAI
 */
async function generateAIAnalysis(patterns, summary) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set - using built-in analysis');
    return generateBuiltInAnalysis(patterns, summary);
  }
  
  const prompt = `
Analyze the following API test failure patterns for the Peter Digital Enterprise Security Platform and provide specific, actionable recommendations:

Test Summary:
- Success Rate: ${summary.executionSummary.successRate}%
- Failed Requests: ${summary.executionSummary.failedRequests}
- Average Response Time: ${summary.executionSummary.averageResponseTime}ms
- Critical Alerts: ${summary.executionSummary.criticalAlertsTriggered}

Failure Patterns:
${patterns.map(p => `- ${p.type}: ${p.severity} severity - ${JSON.stringify(p.details)}`).join('\n')}

Environment: ${summary.environment}
Coverage: Authentication, Fraud Detection, Threat Intelligence, Gift Cards, Webhooks

Please provide:
1. Root cause analysis for each failure pattern
2. Specific code or configuration fixes
3. Priority ranking (Critical/High/Medium/Low)
4. Prevention strategies for future occurrences

Respond in JSON format with this structure:
{
  "analysis": {
    "rootCauses": [],
    "recommendations": [],
    "priorityActions": [],
    "preventionStrategies": []
  },
  "confidence": "high|medium|low"
}
`;

  try {
    const response = await callOpenAI(prompt, apiKey);
    return JSON.parse(response);
  } catch (error) {
    console.warn(`⚠️  OpenAI analysis failed: ${error.message} - using built-in analysis`);
    return generateBuiltInAnalysis(patterns, summary);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert API testing and enterprise security systems analyst. Provide detailed, actionable technical recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.3
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0]) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error(`Unexpected OpenAI response: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Built-in analysis for when OpenAI is not available
 */
function generateBuiltInAnalysis(patterns, summary) {
  const analysis = {
    rootCauses: [],
    recommendations: [],
    priorityActions: [],
    preventionStrategies: []
  };
  
  patterns.forEach(pattern => {
    switch (pattern.type) {
      case 'success_rate':
        analysis.rootCauses.push(`API failure rate of ${100 - pattern.details.actualRate}% indicates potential server errors or authentication issues`);
        analysis.recommendations.push('Check server logs for 500 errors, validate authentication tokens, review Square API credentials');
        analysis.priorityActions.push('Critical: Investigate failed endpoints immediately');
        break;
        
      case 'performance':
        analysis.rootCauses.push(`Average response time of ${pattern.details.actualTime}ms exceeds 500ms threshold`);
        analysis.recommendations.push('Optimize database queries, implement caching, review third-party API calls');
        analysis.priorityActions.push('High: Performance optimization required');
        break;
        
      case 'security_alerts':
        analysis.rootCauses.push(`${pattern.details.alertCount} critical security alerts triggered during testing`);
        analysis.recommendations.push('Review fraud detection thresholds, validate IP blocking rules, check geo-location filters');
        analysis.priorityActions.push('Critical: Security alert investigation required');
        break;
        
      case 'quality_gate_failure':
        analysis.rootCauses.push('Quality gates failed - system not meeting enterprise standards');
        analysis.recommendations.push('Address underlying performance and reliability issues before deployment');
        analysis.priorityActions.push('Critical: Do not deploy until quality gates pass');
        break;
    }
  });
  
  analysis.preventionStrategies = [
    'Implement pre-deployment API health checks',
    'Set up continuous monitoring with alerting thresholds',
    'Regular performance testing and optimization',
    'Automated security scanning in CI/CD pipeline'
  ];
  
  return {
    analysis,
    confidence: 'medium'
  };
}

/**
 * Generate markdown failure report
 */
function generateFailureReport(patterns, aiAnalysis, summary) {
  const timestamp = new Date().toISOString();
  const reportId = `failure_analysis_${Date.now()}`;
  
  let markdown = `# API Failure Analysis Report\n\n`;
  markdown += `**Report ID:** ${reportId}  \n`;
  markdown += `**Generated:** ${timestamp}  \n`;
  markdown += `**Environment:** ${summary.environment}  \n`;
  markdown += `**Test Suite:** ${summary.testSuite}  \n\n`;
  
  markdown += `## Executive Summary\n\n`;
  markdown += `| Metric | Value | Status |\n`;
  markdown += `|--------|-------|--------|\n`;
  markdown += `| Success Rate | ${summary.executionSummary.successRate}% | ${parseFloat(summary.executionSummary.successRate) >= 95 ? '✅' : '❌'} |\n`;
  markdown += `| Failed Requests | ${summary.executionSummary.failedRequests} | ${summary.executionSummary.failedRequests === 0 ? '✅' : '❌'} |\n`;
  markdown += `| Avg Response Time | ${summary.executionSummary.averageResponseTime}ms | ${parseFloat(summary.executionSummary.averageResponseTime) <= 500 ? '✅' : '❌'} |\n`;
  markdown += `| Critical Alerts | ${summary.executionSummary.criticalAlertsTriggered} | ${summary.executionSummary.criticalAlertsTriggered <= 2 ? '✅' : '⚠️'} |\n\n`;
  
  markdown += `## Failure Patterns Detected\n\n`;
  patterns.forEach((pattern, index) => {
    markdown += `### ${index + 1}. ${pattern.type.replace(/_/g, ' ').toUpperCase()}\n`;
    markdown += `**Severity:** ${pattern.severity.toUpperCase()}  \n`;
    markdown += `**Details:**\n`;
    Object.entries(pattern.details).forEach(([key, value]) => {
      markdown += `- ${key}: ${value}\n`;
    });
    markdown += `\n`;
  });
  
  markdown += `## AI Analysis Results\n\n`;
  markdown += `**Confidence Level:** ${aiAnalysis.confidence.toUpperCase()}\n\n`;
  
  if (aiAnalysis.analysis.rootCauses.length > 0) {
    markdown += `### Root Cause Analysis\n`;
    aiAnalysis.analysis.rootCauses.forEach((cause, index) => {
      markdown += `${index + 1}. ${cause}\n`;
    });
    markdown += `\n`;
  }
  
  if (aiAnalysis.analysis.priorityActions.length > 0) {
    markdown += `### Priority Actions\n`;
    aiAnalysis.analysis.priorityActions.forEach((action, index) => {
      markdown += `${index + 1}. ${action}\n`;
    });
    markdown += `\n`;
  }
  
  if (aiAnalysis.analysis.recommendations.length > 0) {
    markdown += `### Recommendations\n`;
    aiAnalysis.analysis.recommendations.forEach((rec, index) => {
      markdown += `${index + 1}. ${rec}\n`;
    });
    markdown += `\n`;
  }
  
  if (aiAnalysis.analysis.preventionStrategies.length > 0) {
    markdown += `### Prevention Strategies\n`;
    aiAnalysis.analysis.preventionStrategies.forEach((strategy, index) => {
      markdown += `${index + 1}. ${strategy}\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `## Next Steps\n\n`;
  markdown += `1. Review and prioritize the recommendations above\n`;
  markdown += `2. Address critical and high-severity issues immediately\n`;
  markdown += `3. Implement prevention strategies to avoid future failures\n`;
  markdown += `4. Re-run tests after implementing fixes\n\n`;
  
  markdown += `---\n`;
  markdown += `*Report generated by Peter Digital AI Failure Analyzer*\n`;
  
  return markdown;
}

/**
 * Main execution function
 */
async function analyzeFailures() {
  console.log('🤖 AI Failure Analyzer - Peter Digital API Monitor');
  console.log('================================================\n');

  // Load configuration
  const config = loadConfig();
  if (!config) {
    console.error('❌ Failed to load alert configuration');
    process.exit(1);
  }

  // Check if AI analyzer is enabled
  if (!config.aiAnalyzerEnabled) {
    console.log('ℹ️  AI failure analyzer is disabled in configuration');
    return;
  }

  // Load test data
  const testData = loadTestData();
  if (!testData || !testData.summary) {
    console.error('❌ Failed to load test data');
    process.exit(1);
  }

  const { summary, detailedReport } = testData;

  try {
    // Extract failure patterns
    console.log('🔍 Extracting failure patterns...');
    const patterns = extractFailurePatterns(summary, detailedReport);
    
    if (patterns.length === 0) {
      console.log('✅ No failure patterns detected - system performing within normal parameters');
      
      // Still generate a success report
      const successReport = `# API Success Report\n\n**Generated:** ${new Date().toISOString()}\n\n✅ All tests passed successfully - no issues detected.\n\n**Metrics:**\n- Success Rate: ${summary.executionSummary.successRate}%\n- Response Time: ${summary.executionSummary.averageResponseTime}ms\n- Critical Alerts: ${summary.executionSummary.criticalAlertsTriggered}\n\n*System operating at elite standards.*\n`;
      
      fs.writeFileSync(FAILURE_REPORT_PATH, successReport);
      console.log(`📄 Success report saved: ${FAILURE_REPORT_PATH}`);
      return;
    }

    console.log(`📊 Found ${patterns.length} failure pattern(s)`);
    
    // Generate AI analysis
    console.log('🧠 Generating AI analysis...');
    const aiAnalysis = await generateAIAnalysis(patterns, summary);
    
    // Generate failure report
    console.log('📝 Generating failure analysis report...');
    const report = generateFailureReport(patterns, aiAnalysis, summary);
    
    // Save report
    fs.writeFileSync(FAILURE_REPORT_PATH, report);
    
    console.log('✅ AI failure analysis completed');
    console.log(`📄 Report saved: ${FAILURE_REPORT_PATH}`);
    console.log(`🎯 Confidence Level: ${aiAnalysis.confidence.toUpperCase()}`);
    console.log(`🔧 Recommendations: ${aiAnalysis.analysis.recommendations.length}`);
    console.log(`⚡ Priority Actions: ${aiAnalysis.analysis.priorityActions.length}`);
    
  } catch (error) {
    console.error('❌ AI failure analysis failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeFailures()
    .then(() => {
      console.log('\n✅ AI failure analysis process completed');
    })
    .catch((error) => {
      console.error('\n❌ AI failure analysis process failed:', error);
      process.exit(1);
    });
}

export { analyzeFailures };