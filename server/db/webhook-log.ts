export interface WebhookLogEntry {
  id: string;
  type: string;
  created_at: string;
  raw: any;
}

export const WebhookLogStore: WebhookLogEntry[] = [];