import { FraudDetectionEngine } from './FraudDetectionEngine';
import { GeoIPService } from './GeoIPService';
import { AutoResponderEngine } from './AutoResponderEngine';
import { activityLogger } from '../db/activity-log';

interface ThreatLog {
  id: string;
  timestamp: string;
  eventType: string;
  payload: any;
  originalFraudScore?: number;
  originalGeoRisk?: number;
  originalResponses?: string[];
  source: 'webhook' | 'synthetic' | 'archived';
}

interface ReplayResult {
  id: string;
  threatId: string;
  replayedAt: string;
  originalEvent: any;
  replayOutcome: {
    fraudScore: number;
    geoRisk: number;
    responsesTriggered: string[];
    detectionTime: number;
    processingTime: number;
  };
  comparison: {
    scoreDifference: number;
    missedDetections: string[];
    newDetections: string[];
    responseVariance: number;
  };
  learningOpportunities: string[];
  safeMode: boolean;
  adminTriggered: boolean;
}

interface BatchReplayCriteria {
  dateRange?: {
    start: string;
    end: string;
  };
  scoreRange?: {
    min: number;
    max: number;
  };
  ipRange?: string[];
  eventTypes?: string[];
  limit?: number;
  source?: string;
}

export class ThreatReplayService {
  private static threatLogs: Map<string, ThreatLog> = new Map();
  private static replayResults: Map<string, ReplayResult> = new Map();
  private static currentLogId = 1;
  private static currentReplayId = 1;

  static initialize(): void {
    console.log('[THREAT REPLAY SERVICE] Initializing threat replay service...');
    this.seedThreatLogs();
    console.log(`[THREAT REPLAY SERVICE] Initialized with ${this.threatLogs.size} historical threats`);
  }

  private static seedThreatLogs(): void {
    const historicalThreats: Omit<ThreatLog, 'id'>[] = [
      {
        timestamp: '2025-01-15T14:30:00Z',
        eventType: 'gift_card_activity.created',
        payload: {
          merchant_id: 'historical_merchant_001',
          type: 'gift_card_activity.created',
          event_id: 'historical_event_001',
          data: {
            object: {
              type: 'LOAD',
              amount_money: { amount: 350000, currency: 'USD' },
              location_id: 'L_HISTORICAL_001'
            }
          }
        },
        originalFraudScore: 85,
        originalGeoRisk: 60,
        originalResponses: ['Additional verification required'],
        source: 'archived'
      },
      {
        timestamp: '2025-01-16T09:15:00Z',
        eventType: 'gift_card_activity.created',
        payload: {
          merchant_id: 'historical_merchant_002',
          type: 'gift_card_activity.created',
          event_id: 'historical_event_002',
          data: {
            object: {
              type: 'LOAD',
              amount_money: { amount: 750000, currency: 'USD' },
              location_id: 'L_HISTORICAL_002'
            }
          }
        },
        originalFraudScore: 95,
        originalGeoRisk: 85,
        originalResponses: ['IP blocked', 'Merchant flagged', 'Human escalation'],
        source: 'archived'
      },
      {
        timestamp: '2025-01-17T16:45:00Z',
        eventType: 'gift_card_activity.created',
        payload: {
          merchant_id: 'historical_merchant_003',
          type: 'gift_card_activity.created',
          event_id: 'historical_event_003',
          data: {
            object: {
              type: 'LOAD',
              amount_money: { amount: 50000, currency: 'USD' },
              location_id: 'L_HISTORICAL_003'
            }
          }
        },
        originalFraudScore: 25,
        originalGeoRisk: 15,
        originalResponses: ['Transaction approved'],
        source: 'archived'
      },
      {
        timestamp: '2025-01-18T11:20:00Z',
        eventType: 'gift_card_activity.created',
        payload: {
          merchant_id: 'historical_merchant_004',
          type: 'gift_card_activity.created',
          event_id: 'historical_event_004',
          data: {
            object: {
              type: 'LOAD',
              amount_money: { amount: 1250000, currency: 'USD' },
              location_id: 'L_HISTORICAL_004'
            }
          }
        },
        originalFraudScore: 98,
        originalGeoRisk: 92,
        originalResponses: ['IP blocked', 'Merchant flagged', 'Human escalation', 'Alert dispatched'],
        source: 'archived'
      },
      {
        timestamp: '2025-01-18T20:30:00Z',
        eventType: 'gift_card_activity.created',
        payload: {
          merchant_id: 'historical_merchant_005',
          type: 'gift_card_activity.created',
          event_id: 'historical_event_005',
          data: {
            object: {
              type: 'LOAD',
              amount_money: { amount: 125000, currency: 'USD' },
              location_id: 'L_HISTORICAL_005'
            }
          }
        },
        originalFraudScore: 78,
        originalGeoRisk: 55,
        originalResponses: ['Additional verification required', 'Alert dispatched'],
        source: 'archived'
      }
    ];

    historicalThreats.forEach(threat => {
      const id = `threat_log_${this.currentLogId++}`;
      this.threatLogs.set(id, { ...threat, id });
    });
  }

