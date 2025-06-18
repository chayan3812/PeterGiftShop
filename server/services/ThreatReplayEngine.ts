import { FraudDetectionEngine } from './FraudDetectionEngine';
import { GeoIPService } from './GeoIPService';
import { AutoResponderEngine } from './AutoResponderEngine';
import { AlertDispatcher } from './AlertDispatcher';
import { activityLogger } from '../db/activity-log';

interface ThreatReplayScenario {
  id: string;
  name: string;
  description: string;
  merchantId?: string;
  simulateScore?: number;
  geoLocation?: string;
  transactionAmount?: number;
  fraudType?: string;
  expectedOutcomes: string[];
}

interface ReplayExecution {
  id: string;
  scenarioId: string;
  triggeredAt: string;
  adminTriggered: boolean;
  sourceType: 'manual' | 'scheduled' | 'ai-training';
  scenarioSummary: string;
  impactScore: number;
  fraudSignalsGenerated: number;
  autoResponsesTriggered: number;
  aiAdjustmentsMade: string[];
  executionTime: number;
  status: 'success' | 'failed' | 'partial';
  outcomes: any[];
  learningData: any;
}

interface DefenseLearningUpdate {
  id: string;
  timestamp: string;
  triggerSource: 'replay' | 'live-event';
  adjustmentType: 'threshold' | 'pattern' | 'rule-weight';
  oldValue: any;
  newValue: any;
  confidence: number;
  impactPrediction: string;
  approved: boolean;
  adminReview: boolean;
}

export class ThreatReplayEngine {
  private static scenarios: Map<string, ThreatReplayScenario> = new Map();
  private static executions: Map<string, ReplayExecution> = new Map();
  private static learningUpdates: Map<string, DefenseLearningUpdate> = new Map();
  private static currentScenarioId = 1;
  private static currentExecutionId = 1;
  private static currentLearningId = 1;
  private static isLearningEnabled = true;
  private static aiThresholds = {
    fraudScoreThreshold: 85,
    geoRiskThreshold: 70,
    amountThreshold: 100000, // $1000 in cents
    confidenceThreshold: 0.75
  };

  static initialize(): void {
    console.log('[THREAT REPLAY] Engine initializing...');
    this.createDefaultScenarios();
    console.log(`[THREAT REPLAY] Initialized with ${this.scenarios.size} default scenarios`);
  }

  private static createDefaultScenarios(): void {
    const defaultScenarios: Omit<ThreatReplayScenario, 'id'>[] = [
      {
        name: 'Critical Fraud Simulation',
        description: 'High-risk transaction from blacklisted country with VPN',
        simulateScore: 95,
        geoLocation: 'Nigeria',
        transactionAmount: 500000, // $5000
        fraudType: 'geographic-vpn-combo',
        expectedOutcomes: ['IP blocked', 'Merchant flagged', 'Human escalation']
      },
      {
        name: 'Large Transaction Test',
        description: 'Legitimate large transaction for threshold testing',
        simulateScore: 45,
        geoLocation: 'United States',
        transactionAmount: 200000, // $2000
        fraudType: 'legitimate-large',
        expectedOutcomes: ['Additional verification required']
      },
      {
        name: 'Multi-Location Abuse',
        description: 'Same card used across multiple high-risk locations',
        simulateScore: 88,
        geoLocation: 'China,Russia,Iran',
        transactionAmount: 75000, // $750
        fraudType: 'multi-location-abuse',
        expectedOutcomes: ['IP blocked', 'Pattern detected', 'Alert dispatched']
      },
      {
        name: 'VPN Detection Challenge',
        description: 'Advanced VPN/Proxy detection stress test',
        simulateScore: 92,
        geoLocation: 'Unknown',
        transactionAmount: 125000, // $1250
        fraudType: 'advanced-vpn-evasion',
        expectedOutcomes: ['VPN detected', 'Connection blocked', 'Security alert']
      },
      {
        name: 'Low-Risk Baseline',
        description: 'Standard legitimate transaction for baseline comparison',
        simulateScore: 15,
        geoLocation: 'Canada',
        transactionAmount: 5000, // $50
        fraudType: 'legitimate-baseline',
        expectedOutcomes: ['Transaction approved', 'No alerts']
      }
    ];

    defaultScenarios.forEach(scenario => {
      const id = `scenario_${this.currentScenarioId++}`;
      this.scenarios.set(id, { ...scenario, id });
    });
  }

