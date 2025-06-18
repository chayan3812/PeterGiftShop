# Comprehensive Alerting System Guide
## Peter Digital Enterprise Security Platform

### Overview

The Peter Digital alerting system provides multi-channel notifications for API test failures with AI-powered analysis. The system integrates Slack, email, Telegram, and intelligent failure analysis to ensure immediate awareness of system issues.

### Alert Channels

#### 1. Slack Integration
**File:** `scripts/slack-alert.js`

- Sends rich formatted messages to Slack channels
- Includes color-coded alerts based on severity
- Displays comprehensive test metrics and quality gates
- Provides actionable recommendations

**Configuration:**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### 2. Email Alerts (Mailgun)
**File:** `scripts/mailgun-alert.js`

- Sends HTML-formatted email alerts
- Professional email templates with metrics grid
- Includes detailed quality gate status
- Links to generated reports

**Configuration:**
```bash
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com
ALERT_RECIPIENT_EMAIL=alerts@yourcompany.com
```

#### 3. Telegram Notifications
**File:** `scripts/telegram-alert.js`

- Sends formatted text messages via Telegram Bot API
- HTML formatting support for structured alerts
- Compact format suitable for mobile viewing
- Optional channel - disabled by default

**Configuration:**
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

#### 4. AI Failure Analysis
**File:** `scripts/ai-failure-analyzer.js`

- OpenAI-powered intelligent failure analysis
- Root cause identification and recommendations
- Confidence scoring for analysis accuracy
- Fallback to built-in analysis when AI unavailable

**Configuration:**
```bash
OPENAI_API_KEY=your_openai_api_key
```

### Alert Configuration

#### Main Configuration File
**Location:** `config/alert-config.json`

```json
{
  "slackEnabled": true,
  "emailEnabled": true,
  "telegramEnabled": false,
  "aiAnalyzerEnabled": true,
  "thresholds": {
    "failureRate": 0.05,
    "responseTime": 500,
    "criticalAlerts": 1
  }
}
```

#### Alert Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| failureRate | 0.05 | Trigger if >5% failure rate |
| responseTime | 500ms | Trigger if avg response time exceeds limit |
| criticalAlerts | 1 | Trigger if critical alerts detected |

### Environment Setup

#### Required Variables
Copy from `config/env.example` to your `.env` file:

```bash
# Alert System Configuration
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=your_mailgun_domain.com
ALERT_RECIPIENT_EMAIL=alerts@yourcompany.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Optional Telegram (if enabled)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Optional AI Analysis
OPENAI_API_KEY=your_openai_api_key_here
```

### Usage

#### Automatic Integration
Alerts are automatically triggered during Newman test execution:

```bash
cd scripts && node newman-test-runner.js
```

#### Manual Alert Testing
Test individual alert channels:

```bash
# Test Slack alerts
node scripts/slack-alert.js

# Test email alerts
node scripts/mailgun-alert.js

# Test Telegram alerts
node scripts/telegram-alert.js

# Test AI analysis
node scripts/ai-failure-analyzer.js
```

### Alert Triggers

Alerts are triggered when any of the following conditions are met:

1. **Test Failures:** Success rate < 100%
2. **Performance Issues:** Average response time > 100ms
3. **Critical Security Alerts:** Any critical alerts detected
4. **Quality Gate Failures:** Quality thresholds not met

### Alert Content

#### Slack Alert Features
- Color-coded severity indicators
- Comprehensive metrics display
- Quality gate status indicators
- Direct links to reports
- Actionable recommendations

#### Email Alert Features
- Professional HTML formatting
- Responsive design for mobile viewing
- Detailed metrics grid layout
- Quality gate status badges
- Coverage analysis breakdown

#### Telegram Alert Features
- Compact mobile-friendly format
- HTML formatting support
- Emoji indicators for quick scanning
- Essential metrics only

#### AI Analysis Features
- Root cause identification
- Specific fix recommendations
- Priority action items
- Prevention strategies
- Confidence scoring

### Report Generation

#### AI Failure Analysis Report
**Location:** `docs/failure-analysis-report.md`

Generated automatically when failures are detected:
- Executive summary with key metrics
- Failure pattern analysis
- AI-powered root cause analysis
- Priority actions and recommendations
- Prevention strategies

#### Success Reports
When no failures are detected, a success report is generated confirming system health.

### Customization

#### Alert Templates
Modify alert templates in the configuration:

```json
{
  "templates": {
    "slack": {
      "channel": "#alerts",
      "username": "Peter Digital API Monitor",
      "icon_emoji": ":warning:"
    },
    "email": {
      "subject": "Peter Digital API Test Failure Alert",
      "priority": "high"
    }
  }
}
```

#### Retry Configuration
Configure retry behavior for failed alert deliveries:

```json
{
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 5000
  }
}
```

### Monitoring and Maintenance

#### Log Monitoring
Alert system logs are integrated with Newman test runner output:
- Success confirmations for each channel
- Failure warnings with error details
- Retry attempt notifications
- Final delivery status

#### Performance Optimization
- Parallel alert processing for speed
- Graceful fallbacks for failed channels
- Built-in analysis when AI unavailable
- Configurable timeout and retry settings

### Troubleshooting

#### Common Issues

**Slack Alerts Not Delivered**
- Verify SLACK_WEBHOOK_URL is correct
- Check webhook permissions in Slack
- Ensure slackEnabled is true in config

**Email Delivery Failures**
- Validate Mailgun API credentials
- Check domain verification status
- Verify recipient email address

**Telegram Not Working**
- Confirm bot token is valid
- Verify chat ID is correct
- Ensure telegramEnabled is true

**AI Analysis Failing**
- Check OpenAI API key validity
- Verify API rate limits not exceeded
- System falls back to built-in analysis

#### Debug Mode
Enable verbose logging by setting environment variable:
```bash
DEBUG=true node scripts/newman-test-runner.js
```

### Integration with CI/CD

#### GitHub Actions Example
```yaml
- name: Run API Tests with Alerts
  run: |
    cd scripts
    node newman-test-runner.js
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
    MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

#### Jenkins Pipeline
```groovy
stage('API Testing with Alerts') {
    steps {
        script {
            sh 'cd scripts && node newman-test-runner.js'
        }
    }
}
```

### Security Considerations

- Store all API keys and tokens as environment variables
- Use webhook URLs with proper authentication
- Limit alert recipient access to authorized personnel
- Regularly rotate API keys and tokens
- Monitor alert delivery logs for security events

---

**Last Updated:** June 18, 2025  
**System Version:** Enterprise Security Platform v1.0  
**Alert System Version:** Comprehensive Multi-Channel v1.0