  static async replayThreat(threatId: string, safeMode: boolean = true, adminTriggered: boolean = true): Promise<ReplayResult> {
    const startTime = Date.now();
    const replayId = `replay_${Date.now()}_${this.currentReplayId++}`;
    
    console.log(`[THREAT REPLAY SERVICE] Starting replay ${replayId} for threat ${threatId}`);

    const threatLog = this.threatLogs.get(threatId);
    if (!threatLog) {
      throw new Error(`Threat log ${threatId} not found`);
    }

    try {
      // Create isolated environment for replay
      const originalEvent = { ...threatLog.payload };
      
      // Add replay metadata to prevent real-world actions
      originalEvent._replay_metadata = {
        replay_id: replayId,
        safe_mode: safeMode,
        original_timestamp: threatLog.timestamp,
        replay_timestamp: new Date().toISOString()
      };

      // Execute fraud detection in replay mode
      const fraudDetectionStart = Date.now();
      if (!safeMode) {
        FraudDetectionEngine.run(originalEvent);
      }
      const fraudSignals = FraudDetectionEngine.list(5); // Get recent signals
      const fraudDetectionTime = Date.now() - fraudDetectionStart;

      // Execute geo-IP analysis
      const geoAnalysisStart = Date.now();
      const simulatedIP = this.generateReplayIP(threatLog);
      const geoRisk = await GeoIPService.analyzeIP(simulatedIP);
      const geoAnalysisTime = Date.now() - geoAnalysisStart;

      // Execute auto-responder in safe mode
      const responseStart = Date.now();
      let responsesTriggered: string[] = [];
      if (!safeMode) {
        const autoResponses = AutoResponderEngine.processEvent(originalEvent, fraudSignals, [geoRisk]) || [];
        responsesTriggered = autoResponses.flatMap((r: any) => r.actionsExecuted || []);
      } else {
        // Simulate responses without execution
        responsesTriggered = this.simulateAutoResponses(originalEvent, fraudSignals, geoRisk);
      }
      const responseTime = Date.now() - responseStart;

      // Calculate replay outcome
      const replayOutcome = {
        fraudScore: this.calculateReplayFraudScore(originalEvent, fraudSignals),
        geoRisk: geoRisk.riskScore,
        responsesTriggered,
        detectionTime: fraudDetectionTime,
        processingTime: Date.now() - startTime
      };

      // Compare with original results
      const comparison = this.compareResults(threatLog, replayOutcome);

      // Identify learning opportunities
      const learningOpportunities = this.identifyLearningOpportunities(threatLog, replayOutcome, comparison);

      const replayResult: ReplayResult = {
        id: replayId,
        threatId,
        replayedAt: new Date().toISOString(),
        originalEvent,
        replayOutcome,
        comparison,
        learningOpportunities,
        safeMode,
        adminTriggered
      };

      this.replayResults.set(replayId, replayResult);

      // Log activity
      activityLogger.log('webhook', {
        replayId,
        threatId,
        safeMode,
        fraudScore: replayOutcome.fraudScore,
        responsesTriggered: responsesTriggered.length,
        processingTime: replayOutcome.processingTime,
        type: 'threat_replay'
      }, 'ThreatReplayService');

      console.log(`[THREAT REPLAY SERVICE] Replay ${replayId} completed successfully`);
      console.log(`[THREAT REPLAY SERVICE] Fraud Score: ${replayOutcome.fraudScore}/100, Responses: ${responsesTriggered.length}`);
      console.log(`[THREAT REPLAY SERVICE] Learning Opportunities: ${learningOpportunities.length}`);

      return replayResult;

    } catch (error) {
      const failedResult: ReplayResult = {
        id: replayId,
        threatId,
        replayedAt: new Date().toISOString(),
        originalEvent: threatLog.payload,
        replayOutcome: {
          fraudScore: 0,
          geoRisk: 0,
          responsesTriggered: [],
          detectionTime: 0,
          processingTime: Date.now() - startTime
        },
        comparison: {
          scoreDifference: 0,
          missedDetections: [],
          newDetections: [],
          responseVariance: 0
        },
        learningOpportunities: [`Replay failed: ${error.message}`],
        safeMode,
        adminTriggered
      };

      this.replayResults.set(replayId, failedResult);
      console.error(`[THREAT REPLAY SERVICE] Replay ${replayId} failed:`, error);
      throw error;
    }
  }

