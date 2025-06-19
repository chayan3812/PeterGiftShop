/**
 * AI-Powered Failure Analysis System for Peter Digital API Tests
 * Analyzes failed tests and generates intelligent recommendations using OpenAI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration files
 */
function loadConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'ai-analyzer.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    console.warn('Config file not found, using defaults');
  }
  
  return {
    openai: {
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.3
    },
    analysis: {
      includeStackTrace: true,
      suggestCodeFixes: true,
      includeDocumentation: true,
      maxFailuresToAnalyze: 10
    }
  };
}

/**
 * Load test summary and detailed report
 */
function loadTestData() {
  const summaryPath = path.join(__dirname, '..', 'docs', 'reports', 'elite-summary.json');
  const detailedPath = path.join(__dirname, '..', 'docs', 'reports', 'elite-api-report.json');
  
  let summary = {};
  let detailedReport = {};
  
  if (fs.existsSync(summaryPath)) {
    summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  }
  
  if (fs.existsSync(detailedPath)) {
    detailedReport = JSON.parse(fs.readFileSync(detailedPath, 'utf-8'));
  }
  
  return { summary, detailedReport };
}

/**
 * Extract failure patterns from test data
 */
function extractFailurePatterns(summary, detailedReport) {
  const patterns = {
    authenticationFailures: [],
    serverErrors: [],
    timeoutErrors: [],
    validationErrors: [],
    networkErrors: [],
    unknownErrors: []
  };
  
  // Analyze from summary if available
  if (summary.failures) {
    summary.failures.forEach(failure => {
      categorizeFailure(failure, patterns);
    });
  }
  
  // Analyze from detailed report if available
  if (detailedReport.run && detailedReport.run.executions) {
    detailedReport.run.executions.forEach(execution => {
      if (execution.assertions) {
        execution.assertions.forEach(assertion => {
          if (assertion.error) {
            categorizeFailure({
              name: execution.item?.name || 'Unknown Test',
              error: assertion.error.message,
              details: assertion.error
            }, patterns);
          }
        });
      }
    });
  }
  
  return patterns;
}

/**
 * Categorize individual failure
 */
function categorizeFailure(failure, patterns) {
  const error = failure.error || failure.message || '';
  const name = failure.name || 'Unknown';
  
  if (error.includes('401') || error.includes('Unauthorized') || error.includes('authentication')) {
    patterns.authenticationFailures.push({ name, error, type: 'auth' });
  } else if (error.includes('500') || error.includes('Internal Server Error')) {
    patterns.serverErrors.push({ name, error, type: 'server' });
  } else if (error.includes('timeout') || error.includes('TIMEOUT')) {
    patterns.timeoutErrors.push({ name, error, type: 'timeout' });
  } else if (error.includes('400') || error.includes('validation') || error.includes('required')) {
    patterns.validationErrors.push({ name, error, type: 'validation' });
  } else if (error.includes('ECONNREFUSED') || error.includes('network') || error.includes('DNS')) {
    patterns.networkErrors.push({ name, error, type: 'network' });
  } else {
    patterns.unknownErrors.push({ name, error, type: 'unknown' });
  }
}

/**
 * Generate AI analysis using OpenAI
 */
