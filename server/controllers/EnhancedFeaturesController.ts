import { Request, Response } from 'express';
import { RedisConfig } from '../redis.js';
import { OpenAIService } from '../openai-service.js';
import { MultiChannelAlerting } from '../multi-channel-alerting.js';
import { GoogleSheetsIntegration } from '../google-sheets-integration.js';
import { EnvironmentService } from '../services/EnvironmentService.js';

/**
 * Enhanced Features Controller
 * Manages Redis caching, OpenAI analysis, multi-channel alerting, and Google Sheets analytics
 */

export class EnhancedFeaturesController {
  
  /**
   * Initialize all enhanced features
   */
  static async initializeEnhancedFeatures(req: Request, res: Response): Promise<void> {
    try {
      const initResults = {
        redis: false,
        openai: false,
        alerting: false,
        analytics: false,
        errors: [] as string[]
      };

      // Initialize Redis
      try {
        const redis = await RedisConfig.initialize();
        initResults.redis = redis !== null;
      } catch (error) {
        initResults.errors.push(`Redis: ${(error as Error).message}`);
      }

      // Initialize OpenAI
      try {
        const openai = OpenAIService.initialize();
        initResults.openai = openai !== null;
      } catch (error) {
        initResults.errors.push(`OpenAI: ${(error as Error).message}`);
      }

      // Initialize Multi-channel Alerting
      try {
        await MultiChannelAlerting.initialize();
        const channels = MultiChannelAlerting.getChannelStatus();
        initResults.alerting = channels.slack || channels.email || channels.telegram;
      } catch (error) {
        initResults.errors.push(`Alerting: ${(error as Error).message}`);
      }

      // Initialize Google Sheets
      try {
        await GoogleSheetsIntegration.initialize();
        const sheetsStatus = GoogleSheetsIntegration.getStatus();
        initResults.analytics = sheetsStatus.configured;
      } catch (error) {
        initResults.errors.push(`Analytics: ${(error as Error).message}`);
      }

      res.json({
        success: true,
        message: 'Enhanced features initialization completed',
        results: initResults,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Enhanced features initialization failed',
        details: (error as Error).message
      });
    }
  }