  static async batchReplay(criteria: BatchReplayCriteria, safeMode: boolean = true): Promise<ReplayResult[]> {
    console.log(`[THREAT REPLAY SERVICE] Starting batch replay with criteria:`, criteria);

    const eligibleThreats = this.filterThreatsByCriteria(criteria);
    const results: ReplayResult[] = [];

    for (const threat of eligibleThreats) {
      try {
        const result = await this.replayThreat(threat.id, safeMode, true);
        results.push(result);
        
        // Add small delay between replays to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[THREAT REPLAY SERVICE] Failed to replay threat ${threat.id}:`, error);
      }
    }

    console.log(`[THREAT REPLAY SERVICE] Batch replay completed: ${results.length}/${eligibleThreats.length} successful`);
    return results;
  }

  private static filterThreatsByCriteria(criteria: BatchReplayCriteria): ThreatLog[] {
    let threats = Array.from(this.threatLogs.values());

    if (criteria.dateRange) {
      const start = new Date(criteria.dateRange.start);
      const end = new Date(criteria.dateRange.end);
      threats = threats.filter(t => {
        const timestamp = new Date(t.timestamp);
        return timestamp >= start && timestamp <= end;
      });
    }

    if (criteria.scoreRange && criteria.scoreRange.min !== undefined && criteria.scoreRange.max !== undefined) {
      threats = threats.filter(t => 
        t.originalFraudScore && 
        t.originalFraudScore >= criteria.scoreRange!.min && 
        t.originalFraudScore <= criteria.scoreRange!.max
      );
    }

    if (criteria.eventTypes && criteria.eventTypes.length > 0) {
      threats = threats.filter(t => criteria.eventTypes!.includes(t.eventType));
    }

    if (criteria.source) {
      threats = threats.filter(t => t.source === criteria.source);
    }

    if (criteria.limit && criteria.limit > 0) {
      threats = threats.slice(0, criteria.limit);
    }

    return threats;
  }