async function generateAIAnalysis(patterns, summary) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('OpenAI API key not configured, using built-in analysis');
    return generateBuiltInAnalysis(patterns, summary);
  }
  
  const totalFailures = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalFailures === 0) {
    return {
      summary: 'All tests passed successfully. No failures to analyze.',
      recommendations: [
        'Continue monitoring test performance',
        'Consider adding more edge case tests',
        'Maintain current testing practices'
      ],
      codeFixSuggestions: [],
      preventionStrategies: [
        'Implement continuous monitoring',
        'Set up automated test scheduling',
        'Review test coverage regularly'
      ]
    };
  }
  
  const prompt = `
Analyze the following API test failures and provide intelligent recommendations:

## Test Summary:
- Total Requests: ${summary.totalRequests || 'Unknown'}
- Failed Tests: ${totalFailures}
- Success Rate: ${summary.successRate || 'Unknown'}%

## Failure Patterns:
${JSON.stringify(patterns, null, 2)}

Please provide:
1. Root cause analysis for each failure type
2. Specific code fix suggestions with file locations
3. Prevention strategies for future failures
4. Priority ranking (Critical/High/Medium/Low)

Respond in JSON format with the following structure:
{
  "summary": "Brief analysis summary",
  "rootCauses": [{"type": "failure_type", "cause": "explanation", "priority": "High"}],
  "codeFixSuggestions": [{"file": "path/to/file", "issue": "description", "fix": "code_changes"}],
  "recommendations": ["action1", "action2"],
  "preventionStrategies": ["strategy1", "strategy2"]
}
`;
  
  try {
    const analysis = await callOpenAI(prompt, apiKey);
    return analysis;
  } catch (error) {
    console.error('OpenAI API call failed:', error.message);
    return generateBuiltInAnalysis(patterns, summary);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: 'You are an expert API testing and debugging assistant. Analyze test failures and provide actionable solutions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Built-in analysis for when OpenAI is not available
 */
function generateBuiltInAnalysis(patterns, summary) {
  const analysis = {
    summary: '',
    rootCauses: [],
    codeFixSuggestions: [],
    recommendations: [],
    preventionStrategies: []
  };
  
  const totalFailures = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalFailures === 0) {
    analysis.summary = 'All tests passed successfully. System is operating within expected parameters.';
    analysis.recommendations = [
      'Continue current monitoring practices',
      'Consider expanding test coverage',
      'Review performance metrics for optimization opportunities'
    ];
    return analysis;
  }
  
  analysis.summary = `Detected ${totalFailures} test failures across multiple categories requiring attention.`;
  
  // Authentication failures
  if (patterns.authenticationFailures.length > 0) {
    analysis.rootCauses.push({
      type: 'authentication',
      cause: 'Missing or invalid authentication credentials',
      priority: 'High'
    });
    analysis.codeFixSuggestions.push({
      file: 'server/services/FusionAuthService.ts',
      issue: 'Authentication endpoints returning 401 errors',
      fix: 'Configure VITE_FUSIONAUTH_CLIENT_ID and VITE_FUSIONAUTH_SERVER_URL environment variables'
    });
  }
  
  // Server errors
  if (patterns.serverErrors.length > 0) {
    analysis.rootCauses.push({
      type: 'server_error',
      cause: 'Internal server configuration or dependency issues',
      priority: 'Critical'
    });
    analysis.codeFixSuggestions.push({
      file: 'server/controllers/GiftCardController.ts',
      issue: 'Square API integration failing',
      fix: 'Configure SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT, and SQUARE_LOCATION_ID'
    });
  }
  
  // Network/timeout errors
  if (patterns.timeoutErrors.length > 0 || patterns.networkErrors.length > 0) {
    analysis.rootCauses.push({
      type: 'network',
      cause: 'Network connectivity or timeout issues',
      priority: 'Medium'
    });
    analysis.codeFixSuggestions.push({
      file: 'scripts/newman-test-runner.js',
      issue: 'Request timeouts during testing',
      fix: 'Increase timeout values and add retry logic for network requests'
    });
  }
  
  // Validation errors
  if (patterns.validationErrors.length > 0) {
    analysis.rootCauses.push({
      type: 'validation',
      cause: 'Request payload validation failures',
      priority: 'Medium'
    });
    analysis.codeFixSuggestions.push({
      file: 'shared/schema.ts',
      issue: 'Data validation schemas too strict',
      fix: 'Review and update Zod schemas to match actual API requirements'
    });
  }
  
  // General recommendations
  analysis.recommendations = [
    'Configure missing environment variables for external services',
    'Implement proper error handling for API integrations',
    'Add request retry logic for transient failures',
    'Set up monitoring alerts for critical endpoints'
  ];
  
  analysis.preventionStrategies = [
    'Implement comprehensive environment validation on startup',
    'Add health checks for external service dependencies',
    'Create integration test environments with mock services',
    'Establish automated deployment validation pipelines'
  ];
  
  return analysis;
}

/**
 * Generate markdown failure report
 */
