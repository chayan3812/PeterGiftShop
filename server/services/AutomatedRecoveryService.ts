import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { activityLogger } from '../db/activity-log.js';

interface RecoveryScenario {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  recoverySteps: RecoveryStep[];
  validationTests: ValidationTest[];
  timeoutMs: number;
  maxRetries: number;
}

interface RecoveryStep {
  id: string;
  name: string;
  command: string;
  args: string[];
  workingDirectory?: string;
  timeoutMs: number;
  retryOnFailure: boolean;
  rollbackOnFailure: boolean;
}

interface ValidationTest {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
  expectedResponseTime: number;
  payload?: any;
  headers?: Record<string, string>;
}

interface RecoveryExecution {
  id: string;
  scenarioId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'rolled_back';
  steps: StepExecution[];
  validationResults: ValidationResult[];
  errorMessage?: string;
}

interface StepExecution {
  stepId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  errorOutput?: string;
  exitCode?: number;
  retryCount: number;
}

interface ValidationResult {
  testId: string;
  passed: boolean;
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
}

export class AutomatedRecoveryService {
  private scenarios: Map<string, RecoveryScenario> = new Map();
  private executions: Map<string, RecoveryExecution> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.initializeDefaultScenarios();
  }

  /**
   * Initialize default recovery scenarios
   */
  private initializeDefaultScenarios() {
    const scenarios: RecoveryScenario[] = [
      {
        id: 'api_failure_recovery',
        name: 'API Failure Recovery',
        description: 'Automated recovery for API endpoint failures',
        triggerConditions: [
          'success_rate < 90',
          'critical_endpoint_failure',
          'response_time > 5000'
        ],
        recoverySteps: [
          {
            id: 'restart_services',
            name: 'Restart Core Services',
            command: 'npm',
            args: ['run', 'restart:services'],
            timeoutMs: 30000,
            retryOnFailure: true,
            rollbackOnFailure: false
          },
          {
            id: 'clear_cache',
            name: 'Clear Application Cache',
            command: 'npm',
            args: ['run', 'cache:clear'],
            timeoutMs: 10000,
            retryOnFailure: false,
            rollbackOnFailure: false
          },
          {
            id: 'verify_database',
            name: 'Verify Database Connection',
            command: 'npm',
            args: ['run', 'db:health'],
            timeoutMs: 15000,
            retryOnFailure: true,
            rollbackOnFailure: false
          }
        ],
        validationTests: [
          {
            id: 'health_check',
            name: 'System Health Check',
            endpoint: '/api/health',
            method: 'GET',
            expectedStatus: 200,
            expectedResponseTime: 1000
          },
          {
            id: 'auth_test',
            name: 'Authentication Test',
            endpoint: '/api/auth/status',
            method: 'GET',
            expectedStatus: 200,
            expectedResponseTime: 500
          },
          {
            id: 'gift_card_test',
            name: 'Gift Card API Test',
            endpoint: '/api/gift-cards/balance/test_card',
            method: 'GET',
            expectedStatus: 200,
            expectedResponseTime: 2000
          }
        ],
        timeoutMs: 300000, // 5 minutes
        maxRetries: 3
      },
      {
        id: 'square_api_recovery',
        name: 'Square API Recovery',
        description: 'Recovery procedures for Square API connectivity issues',
        triggerConditions: [
          'square_api_timeout',
          'square_auth_failure',
          'gift_card_operations_failing'
        ],
        recoverySteps: [
          {
            id: 'refresh_square_token',
            name: 'Refresh Square API Token',
            command: 'node',
            args: ['scripts/refresh-square-token.js'],
            timeoutMs: 20000,
            retryOnFailure: true,
            rollbackOnFailure: false
          },
          {
            id: 'test_square_connectivity',
            name: 'Test Square API Connectivity',
            command: 'node',
            args: ['scripts/test-square-connection.js'],
            timeoutMs: 15000,
            retryOnFailure: false,
            rollbackOnFailure: false
          }
        ],
        validationTests: [
          {
            id: 'square_status',
            name: 'Square API Status',
            endpoint: '/api/square/status',
            method: 'GET',
            expectedStatus: 200,
            expectedResponseTime: 1000
          }
        ],
        timeoutMs: 180000, // 3 minutes
        maxRetries: 2
      }
    ];

    scenarios.forEach(scenario => {
      this.scenarios.set(scenario.id, scenario);
    });

    console.log('[RECOVERY] Initialized', scenarios.length, 'recovery scenarios');
  }

  /**
   * Execute recovery scenario
   */
  async executeRecovery(scenarioId: string, triggeredBy: string = 'system'): Promise<RecoveryExecution> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Recovery scenario not found: ${scenarioId}`);
    }

    const executionId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: RecoveryExecution = {
      id: executionId,
      scenarioId,
      startTime: new Date(),
      status: 'running',
      steps: [],
      validationResults: []
    };

    this.executions.set(executionId, execution);

    console.log(`[RECOVERY] Starting recovery execution: ${executionId} for scenario: ${scenario.name}`);
    activityLogger.log('recovery', {
      executionId,
      scenarioId,
      scenarioName: scenario.name,
      triggeredBy,
      action: 'recovery_started'
    }, 'automated_recovery');

    try {
      // Execute recovery steps
      for (const step of scenario.recoverySteps) {
        const stepExecution = await this.executeStep(step, executionId);
        execution.steps.push(stepExecution);

        if (stepExecution.status === 'failed' && step.rollbackOnFailure) {
          console.log(`[RECOVERY] Step ${step.name} failed, initiating rollback`);
          await this.rollbackExecution(execution);
          execution.status = 'rolled_back';
          execution.endTime = new Date();
          return execution;
        }
      }

      // Run validation tests
      execution.validationResults = await this.runValidationTests(scenario.validationTests);

      // Determine overall success
      const allValidationsPassed = execution.validationResults.every(result => result.passed);
      const allStepsCompleted = execution.steps.every(step => step.status === 'completed');

      if (allValidationsPassed && allStepsCompleted) {
        execution.status = 'completed';
        console.log(`[RECOVERY] Recovery execution completed successfully: ${executionId}`);
      } else {
        execution.status = 'failed';
        execution.errorMessage = 'Validation tests failed or steps incomplete';
        console.log(`[RECOVERY] Recovery execution failed: ${executionId}`);
      }

      execution.endTime = new Date();

      activityLogger.log('recovery', {
        executionId,
        status: execution.status,
        stepsCompleted: execution.steps.length,
        validationsPassed: execution.validationResults.filter(r => r.passed).length,
        totalValidations: execution.validationResults.length,
        action: 'recovery_completed'
      }, 'automated_recovery');

      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();

      console.error(`[RECOVERY] Recovery execution failed: ${executionId}`, error);
      activityLogger.log('recovery', {
        executionId,
        error: execution.errorMessage,
        action: 'recovery_failed'
      }, 'automated_recovery');

      return execution;
    }
  }

  /**
   * Execute individual recovery step
   */
  private async executeStep(step: RecoveryStep, executionId: string): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      stepId: step.id,
      startTime: new Date(),
      status: 'running',
      retryCount: 0
    };

    console.log(`[RECOVERY] Executing step: ${step.name}`);

    let attempts = 0;
    const maxAttempts = step.retryOnFailure ? 3 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      stepExecution.retryCount = attempts - 1;

      try {
        const result = await this.runCommand(step.command, step.args, step.timeoutMs, step.workingDirectory);
        
        stepExecution.output = result.stdout;
        stepExecution.errorOutput = result.stderr;
        stepExecution.exitCode = result.exitCode;
        stepExecution.endTime = new Date();

        if (result.exitCode === 0) {
          stepExecution.status = 'completed';
          console.log(`[RECOVERY] Step completed: ${step.name}`);
          break;
        } else {
          if (attempts < maxAttempts) {
            console.log(`[RECOVERY] Step failed, retrying (${attempts}/${maxAttempts}): ${step.name}`);
            await this.delay(2000); // Wait 2 seconds before retry
          } else {
            stepExecution.status = 'failed';
            console.log(`[RECOVERY] Step failed after ${maxAttempts} attempts: ${step.name}`);
          }
        }

      } catch (error) {
        stepExecution.errorOutput = error instanceof Error ? error.message : 'Unknown error';
        stepExecution.endTime = new Date();

        if (attempts < maxAttempts) {
          console.log(`[RECOVERY] Step error, retrying (${attempts}/${maxAttempts}): ${step.name}`);
          await this.delay(2000);
        } else {
          stepExecution.status = 'failed';
          console.log(`[RECOVERY] Step error after ${maxAttempts} attempts: ${step.name}`);
        }
      }
    }

    return stepExecution;
  }

  /**
   * Run system command with timeout
   */
  private async runCommand(command: string, args: string[], timeoutMs: number, workingDirectory?: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: workingDirectory || process.cwd(),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Run validation tests
   */
  private async runValidationTests(tests: ValidationTest[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const test of tests) {
      console.log(`[RECOVERY] Running validation test: ${test.name}`);
      
      try {
        const startTime = Date.now();
        const response = await this.makeHttpRequest(test);
        const responseTime = Date.now() - startTime;

        const result: ValidationResult = {
          testId: test.id,
          passed: response.status === test.expectedStatus && responseTime <= test.expectedResponseTime,
          responseTime,
          statusCode: response.status
        };

        if (!result.passed) {
          result.errorMessage = `Expected ${test.expectedStatus}, got ${response.status}. Response time: ${responseTime}ms (max: ${test.expectedResponseTime}ms)`;
        }

        results.push(result);
        console.log(`[RECOVERY] Validation test ${result.passed ? 'passed' : 'failed'}: ${test.name}`);

      } catch (error) {
        results.push({
          testId: test.id,
          passed: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`[RECOVERY] Validation test error: ${test.name}`);
      }
    }

    return results;
  }

  /**
   * Make HTTP request for validation
   */
  private async makeHttpRequest(test: ValidationTest): Promise<{ status: number; data?: any }> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const url = `${baseUrl}${test.endpoint}`;

    const fetch = (await import('node-fetch')).default;
    
    const options: any = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...(test.headers || {})
      }
    };

    if (test.payload && (test.method === 'POST' || test.method === 'PUT' || test.method === 'PATCH')) {
      options.body = JSON.stringify(test.payload);
    }

    const response = await fetch(url, options);
    
    return {
      status: response.status,
      data: await response.json().catch(() => null)
    };
  }

  /**
   * Rollback failed execution
   */
  private async rollbackExecution(execution: RecoveryExecution): Promise<void> {
    console.log(`[RECOVERY] Rolling back execution: ${execution.id}`);
    
    // Reverse the order of completed steps and attempt rollback
    const completedSteps = execution.steps.filter(step => step.status === 'completed').reverse();
    
    for (const stepExecution of completedSteps) {
      // Implementation would depend on step-specific rollback procedures
      console.log(`[RECOVERY] Rolling back step: ${stepExecution.stepId}`);
      // Add rollback logic here based on step type
    }
  }

  /**
   * Check if recovery should be triggered based on test results
   */
  shouldTriggerRecovery(testResults: any): string[] {
    const triggeredScenarios: string[] = [];

    for (const [scenarioId, scenario] of this.scenarios) {
      for (const condition of scenario.triggerConditions) {
        if (this.evaluateCondition(condition, testResults)) {
          triggeredScenarios.push(scenarioId);
          break;
        }
      }
    }

    return triggeredScenarios;
  }

  /**
   * Evaluate trigger condition
   */
  private evaluateCondition(condition: string, testResults: any): boolean {
    try {
      const successRate = testResults.executionSummary?.successRate || 100;
      const avgResponseTime = testResults.executionSummary?.avgResponseTime || 0;
      const criticalAlerts = testResults.executionSummary?.criticalAlerts || 0;

      switch (condition) {
        case 'success_rate < 90':
          return successRate < 90;
        case 'success_rate < 95':
          return successRate < 95;
        case 'critical_endpoint_failure':
          return criticalAlerts > 0;
        case 'response_time > 5000':
          return avgResponseTime > 5000;
        case 'square_api_timeout':
          return testResults.failures?.some((f: any) => f.error?.includes('Square API timeout'));
        case 'square_auth_failure':
          return testResults.failures?.some((f: any) => f.error?.includes('Square') && f.statusCode === 401);
        case 'gift_card_operations_failing':
          return testResults.failures?.some((f: any) => f.name?.includes('gift-cards'));
        default:
          return false;
      }
    } catch (error) {
      console.error('[RECOVERY] Error evaluating condition:', condition, error);
      return false;
    }
  }

  /**
   * Get recovery execution status
   */
  getExecution(executionId: string): RecoveryExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions
   */
  getAllExecutions(): RecoveryExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get recovery scenarios
   */
  getScenarios(): RecoveryScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Enable/disable recovery service
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[RECOVERY] Service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      scenarios: this.scenarios.size,
      activeExecutions: Array.from(this.executions.values()).filter(e => e.status === 'running').length,
      totalExecutions: this.executions.size
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const automatedRecoveryService = new AutomatedRecoveryService();