import OpenAI from 'openai';
import { EnvironmentService } from './services/EnvironmentService.js';

/**
 * OpenAI Integration Service for AI-Powered Analysis
 * Implements fraud detection, threat analysis, and automated insights
 */

export class OpenAIService {
  private static instance: OpenAI | null = null;
  private static isConfigured = false;

  /**
   * Initialize OpenAI service
   */
  static initialize(): OpenAI | null {
    const config = EnvironmentService.getConfig();
    
    if (!config.openai.apiKey) {
      console.log('[OPENAI] API key not configured - AI features disabled');
      return null;
    }

    try {
      this.instance = new OpenAI({ 
        apiKey: config.openai.apiKey 
      });
      this.isConfigured = true;
      console.log('[OPENAI] Service initialized successfully');
      return this.instance;
    } catch (error) {
      console.error('[OPENAI] Initialization failed:', error.message);
      return null;
    }
  }

  /**
   * Get OpenAI instance
   */
  static getInstance(): OpenAI | null {
    if (!this.instance && this.isConfigured) {
      return this.initialize();
    }
    return this.instance;
  }

  /**
   * Check if OpenAI is configured
   */
  static isOpenAIConfigured(): boolean {
    return this.isConfigured && this.instance !== null;
  }

  /**
   * Analyze fraud patterns using AI
   */
  static async analyzeFraudPatterns(transactionData: any): Promise<{
    riskScore: number;
    analysis: string;
    recommendations: string[];
    confidence: number;
  }> {
    const client = this.getInstance();
    if (!client) {
      return {
        riskScore: 0,
        analysis: 'AI analysis unavailable - OpenAI not configured',
        recommendations: ['Configure OpenAI API key for AI-powered fraud detection'],
        confidence: 0
      };
    }

    try {
      const prompt = `Analyze this transaction data for fraud indicators:
      
Transaction: ${JSON.stringify(transactionData, null, 2)}

Provide analysis in JSON format with:
- riskScore (0-100): Overall fraud risk assessment
- analysis: Detailed explanation of risk factors
- recommendations: Array of specific actions to take
- confidence: Confidence level (0-1) in the analysis

Focus on patterns like unusual amounts, geographic anomalies, timing patterns, and behavioral inconsistencies.`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert fraud detection analyst. Analyze transaction data and provide structured risk assessments in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        riskScore: Math.max(0, Math.min(100, result.riskScore || 0)),
        analysis: result.analysis || 'No analysis available',
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        confidence: Math.max(0, Math.min(1, result.confidence || 0))
      };
    } catch (error) {
      console.error('[OPENAI] Fraud analysis error:', error.message);
      return {
        riskScore: 0,
        analysis: `AI analysis failed: ${error.message}`,
        recommendations: ['Manual review required due to AI analysis failure'],
        confidence: 0
      };
    }
  }

  /**
   * Analyze threat intelligence data
   */
  static async analyzeThreatIntelligence(threatData: any): Promise<{
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    analysis: string;
    indicators: string[];
    mitigation: string[];
  }> {
    const client = this.getInstance();
    if (!client) {
      return {
        threatLevel: 'low',
        analysis: 'AI threat analysis unavailable - OpenAI not configured',
        indicators: [],
        mitigation: ['Configure OpenAI API key for AI-powered threat analysis']
      };
    }

    try {
      const prompt = `Analyze this threat intelligence data:

Threat Data: ${JSON.stringify(threatData, null, 2)}

Provide analysis in JSON format with:
- threatLevel: Classification as "low", "medium", "high", or "critical"
- analysis: Detailed threat assessment
- indicators: Array of threat indicators identified
- mitigation: Array of recommended mitigation strategies

Focus on IP reputation, geographic patterns, attack vectors, and threat actor TTPs.`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity threat intelligence analyst. Analyze threat data and provide structured security assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        threatLevel: ['low', 'medium', 'high', 'critical'].includes(result.threatLevel) 
          ? result.threatLevel 
          : 'low',
        analysis: result.analysis || 'No analysis available',
        indicators: Array.isArray(result.indicators) ? result.indicators : [],
        mitigation: Array.isArray(result.mitigation) ? result.mitigation : []
      };
    } catch (error) {
      console.error('[OPENAI] Threat analysis error:', error.message);
      return {
        threatLevel: 'low',
        analysis: `AI threat analysis failed: ${error.message}`,
        indicators: [],
        mitigation: ['Manual threat assessment required due to AI analysis failure']
      };
    }
  }

  /**
   * Generate automated security report
   */
  static async generateSecurityReport(systemData: any): Promise<{
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    riskAssessment: {
      overall: number;
      categories: Record<string, number>;
    };
  }> {
    const client = this.getInstance();
    if (!client) {
      return {
        summary: 'AI security report unavailable - OpenAI not configured',
        keyFindings: [],
        recommendations: ['Configure OpenAI API key for AI-powered security reporting'],
        riskAssessment: {
          overall: 0,
          categories: {}
        }
      };
    }

    try {
      const prompt = `Generate a comprehensive security report based on this system data:

System Data: ${JSON.stringify(systemData, null, 2)}

Provide report in JSON format with:
- summary: Executive summary of security posture
- keyFindings: Array of important security findings
- recommendations: Array of prioritized security recommendations
- riskAssessment: Object with overall risk score (0-100) and category-specific scores

Analyze authentication, authorization, data protection, network security, and operational security aspects.`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a senior cybersecurity consultant generating executive security reports. Focus on actionable insights and risk prioritization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        summary: result.summary || 'No summary available',
        keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        riskAssessment: {
          overall: Math.max(0, Math.min(100, result.riskAssessment?.overall || 0)),
          categories: result.riskAssessment?.categories || {}
        }
      };
    } catch (error) {
      console.error('[OPENAI] Security report error:', error.message);
      return {
        summary: `AI security report failed: ${error.message}`,
        keyFindings: [],
        recommendations: ['Manual security assessment required due to AI report failure'],
        riskAssessment: {
          overall: 0,
          categories: {}
        }
      };
    }
  }

  /**
   * Analyze log patterns for anomalies
   */
  static async analyzeLogPatterns(logs: string[]): Promise<{
    anomalies: Array<{
      pattern: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
    insights: string[];
    alertRecommendations: string[];
  }> {
    const client = this.getInstance();
    if (!client) {
      return {
        anomalies: [],
        insights: ['AI log analysis unavailable - OpenAI not configured'],
        alertRecommendations: ['Configure OpenAI API key for AI-powered log analysis']
      };
    }

    try {
      const logSample = logs.slice(0, 100).join('\n');
      
      const prompt = `Analyze these system logs for security anomalies and patterns:

Logs:
${logSample}

Provide analysis in JSON format with:
- anomalies: Array of objects with pattern, severity ("low"/"medium"/"high"), and description
- insights: Array of general observations about system behavior
- alertRecommendations: Array of recommended alerting rules or monitoring improvements

Focus on authentication failures, unusual access patterns, error spikes, and potential security incidents.`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a security operations center (SOC) analyst specializing in log analysis and anomaly detection."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        anomalies: Array.isArray(result.anomalies) ? result.anomalies.map(a => ({
          pattern: a.pattern || 'Unknown pattern',
          severity: ['low', 'medium', 'high'].includes(a.severity) ? a.severity : 'low',
          description: a.description || 'No description available'
        })) : [],
        insights: Array.isArray(result.insights) ? result.insights : [],
        alertRecommendations: Array.isArray(result.alertRecommendations) ? result.alertRecommendations : []
      };
    } catch (error) {
      console.error('[OPENAI] Log analysis error:', error.message);
      return {
        anomalies: [],
        insights: [`AI log analysis failed: ${error.message}`],
        alertRecommendations: ['Manual log review required due to AI analysis failure']
      };
    }
  }

  /**
   * Health check for OpenAI service
   */
  static async healthCheck(): Promise<{ status: string; model?: string; error?: string }> {
    const client = this.getInstance();
    if (!client) {
      return { status: 'not_configured', error: 'OpenAI API key not provided' };
    }

    try {
      // Test with a simple completion
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });

      return { 
        status: 'operational', 
        model: response.model 
      };
    } catch (error) {
      return { 
        status: 'error', 
        error: error.message 
      };
    }
  }
}

export default OpenAIService;