  static async executeReplay(
    scenarioId: string,
    customParams?: Partial<ThreatReplayScenario>,
    adminTriggered: boolean = true
  ): Promise<ReplayExecution> {
    const startTime = Date.now();
    const executionId = `replay_${Date.now()}_${this.currentExecutionId++}`;
    
    console.log(`[THREAT REPLAY] Starting execution ${executionId} for scenario ${scenarioId}`);

    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Merge custom parameters with scenario defaults
    const effectiveScenario = { ...scenario, ...customParams };

    try {
      // Generate synthetic webhook event based on scenario
      const syntheticEvent = this.generateSyntheticEvent(effectiveScenario);
      
      // Track pre-execution state
      const preExecutionState = {
        fraudSignalCount: FraudDetectionEngine.list().length,
        threatCount: GeoIPService.getThreatMap().length,
        blockedIPs: AutoResponderEngine.getBlockedIPs().length,
        flaggedMerchants: AutoResponderEngine.getFlaggedMerchants().length
      };

      // Execute fraud detection
      FraudDetectionEngine.run(syntheticEvent);
      const fraudSignals = FraudDetectionEngine.list(10); // Get recent signals
      
      // Execute geo-IP analysis
      const geoThreats = effectiveScenario.geoLocation 
        ? this.simulateGeoThreats(effectiveScenario.geoLocation, effectiveScenario.simulateScore || 50)
        : [];

      // Log geo threats
      if (geoThreats.length > 0) {
        geoThreats.forEach(threat => {
          GeoIPService.logThreatLocation(
            threat.ip,
            threat.threatType,
            threat.riskScore,
            threat.fraudSignalId,
            threat.eventDetails
          );
        });
      }

      // Process through auto-responder
      const autoResponses = AutoResponderEngine.processEvent(syntheticEvent, fraudSignals, geoThreats) || [];

      // Track post-execution state
      const postExecutionState = {
        fraudSignalCount: FraudDetectionEngine.list().length,
        threatCount: GeoIPService.getThreatMap().length,
        blockedIPs: AutoResponderEngine.getBlockedIPs().length,
        flaggedMerchants: AutoResponderEngine.getFlaggedMerchants().length
      };

      // Calculate impact metrics
      const impactScore = this.calculateImpactScore(preExecutionState, postExecutionState, Array.isArray(fraudSignals) ? fraudSignals.length : 0);
      
      // Generate learning insights
      const learningData = await this.generateLearningInsights(
        effectiveScenario,
        fraudSignals,
        geoThreats,
        autoResponses
      );

      // Apply AI adjustments if learning is enabled
      const aiAdjustments = this.isLearningEnabled 
        ? await this.applyDefenseLearning(learningData)
        : [];

      const executionTime = Date.now() - startTime;

      const execution: ReplayExecution = {
        id: executionId,
        scenarioId,
        triggeredAt: new Date().toISOString(),
        adminTriggered,
        sourceType: adminTriggered ? 'manual' : 'ai-training',
        scenarioSummary: `${effectiveScenario.name}: ${effectiveScenario.description}`,
        impactScore,
        fraudSignalsGenerated: Array.isArray(fraudSignals) ? fraudSignals.length : 0,
        autoResponsesTriggered: Array.isArray(autoResponses) ? autoResponses.length : 0,
        aiAdjustmentsMade: aiAdjustments,
        executionTime,
        status: 'success',
        outcomes: [
          ...(fraudSignals || []).map((signal: any) => ({ type: 'fraud_signal', data: signal })),
          ...geoThreats.map(threat => ({ type: 'geo_threat', data: threat })),
          ...(autoResponses || []).map((response: any) => ({ type: 'auto_response', data: response }))
        ],
        learningData
      };

      this.executions.set(executionId, execution);

      // Log activity  
      activityLogger.log('webhook', {
        executionId,
        scenarioId,
        impactScore,
        fraudSignalsGenerated: fraudSignals.length,
        autoResponsesTriggered: autoResponses.length,
        executionTime,
        type: 'threat_replay'
      }, 'ThreatReplayEngine');

      console.log(`[THREAT REPLAY] Execution ${executionId} completed successfully`);
      console.log(`[THREAT REPLAY] Impact Score: ${impactScore}/100`);
      console.log(`[THREAT REPLAY] Fraud Signals: ${fraudSignals.length}, Auto Responses: ${autoResponses.length}`);
      console.log(`[THREAT REPLAY] AI Adjustments: ${aiAdjustments.length}`);

      return execution;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const failedExecution: ReplayExecution = {
        id: executionId,
        scenarioId,
        triggeredAt: new Date().toISOString(),
        adminTriggered,
        sourceType: adminTriggered ? 'manual' : 'ai-training',
        scenarioSummary: `${effectiveScenario.name}: ${effectiveScenario.description}`,
        impactScore: 0,
        fraudSignalsGenerated: 0,
        autoResponsesTriggered: 0,
        aiAdjustmentsMade: [],
        executionTime,
        status: 'failed',
        outcomes: [{ type: 'error', data: error.message }],
        learningData: { error: error.message }
      };

      this.executions.set(executionId, failedExecution);
      console.error(`[THREAT REPLAY] Execution ${executionId} failed:`, error);
      throw error;
    }
  }

