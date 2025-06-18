interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  type: 'webhook' | 'gift_card_activity' | 'payment' | 'error';
  data: any;
  source: string;
}

class ActivityLogger {
  private logs: Map<string, ActivityLogEntry> = new Map();
  private currentId = 1;

  log(type: ActivityLogEntry['type'], data: any, source: string = 'system'): string {
    const id = `log_${this.currentId++}`;
    const entry: ActivityLogEntry = {
      id,
      timestamp: new Date(),
      type,
      data,
      source,
    };
    
    this.logs.set(id, entry);
    console.log(`[ACTIVITY LOG] ${type.toUpperCase()}: ${JSON.stringify(data)}`);
    
    return id;
  }

  getRecentLogs(limit: number = 50): ActivityLogEntry[] {
    return Array.from(this.logs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getLogsByType(type: ActivityLogEntry['type']): ActivityLogEntry[] {
    return Array.from(this.logs.values())
      .filter(log => log.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clearLogs(): void {
    this.logs.clear();
    this.currentId = 1;
  }
}

export const activityLogger = new ActivityLogger();