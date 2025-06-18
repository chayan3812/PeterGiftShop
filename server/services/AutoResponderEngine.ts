import { FraudDetectionEngine } from './FraudDetectionEngine';
import { GeoIPService } from './GeoIPService';
import { AlertDispatcher } from './AlertDispatcher';

interface AutoResponseRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    fraudScoreThreshold?: number;
    riskScoreThreshold?: number;
    fraudTypes?: string[];
    countries?: string[];
    vpnDetection?: boolean;
    proxyDetection?: boolean;
    repeatOffender?: boolean;
  };
  actions: {
    blockIP?: boolean;
    flagMerchant?: boolean;
    sendAlert?: boolean;
    escalateToHuman?: boolean;
    customMessage?: string;
  };
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

interface AutoResponse {
  id: string;
  ruleId: string;
  triggeredAt: string;
  triggerEvent: any;
  actionsExecuted: string[];
  success: boolean;
  message: string;
}

export class AutoResponderEngine {
  private static rules: Map<string, AutoResponseRule> = new Map();
  private static responses: Map<string, AutoResponse> = new Map();
  private static currentRuleId = 1;
  private static currentResponseId = 1;
  private static blockedIPs: Set<string> = new Set();
  private static flaggedMerchants: Set<string> = new Set();

  static initialize(): void {
    // Initialize with default rules
    this.createDefaultRules();
    console.log('[AUTO RESPONDER] Engine initialized with default rules');
  }

  private static createDefaultRules(): void {
    // Critical fraud score rule
    this.addRule({
      name: 'Critical Fraud Score Response',
      enabled: true,
      conditions: {
        fraudScoreThreshold: 90
      },
      actions: {
        blockIP: true,
        sendAlert: true,
        escalateToHuman: true,
        customMessage: 'Critical fraud score detected - immediate intervention required'
      }
    });

    // High-risk country rule
    this.addRule({
      name: 'High-Risk Geographic Response',
      enabled: true,
      conditions: {
        countries: ['Nigeria', 'China', 'Russia'],
        riskScoreThreshold: 85
      },
      actions: {
        flagMerchant: true,
        sendAlert: true,
        customMessage: 'High-risk geographic activity detected'
      }
    });

    // VPN/Proxy detection rule
    this.addRule({
      name: 'VPN/Proxy Detection Response',
      enabled: true,
      conditions: {
        vpnDetection: true,
        proxyDetection: true
      },
      actions: {
        blockIP: true,
        sendAlert: true,
        customMessage: 'VPN/Proxy connection detected and blocked'
      }
    });

    // Large amount transaction rule
    this.addRule({
      name: 'Large Amount Transaction Response',
      enabled: true,
      conditions: {
        fraudTypes: ['large-amount'],
        fraudScoreThreshold: 75
      },
      actions: {
        flagMerchant: true,
        sendAlert: true,
        customMessage: 'Large amount transaction requires additional verification'
      }
    });

    // Multi-location abuse rule
    this.addRule({
      name: 'Multi-Location Abuse Response',
      enabled: true,
      conditions: {
        fraudTypes: ['multi-location-abuse'],
        fraudScoreThreshold: 80
      },
      actions: {
        blockIP: true,
        escalateToHuman: true,
        sendAlert: true,
        customMessage: 'Multi-location abuse pattern detected'
      }
    });
  }

  static addRule(ruleData: Omit<AutoResponseRule, 'id' | 'createdAt' | 'triggerCount'>): AutoResponseRule {
    const rule: AutoResponseRule = {
      id: `rule_${this.currentRuleId++}`,
      createdAt: new Date().toISOString(),
      triggerCount: 0,
      ...ruleData
    };

    this.rules.set(rule.id, rule);
    console.log(`[AUTO RESPONDER] Rule added: ${rule.name} (${rule.id})`);
    return rule;
  }

  static processEvent(event: any, fraudSignals?: any[], geoThreats?: any[]): AutoResponse[] {
    const responses: AutoResponse[] = [];
    
    if (!fraudSignals && !geoThreats) {
      return responses;
    }

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const shouldTrigger = this.evaluateRule(rule, event, fraudSignals, geoThreats);
      
      if (shouldTrigger) {
        const response = this.executeRule(rule, event, fraudSignals, geoThreats);
        responses.push(response);
        
        // Update rule trigger count and timestamp
        rule.triggerCount++;
        rule.lastTriggered = new Date().toISOString();
      }
    }