  private static generateSyntheticEvent(scenario: ThreatReplayScenario): any {
    const baseEvent = {
      merchant_id: scenario.merchantId || 'replay_test_merchant',
      type: 'gift_card_activity.created',
      event_id: `replay_${Date.now()}`,
      created_at: new Date().toISOString(),
      data: {
        type: 'gift_card_activity',
        id: `replay_activity_${scenario.id}`,
        object: {
          id: `gftc:replay_${scenario.id}`,
          type: 'LOAD',
          gift_card_id: `replay_card_${scenario.id}`,
          location_id: 'L_REPLAY_SIMULATION',
          amount_money: {
            amount: scenario.transactionAmount || 50000, // Default $500
            currency: 'USD'
          },
          created_at: new Date().toISOString()
        }
      },
      // Add metadata for replay identification
      _replay_metadata: {
        scenario_id: scenario.id,
        scenario_name: scenario.name,
        simulated_score: scenario.simulateScore,
        fraud_type: scenario.fraudType,
        geo_location: scenario.geoLocation
      }
    };

    return baseEvent;
  }

  private static simulateGeoThreats(geoLocation: string, riskScore: number): any[] {
    const locations = geoLocation.split(',');
    return locations.map((location, index) => ({
      id: `replay_threat_${Date.now()}_${index}`,
      ip: this.generateSimulatedIP(location),
      location: {
        country: location.trim(),
        region: 'Simulated Region',
        city: 'Simulated City',
        riskScore: riskScore + (Math.random() * 10 - 5), // Add some variance
        isVPN: riskScore > 80,
        isProxy: riskScore > 75,
        isTor: riskScore > 90
      },
      timestamp: new Date().toISOString(),
      threatType: 'replay-simulation',
      riskScore,
      fraudSignalId: `replay_signal_${Date.now()}_${index}`,
      eventDetails: { replaySimulation: true }
    }));
  }

  private static generateSimulatedIP(country: string): string {
    const countryRanges = {
      'Nigeria': '197.210.',
      'China': '223.5.',
      'Russia': '185.220.',
      'Iran': '178.236.',
      'United States': '8.8.',
      'Canada': '142.103.',
      'Unknown': '127.0.'
    };

    const prefix = countryRanges[country] || '192.168.';
    const suffix1 = Math.floor(Math.random() * 256);
    const suffix2 = Math.floor(Math.random() * 256);
    return `${prefix}${suffix1}.${suffix2}`;
  }

  private static calculateImpactScore(
    preState: any,
    postState: any,
    fraudSignalCount: number
  ): number {
    let score = 0;
    
    // Impact from fraud signals generated
    score += fraudSignalCount * 10;
    
    // Impact from auto-responses triggered
    const newBlockedIPs = postState.blockedIPs - preState.blockedIPs;
    const newFlaggedMerchants = postState.flaggedMerchants - preState.flaggedMerchants;
    
    score += newBlockedIPs * 15;
    score += newFlaggedMerchants * 20;
    
    // Impact from new threats detected
    const newThreats = postState.threatCount - preState.threatCount;
    score += newThreats * 5;
    
    return Math.min(score, 100); // Cap at 100
  }

