/**
 * Task Scheduler Service for Peter Digital Enterprise Security Platform
 * Provides comprehensive cron job management and automated task execution
 */

import cron from 'node-cron';
import { RedisService } from './RedisService';

interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  errorCount: number;
  description?: string;
}

interface TaskExecution {
  taskId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

export class TaskSchedulerService {
  private static tasks = new Map<string, ScheduledTask>();
  private static cronJobs = new Map<string, cron.ScheduledTask>();
  private static executions = new Map<string, TaskExecution>();

  /**
   * Initialize the task scheduler with default system tasks
   */
  static async initialize(): Promise<void> {
    console.log('[SCHEDULER] Initializing task scheduler...');

    // Register default system tasks
    await this.registerDefaultTasks();

    // Start all enabled tasks
    await this.startAllTasks();

    console.log('[SCHEDULER] Task scheduler initialized successfully');
  }

  /**
   * Register a new scheduled task
   */
  static async registerTask(
    id: string,
    name: string,
    schedule: string,
    handler: () => Promise<void>,
    options: { enabled?: boolean; description?: string } = {}
  ): Promise<boolean> {
    try {
      // Validate cron expression
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron expression: ${schedule}`);
      }

      const task: ScheduledTask = {
        id,
        name,
        schedule,
        handler,
        enabled: options.enabled ?? true,
        runCount: 0,
        errorCount: 0,
        description: options.description
      };

      this.tasks.set(id, task);

      if (task.enabled) {
        await this.startTask(id);
      }

      console.log(`[SCHEDULER] Registered task: ${name} (${schedule})`);
      return true;
    } catch (error) {
      console.error(`[SCHEDULER] Failed to register task ${id}:`, error);
      return false;
    }
  }

  /**
   * Start a specific task
   */
  static async startTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`[SCHEDULER] Task not found: ${taskId}`);
      return false;
    }

    if (this.cronJobs.has(taskId)) {
      console.log(`[SCHEDULER] Task ${taskId} is already running`);
      return true;
    }

    try {
      const cronJob = cron.schedule(task.schedule, async () => {
        await this.executeTask(taskId);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      cronJob.start();
      this.cronJobs.set(taskId, cronJob);

      // Update next run time
      task.nextRun = this.getNextRunTime(task.schedule);

      console.log(`[SCHEDULER] Started task: ${task.name}`);
      return true;
    } catch (error) {
      console.error(`[SCHEDULER] Failed to start task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Stop a specific task
   */
  static async stopTask(taskId: string): Promise<boolean> {
    const cronJob = this.cronJobs.get(taskId);
    if (!cronJob) {
      console.log(`[SCHEDULER] Task ${taskId} is not running`);
      return true;
    }

    try {
      cronJob.destroy();
      this.cronJobs.delete(taskId);

      const task = this.tasks.get(taskId);
      if (task) {
        task.nextRun = undefined;
      }

      console.log(`[SCHEDULER] Stopped task: ${taskId}`);
      return true;
    } catch (error) {
      console.error(`[SCHEDULER] Failed to stop task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Execute a task manually
   */
  static async executeTask(taskId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const executionId = `${taskId}_${Date.now()}`;
    const execution: TaskExecution = {
      taskId,
      startTime: new Date().toISOString(),
      status: 'running'
    };

    this.executions.set(executionId, execution);

    try {
      console.log(`[SCHEDULER] Executing task: ${task.name}`);
      
      const startTime = Date.now();
      await task.handler();
      const duration = Date.now() - startTime;

      execution.endTime = new Date().toISOString();
      execution.duration = duration;
      execution.status = 'completed';

      task.runCount++;
      task.lastRun = execution.startTime;
      task.nextRun = this.getNextRunTime(task.schedule);

      console.log(`[SCHEDULER] Task completed: ${task.name} (${duration}ms)`);

      // Track metrics
      await RedisService.trackMetric(`task_execution_${taskId}`, 1);
      await RedisService.trackMetric('task_execution_success', 1);

    } catch (error) {
      execution.endTime = new Date().toISOString();
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      task.errorCount++;

      console.error(`[SCHEDULER] Task failed: ${task.name}`, error);

      // Track error metrics
      await RedisService.trackMetric(`task_error_${taskId}`, 1);
      await RedisService.trackMetric('task_execution_error', 1);
    }

    // Clean up old executions (keep last 100)
    this.cleanupExecutions();

    return execution;
  }

  /**
   * Get task status and statistics
   */
  static getTaskStatus(taskId: string): ScheduledTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tasks
   */
  static getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task executions
   */
  static getTaskExecutions(taskId?: string): TaskExecution[] {
    const executions = Array.from(this.executions.values());
    return taskId ? executions.filter(e => e.taskId === taskId) : executions;
  }

  /**
   * Register default system tasks
   */
  private static async registerDefaultTasks(): Promise<void> {
    // JWT Token Cleanup - Every hour
    await this.registerTask(
      'jwt_cleanup',
      'JWT Token Cleanup',
      '0 * * * *',
      async () => {
        console.log('[SCHEDULER] Running JWT token cleanup...');
        // Cleanup expired JWT tokens from blacklist
        // Implementation would depend on your JWT service
      },
      { description: 'Clean up expired JWT tokens from blacklist' }
    );

    // System Health Check - Every 5 minutes
    await this.registerTask(
      'health_check',
      'System Health Check',
      '*/5 * * * *',
      async () => {
        console.log('[SCHEDULER] Running system health check...');
        
        // Check Redis health
        const redisHealth = await RedisService.healthCheck();
        await RedisService.trackMetric('health_check_redis', redisHealth.status === 'connected' ? 1 : 0);
        
        // Track system metrics
        await RedisService.trackMetric('health_check_completed', 1);
      },
      { description: 'Monitor system health and log metrics' }
    );

    // Security Audit Log Rotation - Daily at 2 AM
    await this.registerTask(
      'audit_log_rotation',
      'Security Audit Log Rotation',
      '0 2 * * *',
      async () => {
        console.log('[SCHEDULER] Running audit log rotation...');
        // Rotate security logs, archive old entries
        await RedisService.trackMetric('audit_log_rotation', 1);
      },
      { description: 'Rotate and archive security audit logs' }
    );

    // Fraud Detection Model Update - Daily at 3 AM
    await this.registerTask(
      'fraud_model_update',
      'Fraud Detection Model Update',
      '0 3 * * *',
      async () => {
        console.log('[SCHEDULER] Updating fraud detection models...');
        // Update fraud detection rules and thresholds
        await RedisService.trackMetric('fraud_model_update', 1);
      },
      { description: 'Update fraud detection models and rules' }
    );

    // Cache Cleanup - Every 6 hours
    await this.registerTask(
      'cache_cleanup',
      'Cache Cleanup',
      '0 */6 * * *',
      async () => {
        console.log('[SCHEDULER] Running cache cleanup...');
        // Clean up expired cache entries
        await RedisService.trackMetric('cache_cleanup', 1);
      },
      { description: 'Clean up expired cache entries' }
    );

    // Metrics Aggregation - Every hour
    await this.registerTask(
      'metrics_aggregation',
      'Metrics Aggregation',
      '0 * * * *',
      async () => {
        console.log('[SCHEDULER] Aggregating metrics...');
        
        // Aggregate hourly metrics
        const metrics = await RedisService.getMetrics('api_requests', 'hourly', 1);
        console.log('[SCHEDULER] Hourly API requests:', Object.values(metrics).reduce((a, b) => a + b, 0));
        
        await RedisService.trackMetric('metrics_aggregation', 1);
      },
      { description: 'Aggregate and process system metrics' }
    );

    // Database Maintenance - Weekly on Sunday at 1 AM
    await this.registerTask(
      'database_maintenance',
      'Database Maintenance',
      '0 1 * * 0',
      async () => {
        console.log('[SCHEDULER] Running database maintenance...');
        // Database optimization, cleanup, backup verification
        await RedisService.trackMetric('database_maintenance', 1);
      },
      { description: 'Perform database maintenance and optimization' }
    );

    // Security Report Generation - Weekly on Monday at 9 AM
    await this.registerTask(
      'security_report',
      'Weekly Security Report',
      '0 9 * * 1',
      async () => {
        console.log('[SCHEDULER] Generating weekly security report...');
        // Generate comprehensive security report
        await RedisService.trackMetric('security_report_generated', 1);
      },
      { description: 'Generate weekly security and compliance reports' }
    );
  }

  /**
   * Start all enabled tasks
   */
  private static async startAllTasks(): Promise<void> {
    for (const [taskId, task] of this.tasks) {
      if (task.enabled) {
        await this.startTask(taskId);
      }
    }
  }

  /**
   * Get next run time for a cron expression
   */
  private static getNextRunTime(schedule: string): string {
    try {
      // This is a simplified implementation
      // In production, use a proper cron parser library
      const now = new Date();
      const nextRun = new Date(now.getTime() + 60000); // Approximate next minute
      return nextRun.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Clean up old task executions
   */
  private static cleanupExecutions(): void {
    const executions = Array.from(this.executions.entries());
    if (executions.length > 100) {
      // Sort by start time and keep only the latest 100
      executions
        .sort(([, a], [, b]) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(100)
        .forEach(([id]) => this.executions.delete(id));
    }
  }

  /**
   * Enable or disable a task
   */
  static async toggleTask(taskId: string, enabled: boolean): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;

    if (enabled) {
      return await this.startTask(taskId);
    } else {
      return await this.stopTask(taskId);
    }
  }

  /**
   * Get scheduler statistics
   */
  static getStatistics(): {
    totalTasks: number;
    runningTasks: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  } {
    const totalTasks = this.tasks.size;
    const runningTasks = this.cronJobs.size;
    const executions = Array.from(this.executions.values());
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;

    return {
      totalTasks,
      runningTasks,
      totalExecutions,
      successfulExecutions,
      failedExecutions
    };
  }

  /**
   * Shutdown scheduler
   */
  static async shutdown(): Promise<void> {
    console.log('[SCHEDULER] Shutting down task scheduler...');
    
    for (const [taskId] of this.cronJobs) {
      await this.stopTask(taskId);
    }
    
    console.log('[SCHEDULER] Task scheduler shut down successfully');
  }
}