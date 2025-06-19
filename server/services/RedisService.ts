/**
 * Redis Service for Peter Digital Enterprise Security Platform
 * Provides caching, session management, and distributed data storage
 */

import Redis from 'ioredis';

type RedisClient = Redis;

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean;
}

interface SessionData {
  userId: string;
  role: string;
  permissions: string[];
  createdAt: string;
  lastActivity: string;
}

export class RedisService {
  private static client: RedisClient | null = null;
  private static isConnected = false;
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly SESSION_TTL = 86400; // 24 hours

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      this.client.on('connect', () => {
        console.log('[REDIS] Connected to Redis server');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        console.error('[REDIS] Connection error:', error.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('[REDIS] Connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('[REDIS] Initialization failed:', error);
      this.client = null;
    }
  }

  /**
   * Check if Redis is available
   */
  static isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  /**
   * Set cache value with optional TTL
   */
  static async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const serializedValue = JSON.stringify(value);
      const ttl = options.ttl || this.DEFAULT_TTL;
      
      await this.client!.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('[REDIS] Set error:', error);
      return false;
    }
  }

  /**
   * Get cache value
   */
  static async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client!.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('[REDIS] Get error:', error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  static async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.del(key);
      return result > 0;
    } catch (error) {
      console.error('[REDIS] Delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      console.error('[REDIS] Exists check error:', error);
      return false;
    }
  }

  /**
   * Set expiration for a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('[REDIS] Expire error:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  static async increment(key: string, amount: number = 1): Promise<number | null> {
    if (!this.isAvailable()) return null;

    try {
      const result = await this.client!.incrby(key, amount);
      return result;
    } catch (error) {
      console.error('[REDIS] Increment error:', error);
      return null;
    }
  }

  /**
   * Session Management
   */
  static async setSession(sessionId: string, data: SessionData): Promise<boolean> {
    const key = `session:${sessionId}`;
    return await this.set(key, data, { ttl: this.SESSION_TTL });
  }

  static async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `session:${sessionId}`;
    return await this.get<SessionData>(key);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    return await this.delete(key);
  }

  /**
   * Rate Limiting
   */
  static async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.isAvailable()) {
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
    }

    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    try {
      // Use a sliding window approach with sorted sets
      const pipeline = this.client!.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, windowSeconds);
      
      const results = await pipeline.exec();
      const currentCount = results![1][1] as number;
      
      const allowed = currentCount < limit;
      const remaining = Math.max(0, limit - currentCount - 1);
      const resetTime = now + windowSeconds * 1000;
      
      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error('[REDIS] Rate limit check error:', error);
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  /**
   * JWT Token Blacklist Management
   */
  static async blacklistToken(jti: string, expirationTime: number): Promise<boolean> {
    const key = `blacklist:${jti}`;
    const ttl = Math.max(1, Math.floor((expirationTime - Date.now()) / 1000));
    return await this.set(key, true, { ttl });
  }

  static async isTokenBlacklisted(jti: string): Promise<boolean> {
    const key = `blacklist:${jti}`;
    return await this.exists(key);
  }

  /**
   * Cache API responses
   */
  static async cacheAPIResponse(endpoint: string, method: string, params: any, response: any, ttl: number = 300): Promise<boolean> {
    const key = `api_cache:${method}:${endpoint}:${JSON.stringify(params).substring(0, 100)}`;
    return await this.set(key, response, { ttl });
  }

  static async getCachedAPIResponse(endpoint: string, method: string, params: any): Promise<any> {
    const key = `api_cache:${method}:${endpoint}:${JSON.stringify(params).substring(0, 100)}`;
    return await this.get(key);
  }

  /**
   * Analytics and Metrics
   */
  static async trackMetric(metricName: string, value: number = 1): Promise<void> {
    if (!this.isAvailable()) return;

    const dailyKey = `metrics:daily:${metricName}:${new Date().toISOString().split('T')[0]}`;
    const hourlyKey = `metrics:hourly:${metricName}:${new Date().toISOString().substring(0, 13)}`;
    
    try {
      const pipeline = this.client!.pipeline();
      pipeline.incrby(dailyKey, value);
      pipeline.expire(dailyKey, 86400 * 7); // Keep for 7 days
      pipeline.incrby(hourlyKey, value);
      pipeline.expire(hourlyKey, 3600 * 24); // Keep for 24 hours
      await pipeline.exec();
    } catch (error) {
      console.error('[REDIS] Metric tracking error:', error);
    }
  }

  static async getMetrics(metricName: string, type: 'daily' | 'hourly', days: number = 7): Promise<Record<string, number>> {
    if (!this.isAvailable()) return {};

    const metrics: Record<string, number> = {};
    const now = new Date();
    
    try {
      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        let key: string;
        
        if (type === 'daily') {
          key = `metrics:daily:${metricName}:${date.toISOString().split('T')[0]}`;
        } else {
          key = `metrics:hourly:${metricName}:${date.toISOString().substring(0, 13)}`;
        }
        
        const value = await this.client!.get(key);
        metrics[key] = value ? parseInt(value) : 0;
      }
      
      return metrics;
    } catch (error) {
      console.error('[REDIS] Get metrics error:', error);
      return {};
    }
  }

  /**
   * Distributed Lock
   */
  static async acquireLock(lockKey: string, ttl: number = 30): Promise<string | null> {
    if (!this.isAvailable()) return null;

    const lockValue = `${Date.now()}-${Math.random()}`;
    const key = `lock:${lockKey}`;

    try {
      const result = await this.client!.set(key, lockValue, 'EX', ttl, 'NX');
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      console.error('[REDIS] Acquire lock error:', error);
      return null;
    }
  }

  static async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const key = `lock:${lockKey}`;
    
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.client!.eval(script, 1, key, lockValue);
      return result === 1;
    } catch (error) {
      console.error('[REDIS] Release lock error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; latency: number; memory: any }> {
    if (!this.isAvailable()) {
      return { status: 'disconnected', latency: -1, memory: null };
    }

    try {
      const start = Date.now();
      await this.client!.ping();
      const latency = Date.now() - start;
      
      const info = await this.client!.info('memory');
      const memory = this.parseRedisInfo(info);
      
      return { status: 'connected', latency, memory };
    } catch (error) {
      console.error('[REDIS] Health check error:', error);
      return { status: 'error', latency: -1, memory: null };
    }
  }

  /**
   * Parse Redis INFO response
   */
  private static parseRedisInfo(info: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = value;
      }
    }
    
    return parsed;
  }

  /**
   * Cleanup and close connection
   */
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('[REDIS] Connection closed');
    }
  }
}