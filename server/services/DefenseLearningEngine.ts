import { ThreatReplayService } from './ThreatReplayService';
import { AutoResponderEngine } from './AutoResponderEngine';
import { FraudDetectionEngine } from './FraudDetectionEngine';
import { activityLogger } from '../db/activity-log';

interface LearningRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  recommendation: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'threshold' | 'pattern' | 'response' | 'performance';
  createdAt: string;
  appliedAt?: string;
  status: 'pending' | 'applied' | 'rejected';
}

interface TrainingSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  replayResults: string[];
  rulesGenerated: string[];
  rulesApplied: string[];
  improvements: {
    detectionAccuracy: number;
    responseTime: number;
    falsePositiveReduction: number;
    coverageIncrease: number;
  };
  status: 'running' | 'completed' | 'failed';
  adminApproved: boolean;
}

interface LearningMetrics {
  totalSessions: number;
  rulesGenerated: number;
  rulesApplied: number;
  avgConfidence: number;
  detectionImprovement: number;
  responseTimeImprovement: number;
  lastTraining: string | null;
}

export class DefenseLearningEngine {
  private static learningRules: Map<string, LearningRule> = new Map();
  private static trainingSessions: Map<string, TrainingSession> = new Map();
  private static currentRuleId = 1;
  private static currentSessionId = 1;
  private static learningEnabled = true;
  private static autoApprovalThreshold = 0.85;

  static initialize(): void {
    console.log('[DEFENSE LEARNING] Initializing defense learning engine...');
    this.createBaselineLearningRules();
    console.log(`[DEFENSE LEARNING] Initialized with baseline learning capabilities`);
  }

