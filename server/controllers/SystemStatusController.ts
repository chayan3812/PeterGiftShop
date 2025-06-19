/**
 * System Status Controller for Peter Digital Enterprise Security Platform
 * Provides comprehensive system health monitoring and infrastructure status
 */

import { Request, Response } from 'express';
import { EnvironmentService } from '../services/EnvironmentService';
import { RedisService } from '../services/RedisService';
import { TaskSchedulerService } from '../services/TaskSchedulerService';
import { HttpStatusManager } from '../utils/HttpStatusManager';

export class SystemStatusController {
  /**
   * Get comprehensive system health status
   * GET /api/system/health
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const envHealth = EnvironmentService.getHealthStatus();
      const services = EnvironmentService.getServiceStatus();
      
      // Check Redis health if available
      let redisHealth = null;
      if (RedisService.isAvailable()) {
        redisHealth = await RedisService.healthCheck();
      }

      // Get task scheduler statistics
      const schedulerStats = TaskSchedulerService.getStatistics();

      // Calculate overall system health score
      const healthScore = SystemStatusController.calculateHealthScore(envHealth, services, redisHealth);

      const systemHealth = {
        overall: {
          status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'degraded' : 'unhealthy',
          score: healthScore,
          timestamp: new Date().toISOString()
        },
        environment: {
          mode: envHealth.environment,
          isProduction: envHealth.isProduction,
          securityLevel: envHealth.securityLevel,
          configuredServices: envHealth.configuredServices,
          totalServices: envHealth.totalServices,
          validationErrors: envHealth.validationErrors
        },
        services: {
          redis: redisHealth ? {
            status: redisHealth.status,
            latency: redisHealth.latency,
            memory: redisHealth.memory
          } : { status: 'not_configured' },
          scheduler: {
            status: 'operational',
            totalTasks: schedulerStats.totalTasks,
            runningTasks: schedulerStats.runningTasks,
            totalExecutions: schedulerStats.totalExecutions,
            successRate: schedulerStats.totalExecutions > 0 
              ? ((schedulerStats.successfulExecutions / schedulerStats.totalExecutions) * 100).toFixed(1)
              : '100.0'
          },
          integrations: services
        },
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      };

      res.json(HttpStatusManager.success(systemHealth, 'System health retrieved successfully'));
    } catch (error) {
      console.error('[SYSTEM] Health check error:', error);
      res.status(500).json(
        HttpStatusManager.internalError('Failed to retrieve system health', error)
      );
    }
  }

  /**
   * Get detailed service configuration status
   * GET /api/system/services
   */
  static async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const services = EnvironmentService.getServiceStatus();
      const detailedStatus = {};

      for (const [serviceName, serviceInfo] of Object.entries(services)) {
        detailedStatus[serviceName] = {
          configured: serviceInfo.configured,
          requirements: serviceInfo.requirements,
          status: serviceInfo.configured ? 'available' : 'requires_configuration',
          priority: SystemStatusController.getServicePriority(serviceName)
        };
      }

