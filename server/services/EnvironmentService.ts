/**
 * Environment Configuration Service for Peter Digital Enterprise Security Platform
 * Provides comprehensive environment variable management and validation
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

interface EnvironmentConfig {
  // Core Application
  NODE_ENV: string;
  PORT: number;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  
  // Database
  DATABASE_URL?: string;
  REDIS_URL?: string;
  
  // Square Integration
  SQUARE_ACCESS_TOKEN?: string;
  SQUARE_APPLICATION_ID?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_ENVIRONMENT?: string;
  
  // External APIs
  OPENAI_API_KEY?: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_CHANNEL_ID?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  
  // Email Configuration
  EMAIL_SERVICE?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  
  // Google Services
  GOOGLE_SERVICE_ACCOUNT_KEY?: string;
  GOOGLE_SHEETS_ID?: string;
  
  // Security
  RATE_LIMIT_MAX?: number;
  RATE_LIMIT_WINDOW?: number;
  SESSION_SECRET?: string;
  
  // Monitoring
  LOG_LEVEL?: string;
  ENABLE_METRICS?: boolean;
  METRICS_ENDPOINT?: string;
}

export class EnvironmentService {
  private static config: Partial<EnvironmentConfig> = {};
  private static isInitialized = false;
  private static validationErrors: string[] = [];

  /**
   * Initialize environment configuration
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Load .env file
    config();

    // Parse and validate environment variables
    this.parseEnvironmentVariables();
    this.validateConfiguration();
    this.logConfigurationStatus();

    this.isInitialized = true;
  }

  /**
   * Parse environment variables with type conversion
   */
  private static parseEnvironmentVariables(): void {
    this.config = {
      // Core Application
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT || '5000', 10),
      
      // JWT Configuration
      JWT_SECRET: process.env.JWT_SECRET || this.generateFallbackSecret(),
      JWT_ISSUER: process.env.JWT_ISSUER || 'peter-digital-security-platform',
      JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'api.petershop.com',
      JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '1h',
      JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
      
      // Database
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      
      // Square Integration
      SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
      SQUARE_APPLICATION_ID: process.env.SQUARE_APPLICATION_ID,
      SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
      SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
      
      // External APIs
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
      
      // Email Configuration
      EMAIL_SERVICE: process.env.EMAIL_SERVICE,
      EMAIL_API_KEY: process.env.EMAIL_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      
      // Google Services
      GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
      
      // Security
      RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900', 10), // 15 minutes
      SESSION_SECRET: process.env.SESSION_SECRET,
      
      // Monitoring
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      ENABLE_METRICS: process.env.ENABLE_METRICS === 'true',
      METRICS_ENDPOINT: process.env.METRICS_ENDPOINT
    };
  }

  /**
   * Validate configuration and collect errors
   */
  private static validateConfiguration(): void {
    this.validationErrors = [];

    // Validate JWT secret strength
    if (this.config.JWT_SECRET && this.config.JWT_SECRET.length < 32) {
      this.validationErrors.push('JWT_SECRET should be at least 32 characters for security');
    }

    // Validate port
    if (this.config.PORT && (this.config.PORT < 1 || this.config.PORT > 65535)) {
      this.validationErrors.push('PORT must be between 1 and 65535');
    }

    // Validate Square configuration consistency
    const hasSquareToken = !!this.config.SQUARE_ACCESS_TOKEN;
    const hasSquareLocation = !!this.config.SQUARE_LOCATION_ID;
    if (hasSquareToken !== hasSquareLocation) {
      this.validationErrors.push('Square integration requires both SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID');
    }

    // Validate Slack configuration consistency
    const hasSlackToken = !!this.config.SLACK_BOT_TOKEN;
    const hasSlackChannel = !!this.config.SLACK_CHANNEL_ID;
    if (hasSlackToken !== hasSlackChannel) {
      this.validationErrors.push('Slack integration requires both SLACK_BOT_TOKEN and SLACK_CHANNEL_ID');
    }

    // Validate Telegram configuration consistency
    const hasTelegramToken = !!this.config.TELEGRAM_BOT_TOKEN;
    const hasTelegramChat = !!this.config.TELEGRAM_CHAT_ID;
    if (hasTelegramToken !== hasTelegramChat) {
      this.validationErrors.push('Telegram integration requires both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
    }

    // Validate email configuration
    if (this.config.EMAIL_SERVICE && !this.config.EMAIL_API_KEY) {
      this.validationErrors.push('Email service requires EMAIL_API_KEY');
    }

    // Validate rate limiting
    if (this.config.RATE_LIMIT_MAX && this.config.RATE_LIMIT_MAX < 1) {
      this.validationErrors.push('RATE_LIMIT_MAX must be greater than 0');
    }
  }

  /**
   * Log configuration status
   */
  private static logConfigurationStatus(): void {
    const env = this.config.NODE_ENV;
    console.log(`[ENV] Environment: ${env}`);
    console.log(`[ENV] Port: ${this.config.PORT}`);
    console.log(`[ENV] JWT Secret: ${this.config.JWT_SECRET?.length > 32 ? 'Strong' : 'Weak'} (${this.config.JWT_SECRET?.length} chars)`);

    // Log service availability
    const services = this.getServiceStatus();
    Object.entries(services).forEach(([service, status]) => {
      const statusIcon = status.configured ? '✓' : '✗';
      console.log(`[ENV] ${service}: ${statusIcon} ${status.configured ? 'Configured' : 'Not configured'}`);
    });

    // Log validation errors
    if (this.validationErrors.length > 0) {
      console.warn('[ENV] Configuration warnings:');
      this.validationErrors.forEach(error => console.warn(`  - ${error}`));
    }
  }

  /**
   * Get configuration value with type safety
   */
  static get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config[key] as EnvironmentConfig[K];
  }

  /**
   * Check if a service is configured
   */
  static isServiceConfigured(service: string): boolean {
    const services = this.getServiceStatus();
    return services[service]?.configured || false;
  }

  /**
   * Get service configuration status
   */
  static getServiceStatus(): Record<string, { configured: boolean; requirements: string[] }> {
    return {
      Square: {
        configured: !!(this.config.SQUARE_ACCESS_TOKEN && this.config.SQUARE_LOCATION_ID),
        requirements: ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID']
      },
      OpenAI: {
        configured: !!this.config.OPENAI_API_KEY,
        requirements: ['OPENAI_API_KEY']
      },
      Slack: {
        configured: !!(this.config.SLACK_BOT_TOKEN && this.config.SLACK_CHANNEL_ID),
        requirements: ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID']
      },
      Telegram: {
        configured: !!(this.config.TELEGRAM_BOT_TOKEN && this.config.TELEGRAM_CHAT_ID),
        requirements: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
      },
      Email: {
        configured: !!(this.config.EMAIL_SERVICE && this.config.EMAIL_API_KEY),
        requirements: ['EMAIL_SERVICE', 'EMAIL_API_KEY']
      },
      GoogleSheets: {
        configured: !!(this.config.GOOGLE_SERVICE_ACCOUNT_KEY && this.config.GOOGLE_SHEETS_ID),
        requirements: ['GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_SHEETS_ID']
      },
      Redis: {
        configured: !!this.config.REDIS_URL,
        requirements: ['REDIS_URL']
      },
      Database: {
        configured: !!this.config.DATABASE_URL,
        requirements: ['DATABASE_URL']
      }
    };
  }

  /**
   * Get environment health status
   */
  static getHealthStatus(): {
    environment: string;
    configuredServices: number;
    totalServices: number;
    validationErrors: string[];
    isProduction: boolean;
    securityLevel: 'weak' | 'good' | 'strong';
  } {
    const services = this.getServiceStatus();
    const configuredServices = Object.values(services).filter(s => s.configured).length;
    const totalServices = Object.keys(services).length;
    
    let securityLevel: 'weak' | 'good' | 'strong' = 'weak';
    if (this.config.JWT_SECRET && this.config.JWT_SECRET.length >= 64) {
      securityLevel = 'strong';
    } else if (this.config.JWT_SECRET && this.config.JWT_SECRET.length >= 32) {
      securityLevel = 'good';
    }

    return {
      environment: this.config.NODE_ENV || 'unknown',
      configuredServices,
      totalServices,
      validationErrors: this.validationErrors,
      isProduction: this.config.NODE_ENV === 'production',
      securityLevel
    };
  }

  /**
   * Generate example environment file
   */
  static generateExampleEnv(): string {
    return `# Peter Digital Enterprise Security Platform - Environment Configuration
# Copy this file to .env and update with your configuration

# Core Application
NODE_ENV=development
PORT=5000

# JWT Configuration (Generate secure secrets in production)
JWT_SECRET=your_secure_jwt_secret_here_minimum_32_characters
JWT_ISSUER=peter-digital-security-platform
JWT_AUDIENCE=api.petershop.com
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/petershop
REDIS_URL=redis://localhost:6379

# Square Payment Integration
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_ENVIRONMENT=sandbox

# OpenAI Integration (for AI-powered fraud detection)
OPENAI_API_KEY=your_openai_api_key

# Slack Integration (for notifications)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_channel_id

# Telegram Integration (for notifications)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Email Configuration
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your_email_api_key
EMAIL_FROM=noreply@petershop.com

# Google Services
GOOGLE_SERVICE_ACCOUNT_KEY=path_to_service_account_key.json
GOOGLE_SHEETS_ID=your_google_sheets_id

# Security Configuration
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900
SESSION_SECRET=your_session_secret

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_ENDPOINT=/metrics
`;
  }

  /**
   * Save example environment file
   */
  static saveExampleEnv(): boolean {
    try {
      const envPath = path.join(process.cwd(), '.env.example');
      const exampleContent = this.generateExampleEnv();
      fs.writeFileSync(envPath, exampleContent);
      console.log('[ENV] Example environment file saved to .env.example');
      return true;
    } catch (error) {
      console.error('[ENV] Failed to save example environment file:', error);
      return false;
    }
  }

  /**
   * Generate fallback JWT secret for development
   */
  private static generateFallbackSecret(): string {
    console.warn('[ENV] Using fallback JWT secret. Set JWT_SECRET environment variable for production.');
    return 'peter_digital_jwt_secret_key_2025_development_only';
  }

  /**
   * Validate required environment variables for production
   */
  static validateProductionRequirements(): { valid: boolean; missing: string[] } {
    const required = [
      'JWT_SECRET',
      'DATABASE_URL'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get masked configuration for logging (hides sensitive values)
   */
  static getMaskedConfig(): Record<string, any> {
    const sensitiveKeys = [
      'JWT_SECRET',
      'SQUARE_ACCESS_TOKEN',
      'OPENAI_API_KEY',
      'SLACK_BOT_TOKEN',
      'TELEGRAM_BOT_TOKEN',
      'EMAIL_API_KEY',
      'SESSION_SECRET',
      'DATABASE_URL',
      'REDIS_URL'
    ];

    const masked: Record<string, any> = {};
    
    Object.entries(this.config).forEach(([key, value]) => {
      if (sensitiveKeys.includes(key) && value) {
        masked[key] = typeof value === 'string' 
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : '[HIDDEN]';
      } else {
        masked[key] = value;
      }
    });

    return masked;
  }
}