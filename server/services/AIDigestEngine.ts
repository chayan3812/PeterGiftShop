import { FraudDetectionEngine } from './FraudDetectionEngine';
import { GeoIPService } from './GeoIPService';
import { AlertDispatcher } from './AlertDispatcher';

interface DigestData {
  fraudStats: any;
  threatStats: any;
  topPatterns: string[];
  highRiskIPs: string[];
  riskTrends: any[];
  actionableInsights: string[];
}

interface DigestReport {
  id: string;
  title: string;
  period: 'daily' | 'weekly';
  generatedAt: string;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  rawData: DigestData;
  aiGenerated: boolean;
}

export class AIDigestEngine {
  private static digests: Map<string, DigestReport> = new Map();
  private static currentId = 1;

  static async generateDigest(period: 'daily' | 'weekly' = 'daily'): Promise<DigestReport> {
    const digestId = `digest_${Date.now()}_${this.currentId++}`;
    const generatedAt = new Date().toISOString();
    
    // Collect fraud and threat data
    const fraudStats = FraudDetectionEngine.getStats();
    const threatStats = GeoIPService.getThreatStats();
    const threatMap = GeoIPService.getThreatMap();
    
    // Extract actionable insights
    const digestData: DigestData = {
      fraudStats,
      threatStats,
      topPatterns: this.extractTopPatterns(fraudStats),
      highRiskIPs: this.extractHighRiskIPs(threatMap),
      riskTrends: this.calculateRiskTrends(),
      actionableInsights: this.generateActionableInsights(fraudStats, threatStats)
    };

    // Generate AI summary
    const aiSummary = await this.generateAISummary(digestData, period);
    
    const report: DigestReport = {
      id: digestId,
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} Fraud & Security Digest`,
      period,
      generatedAt,
      summary: aiSummary.summary,
      keyFindings: aiSummary.keyFindings,
      recommendations: aiSummary.recommendations,
      rawData: digestData,
      aiGenerated: true
    };

    // Store the digest
    this.digests.set(digestId, report);
    
    // Log to docs
    await this.appendToDigestFile(report);
    
    // Dispatch digest notification
    await AlertDispatcher.dispatch({
      type: 'fraud',
      score: 50,
      summary: `${period} fraud digest generated with ${aiSummary.keyFindings.length} key findings`,
      timestamp: generatedAt,
      severity: 'medium',
      metadata: {
        digestId,
        period,
        totalThreats: threatStats.total,
        totalFraud: fraudStats.total
      }
    });

    console.log(`[AI DIGEST] Generated ${period} digest: ${digestId}`);
    return report;
  }

  private static extractTopPatterns(fraudStats: any): string[] {
    const patterns: string[] = [];
    
    if (fraudStats.byType) {
      Object.entries(fraudStats.byType).forEach(([type, count]) => {
        if (count > 0) {
          patterns.push(`${type}: ${count} incidents`);
        }
      });
    }
    
    return patterns.slice(0, 5); // Top 5 patterns
  }

  private static extractHighRiskIPs(threatMap: any[]): string[] {
    return threatMap
      .filter(threat => threat.riskScore >= 85)
      .map(threat => threat.ip)
      .slice(0, 10); // Top 10 high-risk IPs
  }

  private static calculateRiskTrends(): any[] {
    // Generate simulated trend data for the last 7 days
    const trends = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        avgRiskScore: Math.floor(Math.random() * 40 + 60),
        totalThreats: Math.floor(Math.random() * 20 + 5),
        criticalAlerts: Math.floor(Math.random() * 5)
      });
    }
    
    return trends;
  }

  private static generateActionableInsights(fraudStats: any, threatStats: any): string[] {
    const insights: string[] = [];
    
    if (fraudStats.total > 10) {
      insights.push('High fraud activity detected - consider implementing additional verification steps');
    }
    
    if (threatStats.vpnCount > 5) {
      insights.push('Significant VPN usage detected - review geographic access policies');
    }
    
    if (fraudStats.bySeverity?.critical > 0) {
      insights.push('Critical fraud alerts triggered - immediate investigation recommended');
    }
    
    if (Object.keys(threatStats.byCountry || {}).length > 5) {
      insights.push('Threats from multiple countries - consider geo-blocking high-risk regions');
    }
    
    return insights;
  }

  private static async generateAISummary(data: DigestData, period: string): Promise<{
    summary: string;
    keyFindings: string[];
    recommendations: string[];
  }> {
    // AI-powered summary generation (simulated for now, can be replaced with OpenAI API)
    const totalEvents = data.fraudStats.total + data.threatStats.total;
    const avgRiskScore = data.fraudStats.avgScore || 0;
    const criticalCount = data.fraudStats.bySeverity?.critical || 0;
    
    const summary = `During the ${period} period, our fraud detection systems processed ${totalEvents} security events with an average risk score of ${avgRiskScore}. ${criticalCount > 0 ? `${criticalCount} critical alerts were triggered requiring immediate attention.` : 'No critical threats were detected.'} The system identified ${data.topPatterns.length} distinct attack patterns across ${Object.keys(data.threatStats.byCountry || {}).length} geographic regions.`;

    const keyFindings: string[] = [
      `Total security events: ${totalEvents}`,
      `Average risk score: ${avgRiskScore}/100`,
      `High-risk IP addresses identified: ${data.highRiskIPs.length}`,
      `Geographic threat sources: ${Object.keys(data.threatStats.byCountry || {}).length} countries`,
      `VPN/Proxy connections: ${data.threatStats.vpnCount + data.threatStats.proxyCount}`
    ];

    const recommendations: string[] = [
      'Continue monitoring high-risk IP addresses for recurring patterns',
      'Review and update geographic access policies based on threat distribution',
      'Implement additional verification for transactions exceeding $500',
      'Consider rate limiting for high-frequency transaction patterns'
    ];

    if (criticalCount > 0) {
      recommendations.unshift('Immediate investigation required for critical fraud alerts');
    }

    if (data.threatStats.vpnCount > 10) {
      recommendations.push('Consider implementing VPN detection and blocking policies');
    }

    return { summary, keyFindings, recommendations };
  }

  private static async appendToDigestFile(report: DigestReport): Promise<void> {
    try {
      const digestContent = this.formatDigestForFile(report);
      
      // Append to digest file (will be created if it doesn't exist)
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const digestPath = path.join(process.cwd(), 'docs', 'fraud-digests.md');
      
      try {
        await fs.appendFile(digestPath, digestContent, 'utf8');
      } catch (error) {
        // Create file if it doesn't exist
        const header = '# Enterprise Fraud Detection - AI Digest Reports\n\n';
        await fs.writeFile(digestPath, header + digestContent, 'utf8');
      }
      
      console.log(`[AI DIGEST] Appended digest to docs/fraud-digests.md`);
    } catch (error) {
      console.error('[AI DIGEST] Failed to append to digest file:', error);
    }
  }

  private static formatDigestForFile(report: DigestReport): string {
    const timestamp = new Date(report.generatedAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
---

## ${report.title}
**Generated:** ${timestamp}  
**Period:** ${report.period}  
**Report ID:** ${report.id}

### Executive Summary
${report.summary}

### Key Findings
${report.keyFindings.map(finding => `- ${finding}`).join('\n')}

### Security Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

### Top Attack Patterns
${report.rawData.topPatterns.map(pattern => `- ${pattern}`).join('\n')}

### High-Risk IP Addresses
${report.rawData.highRiskIPs.length > 0 ? report.rawData.highRiskIPs.map(ip => `- ${ip}`).join('\n') : '- No high-risk IPs detected'}

### Risk Trend Analysis
${report.rawData.riskTrends.map(trend => `- ${trend.date}: Avg Risk ${trend.avgRiskScore}, Threats ${trend.totalThreats}, Critical ${trend.criticalAlerts}`).join('\n')}

### Actionable Insights
${report.rawData.actionableInsights.map(insight => `- ${insight}`).join('\n')}

---

`;
  }

  static getLatestDigest(): DigestReport | null {
    const digests = Array.from(this.digests.values());
    return digests.length > 0 ? digests[digests.length - 1] : null;
  }

  static getAllDigests(): DigestReport[] {
    return Array.from(this.digests.values()).sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  static getDigestById(id: string): DigestReport | null {
    return this.digests.get(id) || null;
  }

  static getDigestStats(): any {
    const digests = Array.from(this.digests.values());
    return {
      total: digests.length,
      daily: digests.filter(d => d.period === 'daily').length,
      weekly: digests.filter(d => d.period === 'weekly').length,
      lastGenerated: digests.length > 0 ? digests[digests.length - 1].generatedAt : null
    };
  }

  static clearDigests(): void {
    this.digests.clear();
    console.log('[AI DIGEST] All digests cleared');
  }
}