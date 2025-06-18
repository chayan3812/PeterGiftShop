import { WebhookLogStore, WebhookLogEntry } from '../db/webhook-log';

export const WebhookLogService = {
  async logEvent(payload: any) {
    const entry: WebhookLogEntry = {
      id: Date.now().toString(),
      type: payload?.type || "unknown",
      created_at: new Date().toISOString(),
      raw: payload,
    };
    WebhookLogStore.push(entry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (WebhookLogStore.length > 1000) {
      WebhookLogStore.splice(0, WebhookLogStore.length - 1000);
    }
    
    return entry;
  },

  async list(limit = 20) {
    return WebhookLogStore.slice(-limit).reverse();
  },

  async stats() {
    const log = WebhookLogStore;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = log.filter(entry => new Date(entry.created_at) > oneHourAgo);
    const dailyEvents = log.filter(entry => new Date(entry.created_at) > oneDayAgo);
    
    return {
      total: log.length,
      lastHour: recentEvents.length,
      last24Hours: dailyEvents.length,
      byType: log.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentActivity: recentEvents.slice(-5).map(entry => ({
        type: entry.type,
        timestamp: entry.created_at,
        summary: this.summarizeEvent(entry.raw)
      }))
    };
  },

  summarizeEvent(payload: any): string {
    switch (payload?.type) {
      case 'gift_card.created':
        return `Gift card created: ${payload?.data?.object?.id?.slice(0, 8)}...`;
      case 'gift_card.updated':
        return `Gift card updated: ${payload?.data?.object?.id?.slice(0, 8)}...`;
      case 'gift_card_activity.created':
        const activity = payload?.data?.object;
        return `Activity: ${activity?.type} - ${activity?.id?.slice(0, 8)}...`;
      default:
        return 'Unknown event';
    }
  }
};