function generateFailureReport(patterns, aiAnalysis, summary) {
  const timestamp = new Date().toISOString();
  const totalFailures = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
  
  let report = `# AI-Powered Test Failure Analysis Report

**Generated:** ${new Date().toLocaleString()}  
**System:** Peter Digital Enterprise Security Platform  
**Analysis Engine:** AI-Enhanced Diagnostic System

## Executive Summary

${aiAnalysis.summary}

**Total Failures:** ${totalFailures}  
**Success Rate:** ${summary.successRate || 'Unknown'}%  
**Analysis Confidence:** ${totalFailures > 0 ? 'High' : 'N/A'}

`;

  if (totalFailures === 0) {
    report += `## System Status: ✅ ALL TESTS PASSING

No failures detected in the current test run. The system is operating within expected parameters.

### Recommendations for Continued Excellence:
${aiAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}

`;
    return report;
  }

  report += `## Root Cause Analysis

${aiAnalysis.rootCauses.map(cause => `
### ${cause.type.toUpperCase()} - Priority: ${cause.priority}
**Cause:** ${cause.cause}
`).join('\n')}

## Detailed Failure Breakdown

`;

  // Add detailed breakdown for each category
  Object.entries(patterns).forEach(([category, failures]) => {
    if (failures.length > 0) {
      report += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${failures.length})\n\n`;
      failures.forEach((failure, index) => {
        report += `${index + 1}. **${failure.name}**\n   Error: \`${failure.error}\`\n\n`;
      });
    }
  });

  report += `## Code Fix Suggestions

${aiAnalysis.codeFixSuggestions.map(suggestion => `
### ${suggestion.file}
**Issue:** ${suggestion.issue}  
**Recommended Fix:** ${suggestion.fix}
`).join('\n')}

## Implementation Recommendations

${aiAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Prevention Strategies

${aiAnalysis.preventionStrategies.map(strategy => `- ${strategy}`).join('\n')}

## Next Steps

1. **Immediate Actions:** Address Critical and High priority issues
2. **Configuration:** Update environment variables and service configurations
3. **Monitoring:** Implement suggested prevention strategies
4. **Validation:** Re-run tests after implementing fixes

---

*Report generated by AI-Enhanced Test Analysis Engine*  
*Peter Digital Enterprise Security Platform*
`;

  return report;
}

/**
 * Main execution function
 */
async function analyzeFailures() {
  console.log('🧠 AI-Powered Test Failure Analysis');
  console.log('====================================\n');
  
  try {
    // Load configuration and test data
    console.log('📋 Loading configuration and test data...');
    const config = loadConfig();
    const { summary, detailedReport } = loadTestData();
    
    // Extract failure patterns
    console.log('🔍 Analyzing failure patterns...');
    const patterns = extractFailurePatterns(summary, detailedReport);
    
    const totalFailures = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`   Found ${totalFailures} failures to analyze`);
    
    // Generate AI analysis
    console.log('🤖 Generating AI-powered analysis...');
    const aiAnalysis = await generateAIAnalysis(patterns, summary);
    
    // Generate report
    console.log('📄 Creating detailed failure report...');
    const report = generateFailureReport(patterns, aiAnalysis, summary);
    
    // Save report
    const reportsDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, 'ai-failure-analysis.md');
    const jsonPath = path.join(reportsDir, 'ai-analysis-data.json');
    
    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(jsonPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      patterns,
      aiAnalysis,
      summary,
      totalFailures
    }, null, 2));
    
    console.log(`✅ Analysis complete!`);
    console.log(`   Report: ${reportPath}`);
    console.log(`   Data: ${jsonPath}\n`);
    
    // Display key findings
    console.log('🎯 KEY FINDINGS:');
    console.log(`   Total Failures: ${totalFailures}`);
    if (aiAnalysis.rootCauses.length > 0) {
      console.log('   Root Causes:');
      aiAnalysis.rootCauses.forEach(cause => {
        console.log(`   • ${cause.type} (${cause.priority}): ${cause.cause}`);
      });
    }
    
    if (aiAnalysis.codeFixSuggestions.length > 0) {
      console.log('\n🔧 TOP FIXES:');
      aiAnalysis.codeFixSuggestions.slice(0, 3).forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix.file}: ${fix.issue}`);
      });
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    aiAnalysis.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    return {
      success: true,
      totalFailures,
      reportPath,
      analysis: aiAnalysis
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeFailures().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { analyzeFailures, extractFailurePatterns, generateAIAnalysis };