  private static generateReplayIP(threatLog: ThreatLog): string {
    // Generate consistent IP based on threat log for reproducible results
    const hash = this.simpleHash(threatLog.id);
    const a = 192 + (hash % 64);
    const b = 168 + (hash % 88);
    const c = (hash % 256);
    const d = 1 + (hash % 254);
    return `${a}.${b}.${c}.${d}`;
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private static calculateReplayFraudScore(event: any, fraudSignals: any[]): number {
    // Simulate fraud score calculation based on event characteristics
    let score = 0;
    
    const amount = event.data?.object?.amount_money?.amount || 0;
    if (amount > 500000) score += 40; // $5000+
    if (amount > 300000) score += 20; // $3000+
    if (amount > 100000) score += 10; // $1000+
    
    // Add variance based on fraud signals
    if (fraudSignals && fraudSignals.length > 0) {
      score += fraudSignals.length * 15;
    }
    
    // Add some randomness to simulate detection variance
    score += Math.random() * 10;
    
    return Math.min(Math.round(score), 100);
  }

  private static simulateAutoResponses(event: any, fraudSignals: any[], geoRisk: any): string[] {
    const responses: string[] = [];
    const fraudScore = this.calculateReplayFraudScore(event, fraudSignals);
    
    if (fraudScore >= 90) {
      responses.push('IP blocked', 'Merchant flagged', 'Human escalation');
    } else if (fraudScore >= 70) {
      responses.push('Additional verification required', 'Alert dispatched');
    } else if (fraudScore >= 50) {
      responses.push('Additional verification required');
    } else {
      responses.push('Transaction approved');
    }
    
    if (geoRisk.riskScore > 80) {
      responses.push('Geographic threat detected');
    }
    
    return responses;
  }

  private static compareResults(original: ThreatLog, replay: any): any {
    const scoreDifference = replay.fraudScore - (original.originalFraudScore || 0);
    
    const originalResponses = new Set(original.originalResponses || []);
    const replayResponses = new Set(replay.responsesTriggered || []);
    
    const missedDetections = Array.from(originalResponses).filter(r => !replayResponses.has(r));
    const newDetections = Array.from(replayResponses).filter(r => !originalResponses.has(r));
    
    const responseVariance = Math.abs(originalResponses.size - replayResponses.size);
    
    return {
      scoreDifference,
      missedDetections,
      newDetections,
      responseVariance
    };
  }

  private static identifyLearningOpportunities(original: ThreatLog, replay: any, comparison: any): string[] {
    const opportunities: string[] = [];
    
    if (Math.abs(comparison.scoreDifference) > 10) {
      opportunities.push(`Score variance: ${comparison.scoreDifference} points difference`);
    }
    
    if (comparison.missedDetections.length > 0) {
      opportunities.push(`Missed detections: ${comparison.missedDetections.join(', ')}`);
    }
    
    if (comparison.newDetections.length > 0) {
      opportunities.push(`New detections: ${comparison.newDetections.join(', ')}`);
    }
    
    if (replay.processingTime > 1000) {
      opportunities.push('Performance optimization: detection time exceeds 1 second');
    }
    
    const amount = original.payload.data?.object?.amount_money?.amount || 0;
    if (amount > 500000 && replay.fraudScore < 80) {
      opportunities.push('Large transaction detection threshold may need adjustment');
    }
    
    return opportunities;
  }

  // Public API methods
  static getThreatLogs(): ThreatLog[] {
    return Array.from(this.threatLogs.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  static getThreatLog(id: string): ThreatLog | null {
    return this.threatLogs.get(id) || null;
  }

  static getReplayResults(): ReplayResult[] {
    return Array.from(this.replayResults.values()).sort((a, b) => 
      new Date(b.replayedAt).getTime() - new Date(a.replayedAt).getTime()
    );
  }

  static getReplayResult(id: string): ReplayResult | null {
    return this.replayResults.get(id) || null;
  }

  static getReplayStats(): any {
    const results = this.getReplayResults();
    const successful = results.filter(r => r.learningOpportunities.length === 0 || 
      !r.learningOpportunities.some(o => o.includes('failed')));
    
    return {
      totalThreats: this.threatLogs.size,
      totalReplays: results.length,
      successfulReplays: successful.length,
      failedReplays: results.length - successful.length,
      avgProcessingTime: results.length > 0 
        ? results.reduce((sum, r) => sum + r.replayOutcome.processingTime, 0) / results.length 
        : 0,
      avgFraudScore: results.length > 0 
        ? results.reduce((sum, r) => sum + r.replayOutcome.fraudScore, 0) / results.length 
        : 0,
      totalLearningOpportunities: results.reduce((sum, r) => sum + r.learningOpportunities.length, 0),
      lastReplay: results[0]?.replayedAt || null
    };
  }

  static clearReplayResults(): void {
    this.replayResults.clear();
    console.log('[THREAT REPLAY SERVICE] All replay results cleared');
  }

  static addThreatLog(event: any, originalScore?: number, originalResponses?: string[]): string {
    const id = `threat_log_${Date.now()}_${this.currentLogId++}`;
    const threatLog: ThreatLog = {
      id,
      timestamp: new Date().toISOString(),
      eventType: event.type || 'unknown',
      payload: event,
      originalFraudScore: originalScore,
      originalResponses,
      source: 'webhook'
    };
    
    this.threatLogs.set(id, threatLog);
    console.log(`[THREAT REPLAY SERVICE] Added new threat log: ${id}`);
    return id;
  }
}

// Initialize the service
ThreatReplayService.initialize();