  private static async generateLearningInsights(
    scenario: ThreatReplayScenario,
    fraudSignals: any[],
    geoThreats: any[],
    autoResponses: any[]
  ): Promise<any> {
    const insights = {
      scenario_effectiveness: scenario.expectedOutcomes.length > 0 ? 
        this.evaluateExpectedOutcomes(scenario.expectedOutcomes, autoResponses) : 'unknown',
      fraud_detection_accuracy: fraudSignals.length > 0 ? 'detected' : 'missed',
      geo_threat_coverage: geoThreats.length > 0 ? 'covered' : 'not_covered',
      auto_response_efficiency: autoResponses.length / Math.max(fraudSignals.length + geoThreats.length, 1),
      threshold_recommendations: this.generateThresholdRecommendations(scenario, fraudSignals, geoThreats),
      pattern_learning: this.extractPatternLearning(scenario, fraudSignals, geoThreats, autoResponses)
    };

    return insights;
  }

  private static evaluateExpectedOutcomes(expected: string[], responses: any[]): string {
    const responseActions = responses.flatMap(r => r.actionsExecuted || []);
    const matchedOutcomes = expected.filter(outcome => 
      responseActions.some(action => action.toLowerCase().includes(outcome.toLowerCase()))
    );
    
    return `${matchedOutcomes.length}/${expected.length} expected outcomes achieved`;
  }

  private static generateThresholdRecommendations(
    scenario: ThreatReplayScenario,
    fraudSignals: any[],
    geoThreats: any[]
  ): any {
    const recommendations = {};
    
    if (scenario.simulateScore && fraudSignals.length === 0) {
      recommendations['fraud_threshold'] = {
        current: this.aiThresholds.fraudScoreThreshold,
        recommended: Math.max(scenario.simulateScore - 5, 60),
        reason: 'High-risk scenario not detected, lower threshold needed'
      };
    }
    
    if (scenario.geoLocation && geoThreats.length === 0) {
      recommendations['geo_threshold'] = {
        current: this.aiThresholds.geoRiskThreshold,
        recommended: Math.max(scenario.simulateScore - 10, 50),
        reason: 'Geographic threat not detected, adjust sensitivity'
      };
    }
    
    return recommendations;
  }

  private static extractPatternLearning(
    scenario: ThreatReplayScenario,
    fraudSignals: any[],
    geoThreats: any[],
    autoResponses: any[]
  ): any {
    return {
      fraud_type_effectiveness: {
        type: scenario.fraudType,
        detection_rate: fraudSignals.length > 0 ? 1.0 : 0.0,
        response_rate: autoResponses.length > 0 ? 1.0 : 0.0
      },
      geographic_pattern: {
        location: scenario.geoLocation,
        threat_score: scenario.simulateScore,
        detected: geoThreats.length > 0
      },
      amount_pattern: {
        amount: scenario.transactionAmount,
        flagged: fraudSignals.some(s => s.reason.includes('amount') || s.reason.includes('large'))
      }
    };
  }

  private static async applyDefenseLearning(learningData: any): Promise<string[]> {
    const adjustments: string[] = [];
    
    if (!this.isLearningEnabled) {
      return adjustments;
    }

    // Apply threshold recommendations
    if (learningData.threshold_recommendations) {
      for (const [key, recommendation] of Object.entries(learningData.threshold_recommendations)) {
        const rec = recommendation as any;
        if (rec.recommended !== rec.current) {
          const updateId = `learning_${Date.now()}_${this.currentLearningId++}`;
          
          const learningUpdate: DefenseLearningUpdate = {
            id: updateId,
            timestamp: new Date().toISOString(),
            triggerSource: 'replay',
            adjustmentType: 'threshold',
            oldValue: rec.current,
            newValue: rec.recommended,
            confidence: 0.8,
            impactPrediction: rec.reason,
            approved: true, // Auto-approve for replay learning
            adminReview: false
          };

          this.learningUpdates.set(updateId, learningUpdate);
          
          // Apply the threshold adjustment
          if (key === 'fraud_threshold') {
            this.aiThresholds.fraudScoreThreshold = rec.recommended;
            adjustments.push(`Fraud threshold: ${rec.current} → ${rec.recommended}`);
          } else if (key === 'geo_threshold') {
            this.aiThresholds.geoRiskThreshold = rec.recommended;
            adjustments.push(`Geo threshold: ${rec.current} → ${rec.recommended}`);
          }
        }
      }
    }

    return adjustments;
  }