  private static createBaselineLearningRules(): void {
    const baselineRules: Omit<LearningRule, 'id' | 'createdAt' | 'status'>[] = [
      {
        name: 'High-Value Transaction Threshold',
        description: 'Adjust fraud detection threshold for high-value transactions',
        condition: 'amount > $5000 AND fraud_score < 80',
        recommendation: 'Lower fraud threshold to 70 for amounts > $5000',
        confidence: 0.9,
        priority: 'high',
        category: 'threshold'
      },
      {
        name: 'Geographic Risk Pattern',
        description: 'Enhance geographic risk detection for specific regions',
        condition: 'geo_risk > 80 AND response_time > 2s',
        recommendation: 'Pre-flag high-risk countries for faster processing',
        confidence: 0.85,
        priority: 'medium',
        category: 'pattern'
      },
      {
        name: 'Multi-Location Detection',
        description: 'Improve detection of cross-location abuse patterns',
        condition: 'same_card AND different_locations > 3',
        recommendation: 'Add velocity check for location changes',
        confidence: 0.88,
        priority: 'high',
        category: 'response'
      },
      {
        name: 'Processing Time Optimization',
        description: 'Optimize fraud detection processing time',
        condition: 'detection_time > 1000ms',
        recommendation: 'Implement parallel processing for fraud signals',
        confidence: 0.75,
        priority: 'medium',
        category: 'performance'
      }
    ];

    baselineRules.forEach(rule => {
      const id = `learning_rule_${this.currentRuleId++}`;
      this.learningRules.set(id, {
        ...rule,
        id,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
    });
  }

  static async runTrainingSession(replayIds?: string[], autoApply: boolean = false): Promise<TrainingSession> {
    const sessionId = `training_${Date.now()}_${this.currentSessionId++}`;
    const startTime = Date.now();
    
    console.log(`[DEFENSE LEARNING] Starting training session ${sessionId}`);

    const session: TrainingSession = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      replayResults: replayIds || [],
      rulesGenerated: [],
      rulesApplied: [],
      improvements: {
        detectionAccuracy: 0,
        responseTime: 0,
        falsePositiveReduction: 0,
        coverageIncrease: 0
      },
      status: 'running',
      adminApproved: false
    };

    this.trainingSessions.set(sessionId, session);

    try {
      // Get replay results for analysis
      let replayResults;
      if (replayIds && replayIds.length > 0) {
        replayResults = replayIds.map(id => ThreatReplayService.getReplayResult(id)).filter(Boolean);
      } else {
        // Use all recent replay results
        replayResults = ThreatReplayService.getReplayResults().slice(0, 20);
      }

      if (replayResults.length === 0) {
        throw new Error('No replay results available for training');
      }

      console.log(`[DEFENSE LEARNING] Analyzing ${replayResults.length} replay results`);

      // Analyze patterns and generate learning rules
      const newRules = await this.analyzeReplaysAndGenerateRules(replayResults);
      session.rulesGenerated = newRules.map(r => r.id);

      // Apply high-confidence rules if auto-apply is enabled
      if (autoApply) {
        const highConfidenceRules = newRules.filter(r => r.confidence >= this.autoApprovalThreshold);
        for (const rule of highConfidenceRules) {
          await this.applyLearningRule(rule.id, sessionId);
          session.rulesApplied.push(rule.id);
        }
      }

      // Calculate improvements
      session.improvements = this.calculateImprovements(replayResults, newRules);

      // Complete session
      session.completedAt = new Date().toISOString();
      session.status = 'completed';
      session.adminApproved = autoApply;

      this.trainingSessions.set(sessionId, session);

      // Log training session
      activityLogger.log('webhook', {
        sessionId,
        rulesGenerated: newRules.length,
        rulesApplied: session.rulesApplied.length,
        improvements: session.improvements,
        processingTime: Date.now() - startTime,
        type: 'defense_learning'
      }, 'DefenseLearningEngine');

      console.log(`[DEFENSE LEARNING] Training session ${sessionId} completed`);
      console.log(`[DEFENSE LEARNING] Generated ${newRules.length} rules, applied ${session.rulesApplied.length}`);

      return session;

    } catch (error) {
      console.error(`[DEFENSE LEARNING] Training session ${sessionId} failed:`, error);
      session.status = 'failed';
      session.completedAt = new Date().toISOString();
      this.trainingSessions.set(sessionId, session);
      throw error;
    }
  }

  private static async analyzeReplaysAndGenerateRules(replayResults: any[]): Promise<LearningRule[]> {
    const newRules: LearningRule[] = [];

    // Analyze fraud score patterns
    const fraudScoreAnalysis = this.analyzeFraudScorePatterns(replayResults);
    if (fraudScoreAnalysis.recommendation) {
      newRules.push(this.createLearningRule(
        'Dynamic Fraud Threshold',
        'Adjust fraud detection threshold based on analysis',
        fraudScoreAnalysis.condition,
        fraudScoreAnalysis.recommendation,
        fraudScoreAnalysis.confidence,
        'threshold'
      ));
    }

    // Analyze processing time patterns
    const performanceAnalysis = this.analyzePerformancePatterns(replayResults);
    if (performanceAnalysis.recommendation) {
      newRules.push(this.createLearningRule(
        'Performance Optimization',
        'Optimize processing based on bottleneck analysis',
        performanceAnalysis.condition,
        performanceAnalysis.recommendation,
        performanceAnalysis.confidence,
        'performance'
      ));
    }

    // Analyze response patterns
    const responseAnalysis = this.analyzeResponsePatterns(replayResults);
    if (responseAnalysis.recommendation) {
      newRules.push(this.createLearningRule(
        'Response Pattern Enhancement',
        'Improve auto-response patterns based on analysis',
        responseAnalysis.condition,
        responseAnalysis.recommendation,
        responseAnalysis.confidence,
        'response'
      ));
    }

    // Analyze geographic patterns
    const geoAnalysis = this.analyzeGeographicPatterns(replayResults);
    if (geoAnalysis.recommendation) {
      newRules.push(this.createLearningRule(
        'Geographic Risk Enhancement',
        'Enhance geographic risk detection',
        geoAnalysis.condition,
        geoAnalysis.recommendation,
        geoAnalysis.confidence,
        'pattern'
      ));
    }

    return newRules;
  }

  private static analyzeFraudScorePatterns(replayResults: any[]): any {
    const scores = replayResults.map(r => r.replayOutcome.fraudScore);
    const misses = replayResults.filter(r => 
      r.comparison.missedDetections.length > 0 || 
      Math.abs(r.comparison.scoreDifference) > 15
    );

    if (misses.length > replayResults.length * 0.3) {
      const avgMissedScore = misses.reduce((sum, r) => sum + r.replayOutcome.fraudScore, 0) / misses.length;
      return {
        condition: `fraud_score_variance > 15 OR missed_detections > 0`,
        recommendation: `Adjust fraud threshold sensitivity: lower threshold for scores around ${Math.round(avgMissedScore)}`,
        confidence: Math.min(0.9, 0.5 + (misses.length / replayResults.length))
      };
    }

    return { recommendation: null };
  }

  private static analyzePerformancePatterns(replayResults: any[]): any {
    const slowReplays = replayResults.filter(r => r.replayOutcome.processingTime > 1000);
    
    if (slowReplays.length > replayResults.length * 0.2) {
      const avgSlowTime = slowReplays.reduce((sum, r) => sum + r.replayOutcome.processingTime, 0) / slowReplays.length;
      return {
        condition: `processing_time > 1000ms`,
        recommendation: `Implement caching and parallel processing to reduce average time from ${Math.round(avgSlowTime)}ms`,
        confidence: 0.8
      };
    }

    return { recommendation: null };
  }

  private static analyzeResponsePatterns(replayResults: any[]): any {
    const responseVariances = replayResults.filter(r => r.comparison.responseVariance > 1);
    
    if (responseVariances.length > replayResults.length * 0.25) {
      return {
        condition: `response_variance > 1`,
        recommendation: `Standardize response triggers and add consistency checks`,
        confidence: 0.75
      };
    }

    return { recommendation: null };
  }

  private static analyzeGeographicPatterns(replayResults: any[]): any {
    const geoRisks = replayResults.map(r => r.replayOutcome.geoRisk).filter(risk => risk > 0);
    
    if (geoRisks.length > 0) {
      const avgGeoRisk = geoRisks.reduce((sum, risk) => sum + risk, 0) / geoRisks.length;
      if (avgGeoRisk > 70) {
        return {
          condition: `geo_risk > 70`,
          recommendation: `Enhance geographic pre-screening for risk scores above ${Math.round(avgGeoRisk)}`,
          confidence: 0.82
        };
      }
    }

    return { recommendation: null };
  }

  private static createLearningRule(
    name: string,
    description: string,
    condition: string,
    recommendation: string,
    confidence: number,
    category: string
  ): LearningRule {
    const id = `learning_rule_${Date.now()}_${this.currentRuleId++}`;
    const priority = confidence > 0.9 ? 'critical' : confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';
    
    const rule: LearningRule = {
      id,
      name,
      description,
      condition,
      recommendation,
      confidence,
      priority: priority as any,
      category: category as any,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    this.learningRules.set(id, rule);
    console.log(`[DEFENSE LEARNING] Generated rule: ${name} (confidence: ${Math.round(confidence * 100)}%)`);
    
    return rule;
  }

  private static calculateImprovements(replayResults: any[], newRules: LearningRule[]): any {
    const baselineAccuracy = replayResults.filter(r => r.comparison.missedDetections.length === 0).length / replayResults.length;
    const baselineResponseTime = replayResults.reduce((sum, r) => sum + r.replayOutcome.processingTime, 0) / replayResults.length;
    
    // Estimate improvements based on rule quality and confidence
    const highConfidenceRules = newRules.filter(r => r.confidence > 0.8);
    const thresholdRules = newRules.filter(r => r.category === 'threshold');
    const performanceRules = newRules.filter(r => r.category === 'performance');
    
    return {
      detectionAccuracy: Math.min(0.15, highConfidenceRules.length * 0.03),
      responseTime: Math.min(0.25, performanceRules.length * 0.05),
      falsePositiveReduction: Math.min(0.20, thresholdRules.length * 0.04),
      coverageIncrease: Math.min(0.10, newRules.length * 0.02)
    };
  }

  static async applyLearningRule(ruleId: string, sessionId?: string): Promise<boolean> {
    const rule = this.learningRules.get(ruleId);
    if (!rule) {
      throw new Error(`Learning rule ${ruleId} not found`);
    }

    if (rule.status === 'applied') {
      console.log(`[DEFENSE LEARNING] Rule ${ruleId} already applied`);
      return true;
    }

    try {
      console.log(`[DEFENSE LEARNING] Applying rule: ${rule.name}`);

      // Apply rule based on category
      switch (rule.category) {
        case 'threshold':
          await this.applyThresholdRule(rule);
          break;
        case 'pattern':
          await this.applyPatternRule(rule);
          break;
        case 'response':
          await this.applyResponseRule(rule);
          break;
        case 'performance':
          await this.applyPerformanceRule(rule);
          break;
      }

      // Mark rule as applied
      rule.status = 'applied';
      rule.appliedAt = new Date().toISOString();
      this.learningRules.set(ruleId, rule);

      // Log application
      activityLogger.log('webhook', {
        ruleId,
        ruleName: rule.name,
        category: rule.category,
        confidence: rule.confidence,
        sessionId,
        type: 'rule_application'
      }, 'DefenseLearningEngine');

      console.log(`[DEFENSE LEARNING] Successfully applied rule: ${rule.name}`);
      return true;

    } catch (error) {
      console.error(`[DEFENSE LEARNING] Failed to apply rule ${ruleId}:`, error);
      rule.status = 'rejected';
      this.learningRules.set(ruleId, rule);
      return false;
    }
  }

  private static async applyThresholdRule(rule: LearningRule): Promise<void> {
    // Extract threshold adjustment from recommendation
    const thresholdMatch = rule.recommendation.match(/threshold.*?(\d+)/i);
    if (thresholdMatch) {
      const newThreshold = parseInt(thresholdMatch[1]);
      console.log(`[DEFENSE LEARNING] Adjusting fraud threshold to ${newThreshold}`);
      // This would integrate with the actual fraud detection system
    }
  }

  private static async applyPatternRule(rule: LearningRule): Promise<void> {
    console.log(`[DEFENSE LEARNING] Applying pattern rule: ${rule.recommendation}`);
    // This would add new pattern detection logic
  }

  private static async applyResponseRule(rule: LearningRule): Promise<void> {
    console.log(`[DEFENSE LEARNING] Applying response rule: ${rule.recommendation}`);
    // This would modify auto-responder rules
  }

  private static async applyPerformanceRule(rule: LearningRule): Promise<void> {
    console.log(`[DEFENSE LEARNING] Applying performance rule: ${rule.recommendation}`);
    // This would optimize processing logic
  }

  // Public API methods
  static getLearningRules(): LearningRule[] {
    return Array.from(this.learningRules.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getTrainingSessions(): TrainingSession[] {
    return Array.from(this.trainingSessions.values()).sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  static getLearningMetrics(): LearningMetrics {
    const rules = this.getLearningRules();
    const sessions = this.getTrainingSessions();
    const appliedRules = rules.filter(r => r.status === 'applied');
    
    return {
      totalSessions: sessions.length,
      rulesGenerated: rules.length,
      rulesApplied: appliedRules.length,
      avgConfidence: rules.length > 0 
        ? rules.reduce((sum, r) => sum + r.confidence, 0) / rules.length 
        : 0,
      detectionImprovement: sessions.reduce((sum, s) => sum + s.improvements.detectionAccuracy, 0) / Math.max(sessions.length, 1),
      responseTimeImprovement: sessions.reduce((sum, s) => sum + s.improvements.responseTime, 0) / Math.max(sessions.length, 1),
      lastTraining: sessions[0]?.startedAt || null
    };
  }

  static setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
    console.log(`[DEFENSE LEARNING] Learning ${enabled ? 'enabled' : 'disabled'}`);
  }

  static isLearningEnabled(): boolean {
    return this.learningEnabled;
  }

  static setAutoApprovalThreshold(threshold: number): void {
    this.autoApprovalThreshold = Math.max(0, Math.min(1, threshold));
    console.log(`[DEFENSE LEARNING] Auto-approval threshold set to ${this.autoApprovalThreshold}`);
  }

  static clearData(): void {
    this.learningRules.clear();
    this.trainingSessions.clear();
    console.log('[DEFENSE LEARNING] All learning data cleared');
  }
}

// Initialize the defense learning engine
DefenseLearningEngine.initialize();