      res.json(HttpStatusManager.success(detailedStatus, 'Service status retrieved successfully'));
    } catch (error) {
      console.error('[SYSTEM] Service status error:', error);
      res.status(500).json(
        HttpStatusManager.internalError('Failed to retrieve service status', error)
      );
    }
  }

  /**
   * Get task scheduler status and task list
   * GET /api/system/scheduler
   */
  static async getSchedulerStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = TaskSchedulerService.getStatistics();
      const tasks = TaskSchedulerService.getAllTasks();
      const recentExecutions = TaskSchedulerService.getTaskExecutions().slice(-10);

      const schedulerStatus = {
        statistics: stats,
        tasks: tasks.map(task => ({
          id: task.id,
          name: task.name,
          schedule: task.schedule,
          enabled: task.enabled,
          lastRun: task.lastRun,
          nextRun: task.nextRun,
          runCount: task.runCount,
          errorCount: task.errorCount,
          description: task.description
        })),
        recentExecutions: recentExecutions.map(exec => ({
          taskId: exec.taskId,
          startTime: exec.startTime,
          endTime: exec.endTime,
          duration: exec.duration,
          status: exec.status,
          error: exec.error
        }))
      };

      res.json(HttpStatusManager.success(schedulerStatus, 'Scheduler status retrieved successfully'));
    } catch (error) {
      console.error('[SYSTEM] Scheduler status error:', error);
      res.status(500).json(
        HttpStatusManager.internalError('Failed to retrieve scheduler status', error)
      );
    }
  }

  /**
   * Get environment configuration (masked sensitive values)
   * GET /api/system/environment
   */
  static async getEnvironmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const maskedConfig = EnvironmentService.getMaskedConfig();
      const health = EnvironmentService.getHealthStatus();

      const envStatus = {
        configuration: maskedConfig,
        health: health,
        validation: {
          isValid: health.validationErrors.length === 0,
          errors: health.validationErrors
        },
        recommendations: SystemStatusController.generateRecommendations(health)
      };

      res.json(HttpStatusManager.success(envStatus, 'Environment status retrieved successfully'));
    } catch (error) {
      console.error('[SYSTEM] Environment status error:', error);
      res.status(500).json(
        HttpStatusManager.internalError('Failed to retrieve environment status', error)
      );
    }
  }

  /**
   * Get Redis cache statistics and health
   * GET /api/system/redis
   */
  static async getRedisStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!RedisService.isAvailable()) {
        res.json(HttpStatusManager.success({
          status: 'not_configured',
          message: 'Redis not configured or unavailable'
        }));
        return;
      }

      const health = await RedisService.healthCheck();
      const metrics = await RedisService.getMetrics('system_health', 'hourly', 24);

      const redisStatus = {
        health,
        metrics,
        configuration: {
          url: EnvironmentService.get('REDIS_URL') ? 'configured' : 'not_set'
        }
      };

      res.json(HttpStatusManager.success(redisStatus, 'Redis status retrieved successfully'));
    } catch (error) {
      console.error('[SYSTEM] Redis status error:', error);
      res.status(500).json(
        HttpStatusManager.internalError('Failed to retrieve Redis status', error)
      );
    }
  }

  /**
   * Get system metrics and analytics
   * GET /api/system/metrics
   */
  static async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = {
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          nodeVersion: process.version,
          platform: process.platform
        },
        environment: EnvironmentService.getHealthStatus(),
        scheduler: TaskSchedulerService.getStatistics()
      };

      // Add Redis metrics if available
      if (RedisService.isAvailable()) {
        const redisMetrics = await RedisService.getMetrics('api_requests', 'hourly', 24);
        metrics['redis'] = {
          available: true,
          apiRequests: redisMetrics
        };
      } else {
        metrics['redis'] = { available: false };
      }

      res.json(HttpStatusManager.success(metrics, 'System metrics retrieved successfully'));
    } catch (error) {
      console.error('[SYSTEM] Metrics error:', error);
      res.status(500).json(
        HttpStatusManager.internalError('Failed to retrieve system metrics', error)
      );
    }
  }

  /**
   * Calculate overall system health score
   */
  private static calculateHealthScore(envHealth: any, services: any, redisHealth: any): number {
    let score = 0;

    // Environment health (40 points)
    if (envHealth.securityLevel === 'strong') score += 20;
    else if (envHealth.securityLevel === 'good') score += 15;
    else score += 5;

    if (envHealth.validationErrors.length === 0) score += 20;
    else score += Math.max(0, 20 - envHealth.validationErrors.length * 5);

    // Service configuration (40 points)
    const serviceScore = (envHealth.configuredServices / envHealth.totalServices) * 40;
    score += serviceScore;

    // System performance (20 points)
    const uptime = process.uptime();
    if (uptime > 86400) score += 10; // 1 day
    else if (uptime > 3600) score += 7; // 1 hour
    else score += 3;

    const memUsage = process.memoryUsage();
    const memScore = memUsage.heapUsed / memUsage.heapTotal;
    if (memScore < 0.7) score += 10;
    else if (memScore < 0.9) score += 7;
    else score += 3;

    return Math.round(score);
  }

  /**
   * Get service priority for configuration recommendations
   */
  private static getServicePriority(serviceName: string): 'high' | 'medium' | 'low' {
    const priorities = {
      'Square': 'high',
      'Database': 'high',
      'Redis': 'medium',
      'OpenAI': 'medium',
      'Slack': 'medium',
      'Email': 'medium',
      'Telegram': 'low',
      'GoogleSheets': 'low'
    };

    return priorities[serviceName] || 'low';
  }

  /**
   * Generate configuration recommendations
   */
  private static generateRecommendations(health: any): string[] {
    const recommendations = [];

    if (health.securityLevel === 'weak') {
      recommendations.push('Upgrade JWT secret to at least 32 characters for security');
    }

    if (health.validationErrors.length > 0) {
      recommendations.push('Review and fix environment configuration errors');
    }

    if (health.configuredServices < health.totalServices / 2) {
      recommendations.push('Configure additional services for enhanced functionality');
    }

    if (!health.isProduction && health.environment === 'development') {
      recommendations.push('Set NODE_ENV=production for production deployment');
    }

    if (recommendations.length === 0) {
      recommendations.push('System configuration is optimal');
    }

    return recommendations;
  }
}