    return responses;
  }

  private static evaluateRule(
    rule: AutoResponseRule,
    event: any,
    fraudSignals?: any[],
    geoThreats?: any[]
  ): boolean {
    const conditions = rule.conditions;
    
    // Check fraud score threshold
    if (conditions.fraudScoreThreshold && fraudSignals) {
      const maxFraudScore = Math.max(...fraudSignals.map(s => s.score), 0);
      if (maxFraudScore < conditions.fraudScoreThreshold) {
        return false;
      }
    }

    // Check risk score threshold
    if (conditions.riskScoreThreshold && geoThreats) {
      const maxRiskScore = Math.max(...geoThreats.map(t => t.riskScore), 0);
      if (maxRiskScore < conditions.riskScoreThreshold) {
        return false;
      }
    }

    // Check fraud types
    if (conditions.fraudTypes && fraudSignals) {
      const hasFraudType = fraudSignals.some(s => 
        conditions.fraudTypes!.includes(s.type)
      );
      if (!hasFraudType) {
        return false;
      }
    }

    // Check countries
    if (conditions.countries && geoThreats) {
      const hasCountry = geoThreats.some(t => 
        conditions.countries!.includes(t.location?.country)
      );
      if (!hasCountry) {
        return false;
      }
    }

    // Check VPN detection
    if (conditions.vpnDetection && geoThreats) {
      const hasVPN = geoThreats.some(t => t.location?.isVPN);
      if (!hasVPN) {
        return false;
      }
    }

    // Check Proxy detection
    if (conditions.proxyDetection && geoThreats) {
      const hasProxy = geoThreats.some(t => t.location?.isProxy);
      if (!hasProxy) {
        return false;
      }
    }

    return true;
  }

  private static executeRule(
    rule: AutoResponseRule,
    event: any,
    fraudSignals?: any[],
    geoThreats?: any[]
  ): AutoResponse {
    const responseId = `response_${this.currentResponseId++}`;
    const actionsExecuted: string[] = [];
    let success = true;
    let message = rule.actions.customMessage || 'Auto-response executed';

    try {
      // Block IP action
      if (rule.actions.blockIP && geoThreats) {
        for (const threat of geoThreats) {
          if (threat.ip) {
            this.blockedIPs.add(threat.ip);
            actionsExecuted.push(`Blocked IP: ${threat.ip}`);
          }
        }
      }

      // Flag merchant action
      if (rule.actions.flagMerchant && event.merchant_id) {
        this.flaggedMerchants.add(event.merchant_id);
        actionsExecuted.push(`Flagged merchant: ${event.merchant_id}`);
      }

      // Send alert action
      if (rule.actions.sendAlert) {
        const alertScore = Math.max(
          ...(fraudSignals?.map(s => s.score) || [0]),
          ...(geoThreats?.map(t => t.riskScore) || [0])
        );

        AlertDispatcher.dispatch({
          type: 'fraud',
          score: alertScore,
          summary: `Auto-responder triggered: ${rule.name}`,
          timestamp: new Date().toISOString(),
          severity: alertScore >= 90 ? 'critical' : alertScore >= 75 ? 'high' : 'medium',
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            responseId,
            actionsExecuted
          }
        });

        actionsExecuted.push('Alert dispatched');
      }

      // Escalate to human action
      if (rule.actions.escalateToHuman) {
        // Log escalation for human review
        console.log(`[AUTO RESPONDER] ESCALATION REQUIRED - Rule: ${rule.name}, Event: ${event.event_id}`);
        actionsExecuted.push('Escalated to human review');
      }

    } catch (error) {
      success = false;
      message = `Auto-response failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[AUTO RESPONDER] Rule execution failed for ${rule.id}:`, error);
    }

    const response: AutoResponse = {
      id: responseId,
      ruleId: rule.id,
      triggeredAt: new Date().toISOString(),
      triggerEvent: event,
      actionsExecuted,
      success,
      message
    };

    this.responses.set(responseId, response);
    
    console.log(`[AUTO RESPONDER] Rule executed: ${rule.name} -> ${actionsExecuted.join(', ')}`);
    return response;
  }

  static getRules(): AutoResponseRule[] {
    return Array.from(this.rules.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getRule(id: string): AutoResponseRule | null {
    return this.rules.get(id) || null;
  }

  static updateRule(id: string, updates: Partial<AutoResponseRule>): AutoResponseRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(id, updatedRule);
    
    console.log(`[AUTO RESPONDER] Rule updated: ${updatedRule.name} (${id})`);
    return updatedRule;
  }

  static deleteRule(id: string): boolean {
    const deleted = this.rules.delete(id);
    if (deleted) {
      console.log(`[AUTO RESPONDER] Rule deleted: ${id}`);
    }
    return deleted;
  }

  static getResponses(): AutoResponse[] {
    return Array.from(this.responses.values()).sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  }

  static getResponsesByRule(ruleId: string): AutoResponse[] {
    return this.getResponses().filter(r => r.ruleId === ruleId);
  }

  static getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  static getFlaggedMerchants(): string[] {
    return Array.from(this.flaggedMerchants);
  }

  static unblockIP(ip: string): boolean {
    const removed = this.blockedIPs.delete(ip);
    if (removed) {
      console.log(`[AUTO RESPONDER] IP unblocked: ${ip}`);
    }
    return removed;
  }

  static unflagMerchant(merchantId: string): boolean {
    const removed = this.flaggedMerchants.delete(merchantId);
    if (removed) {
      console.log(`[AUTO RESPONDER] Merchant unflagged: ${merchantId}`);
    }
    return removed;
  }

  static getStats(): any {
    const rules = Array.from(this.rules.values());
    const responses = Array.from(this.responses.values());
    
    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalResponses: responses.length,
      successfulResponses: responses.filter(r => r.success).length,
      blockedIPs: this.blockedIPs.size,
      flaggedMerchants: this.flaggedMerchants.size,
      mostTriggeredRule: rules.reduce((max, rule) => 
        rule.triggerCount > (max?.triggerCount || 0) ? rule : max, null
      )
    };
  }

  static clearData(): void {
    this.responses.clear();
    this.blockedIPs.clear();
    this.flaggedMerchants.clear();
    console.log('[AUTO RESPONDER] All response data cleared');
  }

  // Integration with fraud detection
  static processWebhookEvent(event: any): void {
    // Get current fraud signals and geo threats
    const fraudSignals = FraudDetectionEngine.list(10);
    const geoThreats = GeoIPService.getThreatMap();
    
    // Process auto-responses
    const responses = this.processEvent(event, fraudSignals, geoThreats);
    
    if (responses.length > 0) {
      console.log(`[AUTO RESPONDER] Processed ${responses.length} auto-responses for event ${event.event_id}`);
    }
  }
}