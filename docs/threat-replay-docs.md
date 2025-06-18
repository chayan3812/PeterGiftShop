# Threat Replay Engine Documentation

## Overview
The Threat Replay Engine provides comprehensive threat simulation capabilities with AI-powered defense learning for continuous security improvement. This system enables replaying historical fraud events, analyzing AI behavior, and automatically improving auto-responder logic through learned adaptations.

## Replay Engine Behavior

### Safe Mode vs Real Trigger Mode
- **Safe Mode (Default)**: Replays execute without triggering real-world actions, maintaining system safety
- **Real Trigger Mode**: Reserved for controlled testing environments with proper safeguards
- All replay operations include comprehensive logging and audit trails

### Replay Process
1. Extract historical threat event from logs
2. Execute fraud detection pipeline in simulation mode
3. Analyze geo-IP risk factors without triggering blocks
4. Generate auto-responder recommendations without execution
5. Compare results with original event outcomes
6. Identify learning opportunities for system improvement

## Learning Engine Logic

### Pattern Analysis
- **Fraud Score Patterns**: Analyzes variations in fraud detection accuracy
- **Performance Patterns**: Identifies processing bottlenecks and optimization opportunities
- **Response Patterns**: Evaluates auto-responder effectiveness and consistency
- **Geographic Patterns**: Enhances geo-location threat detection capabilities

### Rule Generation
- AI-powered analysis generates learning rules with confidence scoring
- Rules categorized by: threshold, pattern, response, performance
- Priority levels: low, medium, high, critical based on confidence and impact
- Manual approval required for rule application to maintain safety

### Learning Metrics
- Detection accuracy improvement tracking
- Response time optimization measurements
- False positive reduction analysis
- Threat coverage expansion metrics

## API Endpoints and Usage

### Core Replay Operations

#### Single Threat Replay
```bash
POST /api/replay/threat
Content-Type: application/json

{
  "threatId": "threat_log_1",
  "safeMode": true
}
```

#### Batch Threat Replay
```bash
POST /api/replay/batch
Content-Type: application/json

{
  "query": {
    "scoreMin": 70,
    "dateRange": {
      "start": "2025-01-15T00:00:00Z",
      "end": "2025-01-18T23:59:59Z"
    },
    "limit": 10
  },
  "safeMode": true
}
```

#### Defense Training
```bash
POST /api/replay/train
Content-Type: application/json

{
  "query": {
    "scoreMin": 70,
    "eventTypes": ["gift_card_activity.created"]
  },
  "autoApply": false
}
```

### Data Retrieval

#### Get Replay Results
```bash
GET /api/replay/results
```

#### Get Replay Statistics
```bash
GET /api/replay/stats
```

#### Get Learning Rules
```bash
GET /api/replay/learning-rules
```

## System Features

### Admin-Only Control
- All replay and learning operations require admin authentication
- Complete audit logging for compliance and security monitoring
- Role-based access controls for sensitive operations

### Safe, Non-Destructive Replay
- Default safe mode prevents real-world actions during replay
- Simulation metadata prevents accidental live execution
- Comprehensive error handling and rollback capabilities

### Comprehensive Logging
- Timestamped logs for all replay executions
- Detailed performance metrics and outcome analysis
- Exportable audit trails for compliance requirements
- Learning rule application tracking

### Live Testing Capabilities
- Real-time threat replay during webhook processing
- Performance benchmarking and optimization testing
- A/B testing for fraud detection algorithm improvements
- Integration testing with external threat intelligence feeds

## Example Usage Scenarios

### Historical Analysis
```bash
# Replay all high-risk threats from last week
curl -X POST http://localhost:5000/api/replay/batch \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "scoreMin": 80,
      "dateRange": {
        "start": "2025-01-15T00:00:00Z",
        "end": "2025-01-22T23:59:59Z"
      }
    }
  }'
```

### Learning Optimization
```bash
# Run training session on recent replays
curl -X POST http://localhost:5000/api/replay/train \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"scoreMin": 70},
    "autoApply": false
  }'
```

### Performance Testing
```bash
# Get comprehensive replay statistics
curl -X GET http://localhost:5000/api/replay/stats
```

## Response Examples

### Successful Replay Result
```json
{
  "id": "replay_1750260000000_1",
  "threatId": "threat_log_1",
  "replayedAt": "2025-06-18T15:00:00.000Z",
  "replayOutcome": {
    "fraudScore": 85,
    "geoRisk": 60,
    "responsesTriggered": ["Additional verification required"],
    "detectionTime": 150,
    "processingTime": 75
  },
  "comparison": {
    "scoreDifference": 5,
    "missedDetections": [],
    "newDetections": ["Geographic threat detected"],
    "responseVariance": 1
  },
  "learningOpportunities": [
    "Score variance: 5 points difference",
    "New detection: Geographic threat detected"
  ],
  "safeMode": true,
  "adminTriggered": true
}
```

### Training Analysis Result
```json
{
  "trainingSession": {
    "id": "training_1750260000000_1",
    "rulesGenerated": ["learning_rule_1", "learning_rule_2"],
    "improvements": {
      "detectionAccuracy": 0.15,
      "responseTime": 0.20,
      "falsePositiveReduction": 0.10,
      "coverageIncrease": 0.05
    }
  },
  "replayResults": 5,
  "missedCount": 1,
  "suggestions": [
    {
      "rule": "IF score >= 90 THEN escalate",
      "threatId": "threat_log_2",
      "confidence": 0.9
    }
  ]
}
```

## Security Considerations

### Access Control
- Admin-only endpoints with proper authentication
- Role-based permissions for replay operations
- Session management and audit logging

### Data Protection
- Encrypted storage for historical threat data
- Secure transmission of replay results
- PII masking in logs and audit trails

### Operational Safety
- Default safe mode for all operations
- Manual approval for learning rule application
- Rollback capabilities for applied changes
- Real-time monitoring and alerting

## Performance Metrics

### Replay Performance
- Average processing time: Target <100ms per replay
- Success rate: Target >95% successful executions
- Throughput: Support for 100+ concurrent replays

### Learning Effectiveness
- Detection accuracy improvement: Measurable gains >10%
- Response time optimization: Target 20% improvement
- False positive reduction: Target 15% decrease
- Coverage expansion: New threat pattern detection

## Troubleshooting

### Common Issues
1. **Replay Execution Failures**: Verify threat log data integrity
2. **Learning Rule Generation**: Ensure sufficient replay data available
3. **Performance Degradation**: Monitor system resources during batch operations
4. **API Authentication**: Confirm admin credentials and permissions

### Debug Information
- Comprehensive error logging with stack traces
- Performance metrics for bottleneck identification
- Real-time system health monitoring
- Detailed audit trails for issue investigation

## Integration Points

### Existing Systems
- Fraud Detection Engine integration for score calculation
- Auto-Responder Engine for response simulation
- Activity Logger for audit trail management
- GeoIP Service for geographic risk analysis

### External Services
- Threat intelligence feed integration
- Security information and event management (SIEM) systems
- Compliance reporting and audit systems
- Performance monitoring and alerting platforms