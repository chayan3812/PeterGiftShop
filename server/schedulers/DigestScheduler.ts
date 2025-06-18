import { AIDigestEngine } from '../services/AIDigestEngine';

interface ScheduleConfig {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  dailyTime: string; // HH:MM format
  weeklyDay: number; // 0-6, 0 = Sunday
  weeklyTime: string; // HH:MM format
}

export class DigestScheduler {
  private static config: ScheduleConfig = {
    dailyEnabled: true,
    weeklyEnabled: true,
    dailyTime: '09:00',
    weeklyDay: 1, // Monday
    weeklyTime: '09:00'
  };

  private static dailyInterval: NodeJS.Timeout | null = null;
  private static weeklyInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static start(): void {
    if (this.isRunning) {
      console.log('[DIGEST SCHEDULER] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[DIGEST SCHEDULER] Starting scheduler...');

    // Schedule daily digest
    if (this.config.dailyEnabled) {
      this.scheduleDailyDigest();
    }

    // Schedule weekly digest
    if (this.config.weeklyEnabled) {
      this.scheduleWeeklyDigest();
    }

    console.log('[DIGEST SCHEDULER] Scheduler started successfully');
  }

  static stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
      this.dailyInterval = null;
    }

    if (this.weeklyInterval) {
      clearInterval(this.weeklyInterval);
      this.weeklyInterval = null;
    }

    this.isRunning = false;
    console.log('[DIGEST SCHEDULER] Scheduler stopped');
  }

  private static scheduleDailyDigest(): void {
    // Check every minute if it's time for daily digest
    this.dailyInterval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime === this.config.dailyTime) {
        this.triggerDailyDigest();
      }
    }, 60000); // Check every minute

    console.log(`[DIGEST SCHEDULER] Daily digest scheduled for ${this.config.dailyTime}`);
  }

  private static scheduleWeeklyDigest(): void {
    // Check every hour if it's time for weekly digest
    this.weeklyInterval = setInterval(() => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentDay === this.config.weeklyDay && currentTime === this.config.weeklyTime) {
        this.triggerWeeklyDigest();
      }
    }, 3600000); // Check every hour

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`[DIGEST SCHEDULER] Weekly digest scheduled for ${dayNames[this.config.weeklyDay]} at ${this.config.weeklyTime}`);
  }

  private static async triggerDailyDigest(): Promise<void> {
    try {
      console.log('[DIGEST SCHEDULER] Triggering daily digest generation...');
      const digest = await AIDigestEngine.generateDigest('daily');
      console.log(`[DIGEST SCHEDULER] Daily digest generated successfully: ${digest.id}`);
    } catch (error) {
      console.error('[DIGEST SCHEDULER] Failed to generate daily digest:', error);
    }
  }

  private static async triggerWeeklyDigest(): Promise<void> {
    try {
      console.log('[DIGEST SCHEDULER] Triggering weekly digest generation...');
      const digest = await AIDigestEngine.generateDigest('weekly');
      console.log(`[DIGEST SCHEDULER] Weekly digest generated successfully: ${digest.id}`);
    } catch (error) {
      console.error('[DIGEST SCHEDULER] Failed to generate weekly digest:', error);
    }
  }

  static updateConfig(newConfig: Partial<ScheduleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart scheduler with new config
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    
    console.log('[DIGEST SCHEDULER] Configuration updated:', this.config);
  }

  static getConfig(): ScheduleConfig {
    return { ...this.config };
  }

  static getStatus(): {
    isRunning: boolean;
    config: ScheduleConfig;
    nextDaily: string | null;
    nextWeekly: string | null;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextDaily: this.calculateNextDaily(),
      nextWeekly: this.calculateNextWeekly()
    };
  }

  private static calculateNextDaily(): string | null {
    if (!this.config.dailyEnabled) return null;

    const now = new Date();
    const [hours, minutes] = this.config.dailyTime.split(':').map(Number);
    
    const nextDaily = new Date(now);
    nextDaily.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (nextDaily <= now) {
      nextDaily.setDate(nextDaily.getDate() + 1);
    }
    
    return nextDaily.toISOString();
  }

  private static calculateNextWeekly(): string | null {
    if (!this.config.weeklyEnabled) return null;

    const now = new Date();
    const [hours, minutes] = this.config.weeklyTime.split(':').map(Number);
    
    const nextWeekly = new Date(now);
    const daysUntilTarget = (this.config.weeklyDay - now.getDay() + 7) % 7;
    
    nextWeekly.setDate(nextWeekly.getDate() + daysUntilTarget);
    nextWeekly.setHours(hours, minutes, 0, 0);
    
    // If it's the same day but time has passed, schedule for next week
    if (daysUntilTarget === 0 && nextWeekly <= now) {
      nextWeekly.setDate(nextWeekly.getDate() + 7);
    }
    
    return nextWeekly.toISOString();
  }

  // Manual trigger methods for testing
  static async triggerDailyNow(): Promise<any> {
    console.log('[DIGEST SCHEDULER] Manual daily digest trigger...');
    return await this.triggerDailyDigest();
  }

  static async triggerWeeklyNow(): Promise<any> {
    console.log('[DIGEST SCHEDULER] Manual weekly digest trigger...');
    return await this.triggerWeeklyDigest();
  }
}