  /**
   * Test Redis distributed caching
   */
  static async testRedisCache(req: Request, res: Response): Promise<void> {
    try {
      const testKey = 'test_cache_key';
      const testData = { message: 'Redis cache test', timestamp: new Date().toISOString() };

      // Test SET operation
      const setResult = await RedisConfig.set(testKey, testData, 60);
      
      // Test GET operation
      const getData = await RedisConfig.get(testKey);
      
      // Test rate limiting
      const rateLimitResult = await RedisConfig.checkRateLimit('test_rate_limit', 10, 60);
      
      // Test health check
      const healthCheck = await RedisConfig.healthCheck();

      res.json({
        success: true,
        redis: {
          connected: RedisConfig.isRedisConnected(),
          set_operation: setResult,
          get_operation: getData,
          rate_limiting: rateLimitResult,
          health_check: healthCheck
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Redis cache test failed',
        details: (error as Error).message
      });
    }
  }

  /**
   * Test OpenAI AI-powered analysis
   */
  static async testOpenAIAnalysis(req: Request, res: Response): Promise<void> {
    try {
      // Test fraud analysis
      const fraudResult = await OpenAIService.analyzeFraudPatterns({
        transactionId: 'test_txn_001',
        amount: 1500,
        location: 'New York, NY',
        timestamp: new Date().toISOString(),
        userBehavior: 'unusual_hour'
      });

      // Test threat intelligence
      const threatResult = await OpenAIService.analyzeThreatIntelligence({
        sourceIP: '192.168.1.100',
        requestPattern: 'multiple_failed_logins',
        userAgent: 'suspicious_bot',
        geolocation: 'unknown'
      });

      // Test health check
      const healthCheck = await OpenAIService.healthCheck();

      res.json({
        success: true,
        openai: {
          configured: OpenAIService.isOpenAIConfigured(),
          fraud_analysis: fraudResult,
          threat_analysis: threatResult,
          health_check: healthCheck
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'OpenAI analysis test failed',
        details: (error as Error).message
      });
    }
  }

  /**
   * Test multi-channel alerting
   */
  static async testMultiChannelAlerting(req: Request, res: Response): Promise<void> {
    try {
      // Get channel status
      const channelStatus = MultiChannelAlerting.getChannelStatus();

      // Test alert sending
      const alertResults = await MultiChannelAlerting.testAlerts();

      res.json({
        success: true,
        alerting: {
          channel_status: channelStatus,
          test_results: alertResults,
          configured_channels: Object.entries(channelStatus)
            .filter(([_, status]) => status)
            .map(([channel]) => channel)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Multi-channel alerting test failed',
        details: (error as Error).message
      });
    }
  }

  /**
   * Test Google Sheets analytics integration
   */
  static async testGoogleSheetsAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Get integration status
      const status = GoogleSheetsIntegration.getStatus();

      // Test health check
      const healthCheck = await GoogleSheetsIntegration.healthCheck();

      // Test security metrics export
      const metricsExport = await GoogleSheetsIntegration.exportSecurityMetrics({
        category: 'test_metrics',
        data: {
          'active_sessions': 42,
          'failed_logins': 3,
          'successful_authentications': 156
        },
        severity: 'info',
        description: 'Test metrics export'
      });

      res.json({
        success: true,
        analytics: {
          status: status,
          health_check: healthCheck,
          metrics_export: metricsExport,
          worksheets: status.worksheets
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Google Sheets analytics test failed',
        details: (error as Error).message
      });
    }
  }

  /**
   * Comprehensive enhanced features validation
   */
  static async validateEnhancedFeatures(req: Request, res: Response): Promise<void> {
    try {
      const validation = {
        timestamp: new Date().toISOString(),
        features: {
          redis: {
            configured: false,
            operational: false,
            capabilities: [] as string[]
          },
          openai: {
            configured: false,
            operational: false,
            capabilities: [] as string[]
          },
          alerting: {
            configured: false,
            operational: false,
            channels: [] as string[]
          },
          analytics: {
            configured: false,
            operational: false,
            worksheets: [] as string[]
          }
        },
        overall: {
          configured_features: 0,
          operational_features: 0,
          success_rate: 0
        }
      };

      // Validate Redis
      try {
        const redisHealth = await RedisConfig.healthCheck();
        validation.features.redis.configured = redisHealth.status !== 'disconnected';
        validation.features.redis.operational = redisHealth.status === 'connected';
        validation.features.redis.capabilities = [
          'distributed_caching',
          'session_management', 
          'rate_limiting',
          'jwt_blacklisting',
          'metrics_tracking'
        ];
      } catch (error) {
        console.error('Redis validation error:', (error as Error).message);
      }

      // Validate OpenAI
      try {
        const openaiHealth = await OpenAIService.healthCheck();
        validation.features.openai.configured = openaiHealth.status !== 'not_configured';
        validation.features.openai.operational = openaiHealth.status === 'operational';
        validation.features.openai.capabilities = [
          'fraud_pattern_analysis',
          'threat_intelligence',
          'security_report_generation',
          'log_anomaly_detection'
        ];
      } catch (error) {
        console.error('OpenAI validation error:', (error as Error).message);
      }

      // Validate Multi-channel Alerting
      try {
        const channels = MultiChannelAlerting.getChannelStatus();
        const configuredChannels = Object.entries(channels)
          .filter(([_, status]) => status)
          .map(([channel]) => channel);
        
        validation.features.alerting.configured = configuredChannels.length > 0;
        validation.features.alerting.operational = configuredChannels.length > 0;
        validation.features.alerting.channels = configuredChannels;
      } catch (error) {
        console.error('Alerting validation error:', (error as Error).message);
      }

      // Validate Google Sheets Analytics
      try {
        const sheetsStatus = GoogleSheetsIntegration.getStatus();
        const sheetsHealth = await GoogleSheetsIntegration.healthCheck();
        
        validation.features.analytics.configured = sheetsStatus.configured;
        validation.features.analytics.operational = sheetsHealth.status === 'operational';
        validation.features.analytics.worksheets = sheetsStatus.worksheets;
      } catch (error) {
        console.error('Analytics validation error:', (error as Error).message);
      }

      // Calculate overall metrics
      const features = Object.values(validation.features);
      validation.overall.configured_features = features.filter(f => f.configured).length;
      validation.overall.operational_features = features.filter(f => f.operational).length;
      validation.overall.success_rate = Math.round((validation.overall.operational_features / features.length) * 100);

      res.json({
        success: true,
        validation: validation,
        recommendations: {
          redis: !validation.features.redis.configured ? 'Configure REDIS_URL for distributed caching' : null,
          openai: !validation.features.openai.configured ? 'Configure OPENAI_API_KEY for AI-powered analysis' : null,
          alerting: validation.features.alerting.channels.length === 0 ? 'Configure Slack, Email, or Telegram for alerts' : null,
          analytics: !validation.features.analytics.configured ? 'Configure Google Sheets credentials for analytics export' : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Enhanced features validation failed',
        details: (error as Error).message
      });
    }
  }

  /**
   * Run comprehensive integrated workflow test
   */
  static async runIntegratedWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflow = {
        started: new Date().toISOString(),
        steps: [] as Array<{ step: string; success: boolean; duration: number; result?: any }>,
        completed: '',
        success: false
      };

      // Step 1: Cache simulation data using Redis
      const step1Start = Date.now();
      try {
        const simulationData = {
          userId: 'test_user_001',
          sessionId: 'session_' + Date.now(),
          fraudScore: 75,
          transactionAmount: 2500
        };
        
        const cacheResult = await RedisConfig.set('workflow_test', simulationData, 300);
        workflow.steps.push({
          step: 'redis_caching',
          success: cacheResult,
          duration: Date.now() - step1Start,
          result: cacheResult ? 'Data cached successfully' : 'Cache operation failed'
        });
      } catch (error) {
        workflow.steps.push({
          step: 'redis_caching',
          success: false,
          duration: Date.now() - step1Start,
          result: (error as Error).message
        });
      }

      // Step 2: AI fraud analysis
      const step2Start = Date.now();
      try {
        const fraudAnalysis = await OpenAIService.analyzeFraudPatterns({
          transactionId: 'workflow_test_txn',
          amount: 2500,
          location: 'Test Location',
          timestamp: new Date().toISOString(),
          riskFactors: ['high_amount', 'unusual_location']
        });
        
        workflow.steps.push({
          step: 'ai_fraud_analysis',
          success: fraudAnalysis.riskScore >= 0,
          duration: Date.now() - step2Start,
          result: `Risk Score: ${fraudAnalysis.riskScore}%, Confidence: ${fraudAnalysis.confidence}`
        });
      } catch (error) {
        workflow.steps.push({
          step: 'ai_fraud_analysis',
          success: false,
          duration: Date.now() - step2Start,
          result: (error as Error).message
        });
      }

      // Step 3: Multi-channel alerting
      const step3Start = Date.now();
      try {
        const alertResult = await MultiChannelAlerting.sendFraudAlert({
          transactionId: 'workflow_test_txn',
          riskScore: 75,
          amount: 2500,
          location: 'Test Location',
          userId: 'test_user_001'
        });
        
        const sentChannels = Object.entries(alertResult)
          .filter(([key, value]) => key !== 'errors' && value === true)
          .map(([key]) => key);
        
        workflow.steps.push({
          step: 'multi_channel_alerting',
          success: sentChannels.length > 0 || alertResult.errors.length === 0,
          duration: Date.now() - step3Start,
          result: `Sent to: ${sentChannels.join(', ') || 'No channels configured'}`
        });
      } catch (error) {
        workflow.steps.push({
          step: 'multi_channel_alerting',
          success: false,
          duration: Date.now() - step3Start,
          result: (error as Error).message
        });
      }

      // Step 4: Analytics export
      const step4Start = Date.now();
      try {
        const analyticsResult = await GoogleSheetsIntegration.exportFraudData({
          transactionId: 'workflow_test_txn',
          riskScore: 75,
          amount: 2500,
          location: 'Test Location',
          status: 'flagged_for_review',
          aiAnalysis: 'High-risk transaction detected by AI analysis'
        });
        
        workflow.steps.push({
          step: 'analytics_export',
          success: analyticsResult,
          duration: Date.now() - step4Start,
          result: analyticsResult ? 'Data exported to Google Sheets' : 'Export failed or not configured'
        });
      } catch (error) {
        workflow.steps.push({
          step: 'analytics_export',
          success: false,
          duration: Date.now() - step4Start,
          result: (error as Error).message
        });
      }

      workflow.completed = new Date().toISOString();
      workflow.success = workflow.steps.every(step => step.success);

      res.json({
        success: true,
        workflow: workflow,
        summary: {
          total_steps: workflow.steps.length,
          successful_steps: workflow.steps.filter(s => s.success).length,
          total_duration: workflow.steps.reduce((sum, step) => sum + step.duration, 0),
          workflow_success: workflow.success
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Integrated workflow test failed',
        details: (error as Error).message
      });
    }
  }
}

export default EnhancedFeaturesController;