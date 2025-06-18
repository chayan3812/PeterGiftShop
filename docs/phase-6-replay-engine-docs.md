# Phase 6: Threat Replay Engine + Defense Learning Mode

## Overview
The Threat Replay Engine provides advanced threat simulation capabilities with AI-powered defense learning for continuous security improvement. This system allows replaying historical fraud events, analyzing AI behavior, and automatically improving auto-responder logic through learned adaptations.

## Architecture

### Core Components

1. **ThreatReplayService.ts** - Advanced threat replay and batch processing
2. **DefenseLearningEngine.ts** - AI-powered threshold learning and rule generation
3. **ThreatReplayEngine.ts** - Original scenario-based replay system
4. **AdminThreatReplay.tsx** - Admin dashboard for threat management

## Features

### 1. Historical Threat Replay
- Replay past threat/fraud events through the full webhook + AI pipeline
- Pull events from threat logs or archived webhook payloads
- Simulate AI decisions without triggering real responses (safe mode)
- Log results: fraud score, responder triggered, action taken

### 2. Defense Learning Mode
- Analyze replay results vs. actual system response
- Flag missed detections or delayed reactions
- Automatically suggest new responder rules or threshold tuning
- Optionally auto-update responder rules with confidence scoring

### 3. Batch Processing
- Process multiple threats simultaneously with filtering criteria
- Date range, score range, IP range, and event type filtering
- Configurable batch limits and safe mode execution
- Comprehensive learning opportunity identification

### 4. AI-Powered Learning
- Pattern analysis across fraud score variations
- Performance optimization recommendations
- Geographic risk pattern enhancement
- Response pattern standardization

## API Endpoints

### Threat Replay Engine (Original)
```
POST /api/threats/replay - Execute threat replay
GET /api/threats/replay-scenarios - Get available scenarios
GET /api/threats/replay-history - Get replay execution history
GET /api/threats/replay-stats - Get replay statistics
GET /api/threats/learning-updates - Get AI learning updates
POST /api/threats/create-scenario - Create new threat scenario
POST /api/threats/learning/train - Run learning cycle
GET /api/threats/learning/metrics - Get learning metrics
```

### Advanced Threat Replay Service
```
GET /api/replay/threats - Get historical threat logs
POST /api/replay/threat/:threatId - Replay specific threat
POST /api/replay/batch - Execute batch replay with criteria
GET /api/replay/results - Get replay results
GET /api/replay/stats - Get comprehensive replay statistics
```

### Defense Learning Engine
```
POST /api/learning/train - Run training session
GET /api/learning/rules - Get generated learning rules
POST /api/learning/rules/:ruleId/apply - Apply specific learning rule
GET /api/learning/sessions - Get training session history
GET /api/learning/metrics - Get learning performance metrics
PUT /api/learning/config - Update learning configuration
```

## Configuration

### Learning Engine Settings
- **Learning Enabled**: Toggle AI learning capabilities
- **Auto-Approval Threshold**: Confidence threshold for automatic rule application (default: 0.85)
- **Batch Processing Limits**: Maximum threats processed per batch operation

### Safety Features
- **Safe Mode**: Prevents real-world actions during replay
- **Admin-Only Access**: All replay and learning operations require admin privileges
- **Audit Logging**: Complete audit trail for all replay executions and AI adjustments

## Data Models

### ThreatLog
```typescript
interface ThreatLog {
  id: string;
  timestamp: string;
  eventType: string;
  payload: any;
  originalFraudScore?: number;
  originalGeoRisk?: number;
  originalResponses?: string[];
  source: 'webhook' | 'synthetic' | 'archived';
}
```

### ReplayResult
```typescript
interface ReplayResult {
  id: string;
  threatId: string;
  replayedAt: string;
  originalEvent: any;
  replayOutcome: {
    fraudScore: number;
    geoRisk: number;
    responsesTriggered: string[];
    detectionTime: number;
    processingTime: number;
  };
  comparison: {
    scoreDifference: number;
    missedDetections: string[];
    newDetections: string[];
    responseVariance: number;
  };
  learningOpportunities: string[];
  safeMode: boolean;
  adminTriggered: boolean;
}
```

### LearningRule
```typescript
interface LearningRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  recommendation: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'threshold' | 'pattern' | 'response' | 'performance';
  createdAt: string;
  appliedAt?: string;
  status: 'pending' | 'applied' | 'rejected';
}
```

## Usage Examples

### Execute Single Threat Replay
```bash
curl -X POST http://localhost:5000/api/replay/threat/threat_log_1 \
  -H "Content-Type: application/json" \
  -d '{"safeMode": true, "adminTriggered": true}'
```

### Batch Replay with Criteria
```bash
curl -X POST http://localhost:5000/api/replay/batch \
  -H "Content-Type: application/json" \
  -d '{
    "dateRange": {
      "start": "2025-01-15T00:00:00Z",
      "end": "2025-01-18T23:59:59Z"
    },
    "scoreRange": {
      "min": 80,
      "max": 100
    },
    "limit": 10,
    "safeMode": true
  }'
```

### Run Training Session
```bash
curl -X POST http://localhost:5000/api/learning/train \
  -H "Content-Type: application/json" \
  -d '{"autoApply": false}'
```

## Security Considerations

### Access Control
- All replay endpoints require admin authentication
- Safe mode is enforced by default to prevent accidental real-world actions
- Complete audit logging for compliance and security monitoring

### Data Protection
- Historical threat data is stored securely with encrypted payloads
- Replay results are automatically archived after 30 days
- Sensitive information is masked in logs and audit trails

### Learning Safety
- AI learning rules require manual approval by default
- Confidence thresholds prevent low-quality rule application
- Rollback capabilities for applied learning rules

## Performance Metrics

### Replay Performance
- **Average Processing Time**: Time taken for threat replay execution
- **Success Rate**: Percentage of successful replay operations
- **Learning Opportunity Identification**: Rate of actionable insights generated

### Learning Effectiveness
- **Detection Accuracy Improvement**: Measured improvement in fraud detection
- **Response Time Optimization**: Reduction in processing time
- **False Positive Reduction**: Decrease in incorrect fraud flagging
- **Coverage Increase**: Expansion of threat detection capabilities

## Monitoring and Alerts

### System Health
- Replay engine status and performance metrics
- Learning engine training session success rates
- Resource utilization during batch processing operations

### Operational Alerts
- Failed replay executions requiring investigation
- Learning rules pending manual approval
- Performance degradation in replay processing
- Unusual patterns in threat data analysis

## Troubleshooting

### Common Issues
1. **Replay Execution Failures**: Check threat log data integrity and system resources
2. **Learning Rule Generation**: Verify sufficient replay data for pattern analysis
3. **Performance Issues**: Monitor batch processing limits and system load
4. **Data Consistency**: Ensure proper synchronization between threat logs and replay results

### Debug Endpoints
```
GET /api/replay/stats - System performance statistics
GET /api/learning/metrics - Learning engine health metrics
```

## Future Enhancements

### Planned Features
- Machine learning model integration for advanced pattern recognition
- Real-time threat replay during live webhook processing
- Integration with external threat intelligence feeds
- Advanced visualization of learning rule effectiveness

### Scalability Improvements
- Distributed processing for large-scale batch operations
- Database persistence for threat logs and replay results
- Advanced caching mechanisms for improved performance
- API rate limiting and request queuing

## Conclusion

Phase 6: Threat Replay Engine + Defense Learning Mode provides enterprise-grade threat simulation and AI-powered security improvement capabilities. The system enables continuous learning from historical fraud events while maintaining strict safety controls and comprehensive audit trails for production environments.