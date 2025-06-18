import { promises as fs } from 'fs';
import { join } from 'path';

interface PhaseLogEntry {
  phase: string;
  action: string;
  timestamp: Date;
  result: string;
  codeSnippet?: string;
  metadata?: any;
}

export class DocsUpdater {
  private static readonly DOCS_PATH = join(process.cwd(), 'docs', 'fraud-engine-docs.md');

  static async logPhase(entry: PhaseLogEntry): Promise<void> {
    try {
      const logEntry = this.formatLogEntry(entry);
      await this.appendToDocsFile(logEntry);
      console.log(`[DOCS UPDATER] Phase logged: ${entry.phase} - ${entry.action}`);
    } catch (error) {
      console.error('[DOCS UPDATER] Failed to log phase:', error);
    }
  }

  private static formatLogEntry(entry: PhaseLogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const formattedTimestamp = new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    let logText = `\n---\n\n## ${entry.phase} Update Log\n`;
    logText += `**Timestamp:** ${formattedTimestamp}\n`;
    logText += `**Action:** ${entry.action}\n`;
    logText += `**Result:** ${entry.result}\n`;

    if (entry.codeSnippet) {
      logText += `\n**Code Implementation:**\n\`\`\`typescript\n${entry.codeSnippet}\n\`\`\`\n`;
    }

    if (entry.metadata) {
      logText += `\n**Metadata:**\n\`\`\`json\n${JSON.stringify(entry.metadata, null, 2)}\n\`\`\`\n`;
    }

    return logText;
  }

  private static async appendToDocsFile(content: string): Promise<void> {
    try {
      await fs.appendFile(this.DOCS_PATH, content, 'utf8');
    } catch (error) {
      console.error('[DOCS UPDATER] Failed to append to docs file:', error);
      throw error;
    }
  }

  static async logFraudDetection(signalType: string, score: number, details: any): Promise<void> {
    await this.logPhase({
      phase: 'Phase 4: Fraud Detection',
      action: `${signalType} fraud signal detected`,
      timestamp: new Date(),
      result: `Score: ${score}/100 - Alert severity: ${score >= 90 ? 'critical' : score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'}`,
      metadata: {
        signalType,
        score,
        details: details,
        alertThreshold: score >= 85 ? 'triggered' : 'not triggered'
      }
    });
  }

  static async logGeoThreat(country: string, ip: string, riskScore: number, threatType: string): Promise<void> {
    await this.logPhase({
      phase: 'Phase 4.5: Geo-Threat Detection',
      action: `Geo-threat detected from ${country}`,
      timestamp: new Date(),
      result: `IP: ${ip}, Risk Score: ${riskScore}/100, Type: ${threatType}`,
      metadata: {
        country,
        ip,
        riskScore,
        threatType,
        severity: riskScore >= 90 ? 'critical' : riskScore >= 75 ? 'high' : 'medium'
      }
    });
  }

  static async logAlert(alertId: string, type: string, score: number, summary: string): Promise<void> {
    await this.logPhase({
      phase: 'Phase 5: Alerting System',
      action: `${type} alert dispatched`,
      timestamp: new Date(),
      result: `Alert ID: ${alertId}, Score: ${score}/100, Summary: ${summary}`,
      codeSnippet: `AlertDispatcher.dispatch({ type: '${type}', score: ${score}, summary: '${summary}' })`,
      metadata: {
        alertId,
        type,
        score,
        summary,
        channels: ['console', 'slack', 'email']
      }
    });
  }

  static async logSystemEvent(phase: string, event: string, data: any): Promise<void> {
    await this.logPhase({
      phase,
      action: event,
      timestamp: new Date(),
      result: 'System event processed successfully',
      metadata: data
    });
  }

  static async getDocumentationStats(): Promise<any> {
    try {
      const content = await fs.readFile(this.DOCS_PATH, 'utf8');
      const lines = content.split('\n');
      const phaseCount = (content.match(/## Phase \d/g) || []).length;
      const updateLogCount = (content.match(/## Phase .* Update Log/g) || []).length;
      
      return {
        totalLines: lines.length,
        phaseCount,
        updateLogCount,
        lastModified: new Date().toISOString(),
        fileSize: Buffer.byteLength(content, 'utf8')
      };
    } catch (error) {
      console.error('[DOCS UPDATER] Failed to get documentation stats:', error);
      return null;
    }
  }

  static async clearUpdateLogs(): Promise<void> {
    try {
      const content = await fs.readFile(this.DOCS_PATH, 'utf8');
      // Remove all update log sections
      const cleanedContent = content.replace(/\n---\n\n## Phase .* Update Log[\s\S]*?(?=\n---|\n## |$)/g, '');
      await fs.writeFile(this.DOCS_PATH, cleanedContent, 'utf8');
      console.log('[DOCS UPDATER] Update logs cleared successfully');
    } catch (error) {
      console.error('[DOCS UPDATER] Failed to clear update logs:', error);
      throw error;
    }
  }
}

export default DocsUpdater;