  // Public API methods
  static getScenarios(): ThreatReplayScenario[] {
    return Array.from(this.scenarios.values());
  }

  static getScenario(id: string): ThreatReplayScenario | null {
    return this.scenarios.get(id) || null;
  }

  static addScenario(scenario: Omit<ThreatReplayScenario, 'id'>): ThreatReplayScenario {
    const id = `scenario_${Date.now()}_${this.currentScenarioId++}`;
    const newScenario: ThreatReplayScenario = { ...scenario, id };
    this.scenarios.set(id, newScenario);
    return newScenario;
  }

  static getExecutions(): ReplayExecution[] {
    return Array.from(this.executions.values()).sort((a, b) => 
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  }

  static getExecution(id: string): ReplayExecution | null {
    return this.executions.get(id) || null;
  }

  static getLearningUpdates(): DefenseLearningUpdate[] {
    return Array.from(this.learningUpdates.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  static getStats(): any {
    const executions = this.getExecutions();
    const successfulExecutions = executions.filter(e => e.status === 'success');
    
    return {
      totalScenarios: this.scenarios.size,
      totalExecutions: executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
      avgImpactScore: successfulExecutions.length > 0 
        ? successfulExecutions.reduce((sum, e) => sum + e.impactScore, 0) / successfulExecutions.length 
        : 0,
      totalLearningUpdates: this.learningUpdates.size,
      currentThresholds: { ...this.aiThresholds },
      learningEnabled: this.isLearningEnabled,
      lastExecution: executions[0]?.triggeredAt || null
    };
  }

  static setLearningEnabled(enabled: boolean): void {
    this.isLearningEnabled = enabled;
    console.log(`[THREAT REPLAY] Defense learning ${enabled ? 'enabled' : 'disabled'}`);
  }

  static updateThreshold(thresholdType: keyof typeof ThreatReplayEngine.aiThresholds, value: number): void {
    const oldValue = this.aiThresholds[thresholdType];
    this.aiThresholds[thresholdType] = value;
    
    const updateId = `manual_${Date.now()}_${this.currentLearningId++}`;
    const learningUpdate: DefenseLearningUpdate = {
      id: updateId,
      timestamp: new Date().toISOString(),
      triggerSource: 'live-event',
      adjustmentType: 'threshold',
      oldValue,
      newValue: value,
      confidence: 1.0,
      impactPrediction: 'Manual admin adjustment',
      approved: true,
      adminReview: true
    };

    this.learningUpdates.set(updateId, learningUpdate);
    console.log(`[THREAT REPLAY] Threshold updated: ${thresholdType} ${oldValue} → ${value}`);
  }

  static clearData(): void {
    this.executions.clear();
    this.learningUpdates.clear();
    console.log('[THREAT REPLAY] All execution and learning data cleared');
  }

  static getAuditLog(): any[] {
    const allUpdates = this.getLearningUpdates();
    const allExecutions = this.getExecutions();
    
    const auditEntries = [
      ...allUpdates.map(update => ({
        id: update.id,
        timestamp: update.timestamp,
        type: 'defense_learning',
        source: update.triggerSource,
        action: `${update.adjustmentType}: ${update.oldValue} → ${update.newValue}`,
        confidence: update.confidence,
        adminReview: update.adminReview,
        approved: update.approved
      })),
      ...allExecutions.map(execution => ({
        id: execution.id,
        timestamp: execution.triggeredAt,
        type: 'threat_replay',
        source: execution.sourceType,
        action: `Scenario: ${execution.scenarioSummary}`,
        impactScore: execution.impactScore,
        adminTriggered: execution.adminTriggered,
        status: execution.status
      }))
    ];

    return auditEntries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

// Initialize the engine
ThreatReplayEngine.initialize();