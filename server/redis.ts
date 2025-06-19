import Redis from 'ioredis';
import { EnvironmentService } from './services/EnvironmentService.js';

/**
 * Redis Configuration and Connection Management
 * Implements distributed caching, session storage, and rate limiting
 */

export class RedisConfig {
  private static instance: Redis | null = null;
  private static isConnected = false;

  /**
   * Initialize Redis connection with configuration
   */
  static async initialize(): Promise<Redis | null> {
    const config = EnvironmentService.getConfig();
    
    if (!config.redis.url) {
      console.log('[REDIS] No Redis URL configured, using in-memory fallback');
      return null;
    }

    try {
      // Redis connection options from cheat sheet
      const redisOptions = {
        host: config.redis.host || 'localhost',
        port: config.redis.port || 6379,
        password: config.redis.password,
        db: config.redis.database || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Connection pool settings
        family: 4,
        keepAlive: true,
        // Timeouts
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Reconnection settings
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false
      };

      this.instance = new Redis(config.redis.url, redisOptions);

      // Event handlers
      this.instance.on('connect', () => {
        console.log('[REDIS] Connected successfully');
        this.isConnected = true;
      });

      this.instance.on('error', (err) => {
        console.error('[REDIS] Connection error:', err.message);
        this.isConnected = false;
      });

      this.instance.on('close', () => {
        console.log('[REDIS] Connection closed');
        this.isConnected = false;
      });

      this.instance.on('reconnecting', () => {
        console.log('[REDIS] Reconnecting...');
      });

      // Test connection
      await this.instance.ping();
      console.log('[REDIS] Initialized with distributed caching enabled');
      
      return this.instance;
    } catch (error) {
      console.error('[REDIS] Initialization failed:', error.message);
      this.instance = null;
      return null;
    }
  }

  /**
   * Get Redis instance
   */
  static getInstance(): Redis | null {
    return this.instance;
  }

  /**
   * Check if Redis is connected
   */
  static isRedisConnected(): boolean {
    return this.isConnected && this.instance !== null;
  }

  /**
   * Distributed cache operations
   */
  static async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.instance) return false;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.instance.setex(key, ttl, serialized);
      } else {
        await this.instance.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('[REDIS] Set error:', error.message);
      return false;
    }
  }

  static async get(key: string): Promise<any | null> {
    if (!this.instance) return null;
    
    try {
      const value = await this.instance.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('[REDIS] Get error:', error.message);
      return null;
    }
  }

  static async del(key: string): Promise<boolean> {
    if (!this.instance) return false;
    
    try {
      await this.instance.del(key);
      return true;
    } catch (error) {
      console.error('[REDIS] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Rate limiting with sliding window
   */
  static async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.instance) return { allowed: true, remaining: limit };
    
    try {
      const now = Date.now();
      const pipeline = this.instance.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, now - window * 1000);
      // Count current requests
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      // Set expiry
      pipeline.expire(key, window);
      
      const results = await pipeline.exec();
      const count = results?.[1]?.[1] as number || 0;
      
      return {
        allowed: count < limit,
        remaining: Math.max(0, limit - count - 1)
      };
    } catch (error) {
      console.error('[REDIS] Rate limit error:', error.message);
      return { allowed: true, remaining: limit };
    }
  }

  /**
   * Session management
   */
  static async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, ttl);
  }

  static async getSession(sessionId: string): Promise<any | null> {
    return this.get(`session:${sessionId}`);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  /**
   * JWT token blacklist
   */
  static async blacklistToken(token: string, ttl: number): Promise<boolean> {
    return this.set(`blacklist:${token}`, true, ttl);
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.get(`blacklist:${token}`);
    return result === true;
  }

  /**
   * Metrics and analytics
   */
  static async incrementMetric(key: string, amount: number = 1): Promise<number> {
    if (!this.instance) return 0;
    
    try {
      return await this.instance.incrby(key, amount);
    } catch (error) {
      console.error('[REDIS] Increment error:', error.message);
      return 0;
    }
  }

  static async getMetric(key: string): Promise<number> {
    if (!this.instance) return 0;
    
    try {
      const value = await this.instance.get(key);
      return parseInt(value || '0', 10);
    } catch (error) {
      console.error('[REDIS] Get metric error:', error.message);
      return 0;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    if (!this.instance) {
      return { status: 'disconnected', error: 'Redis not configured' };
    }

    try {
      const start = Date.now();
      await this.instance.ping();
      const latency = Date.now() - start;
      
      return { status: 'connected', latency };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
      console.log('[REDIS] Connection closed');
    }
  }
}

export default RedisConfig;