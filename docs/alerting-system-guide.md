# Peter Digital Enterprise Alerting System Guide

## Overview

The Peter Digital Enterprise Security Platform includes a comprehensive multi-channel alerting system with AI-powered failure analysis. This system provides real-time notifications and intelligent insights for DevOps teams.

## Components

### 1. Alert Channels

#### Slack Integration
- **File**: `scripts/slack-alert.js`
- **Template**: `templates/slack-alert.txt`
- **Configuration**: Set `SLACK_WEBHOOK_URL` environment variable
- **Features**: Rich formatted messages with immediate visibility

#### Email (Mailgun) Integration
- **File**: `scripts/mailgun-alert.js`
- **Template**: `templates/email-alert.html`
- **Configuration**: Set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `ALERT_RECIPIENT_EMAIL`
- **Features**: Professional HTML emails with detailed metrics

#### Telegram Integration
- **File**: `scripts/telegram-alert.js`
- **Template**: `templates/telegram-alert.txt`
- **Configuration**: Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **Features**: Mobile-friendly notifications

### 2. AI-Powered Analysis

#### OpenAI Failure Analyzer
- **File**: `scripts/ai-failure-analyzer.js`
- **Template**: `docs/failure-analysis-report-template.md`
- **Configuration**: Set `OPENAI_API_KEY`
- **Features**: Intelligent root cause analysis and actionable recommendations

### 3. Testing Infrastructure

#### Newman Test Runner
- **File**: `scripts/newman-test-runner.js`
- **Features**: Elite-grade test execution with performance metrics
- **Reports**: HTML and JSON reports with comprehensive analytics

#### Alert Test Simulator
- **File**: `scripts/alert-test-simulator.js`
- **Features**: Simulates failures to validate alerting infrastructure
- **Usage**: `node scripts/alert-test-simulator.js`

## Configuration

### Environment Variables

```bash
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email Configuration (Mailgun)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com
ALERT_RECIPIENT_EMAIL=alerts@yourdomain.com

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# AI Analysis Configuration
OPENAI_API_KEY=your_openai_api_key

# Base URL for testing
BASE_URL=http://localhost:5000
```

### Alert Configuration File

Create `config/alert-config.json`:

```json
{
  "enabled": true,
  "channels": {
    "slack": {
      "enabled": true,
      "webhook_url": "${SLACK_WEBHOOK_URL}",
      "retry": {
        "attempts": 3,
        "delay": 2000
      }
    },
    "email": {
      "enabled": true,
      "provider": "mailgun",
      "api_key": "${MAILGUN_API_KEY}",
      "domain": "${MAILGUN_DOMAIN}",
      "recipient": "${ALERT_RECIPIENT_EMAIL}",
      "retry": {
        "attempts": 3,
        "delay": 3000
      }
    },
    "telegram": {
      "enabled": false,
      "bot_token": "${TELEGRAM_BOT_TOKEN}",
      "chat_id": "${TELEGRAM_CHAT_ID}",
      "retry": {
        "attempts": 3,
        "delay": 1000
      }
    }
  },
  "ai_analysis": {
    "enabled": true,
    "provider": "openai",
    "api_key": "${OPENAI_API_KEY}",
    "model": "gpt-4o",
    "fallback_analysis": true
  },
  "thresholds": {
    "success_rate": 95,
    "response_time": 1000,
    "critical_failures": 3
  }
}
```

## Usage

### Automated Testing with Alerts

```bash
# Run Newman tests with automatic alert triggering
cd scripts
BASE_URL=http://localhost:5000 node newman-test-runner.js
```

### Manual Alert Testing

```bash
# Test the complete alerting system with simulated failures
cd scripts
node alert-test-simulator.js
```

### Individual Alert Channels

```bash
# Test specific alert channels
node scripts/slack-alert.js
node scripts/mailgun-alert.js
node scripts/telegram-alert.js
node scripts/ai-failure-analyzer.js
```

## Templates

### Customizing Alert Templates

All alert templates support variable substitution:

- `{{FAIL_COUNT}}` - Number of failed tests
- `{{TIMESTAMP}}` - Alert timestamp
- `{{TOP_ENDPOINT}}` - Most problematic endpoint
- `{{STATUS}}` - Overall status
- `{{FAILURE_LIST}}` - HTML list of failures
- `{{SUGGESTED_FIX_ROWS}}` - AI-generated fix recommendations

### Template Files

- **Email**: `templates/email-alert.html`
- **Slack**: `templates/slack-alert.txt`
- **Telegram**: `templates/telegram-alert.txt`
- **AI Report**: `docs/failure-analysis-report-template.md`

## Integration with CI/CD

### GitHub Actions Integration

```yaml
name: API Tests with Alerts
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Newman Tests
        run: |
          cd scripts
          BASE_URL=${{ secrets.API_BASE_URL }} node newman-test-runner.js
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
          MAILGUN_DOMAIN: ${{ secrets.MAILGUN_DOMAIN }}
          ALERT_RECIPIENT_EMAIL: ${{ secrets.ALERT_RECIPIENT_EMAIL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Jenkins Integration

```groovy
pipeline {
    agent any
    
    environment {
        BASE_URL = 'http://localhost:5000'
        SLACK_WEBHOOK_URL = credentials('slack-webhook')
        OPENAI_API_KEY = credentials('openai-key')
    }
    
    stages {
        stage('API Tests') {
            steps {
                dir('scripts') {
                    sh 'node newman-test-runner.js'
                }
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'docs/reports',
                reportFiles: 'elite-api-report.html',
                reportName: 'API Test Report'
            ])
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Verify all required environment variables are configured
   - Check `.env` file for local development

2. **Network Connectivity**
   - Ensure outbound HTTPS connections are allowed
   - Check firewall settings for webhook URLs

3. **API Rate Limits**
   - Monitor API usage for external services (OpenAI, Mailgun)
   - Implement exponential backoff for retries

4. **Template Rendering Issues**
   - Validate template files exist in `templates/` directory
   - Check variable substitution syntax

### Debugging Commands

```bash
# Check environment variables
env | grep -E "(SLACK|MAILGUN|TELEGRAM|OPENAI)"

# Test individual components
node scripts/ai-failure-analyzer.js --debug
node scripts/slack-alert.js --verbose

# Validate configuration
node -e "console.log(JSON.stringify(require('./config/alert-config.json'), null, 2))"
```

## Performance Metrics

The alerting system tracks:

- **Alert Delivery Time**: Average time to deliver notifications
- **Success Rate**: Percentage of successfully delivered alerts
- **Retry Statistics**: Failed attempts and recovery rates
- **AI Analysis Performance**: Response times for failure analysis

## Security Considerations

- Store all API keys and tokens as environment variables or secrets
- Use HTTPS for all webhook URLs
- Implement rate limiting for alert channels
- Sanitize user data in alert messages
- Regular rotation of API keys and tokens

## Monitoring

The system includes built-in monitoring for:

- Alert delivery success/failure rates
- Response times for external services
- Queue depth for pending alerts
- Error patterns and frequency

Reports are available in:
- `docs/reports/elite-summary.json`
- `docs/failure-analysis-report.md`
- Application logs with structured data

---

*This guide covers the complete Peter Digital Enterprise Alerting System. For additional support, refer to the individual script documentation or contact the development team.*