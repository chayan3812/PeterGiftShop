# Peter Digital API - Postman Collection Documentation

## Overview
This comprehensive Postman collection provides complete API testing coverage for the Peter Digital Enterprise Security Platform. The collection includes 60+ endpoints organized into 11 feature groups with proper authentication handling.

## Collection Import
Import `PeterDigitalAPI.postman_collection.json` into Postman to access all endpoints.

## Environment Variables
Set up the following environment variables in Postman:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `BASE_URL` | Server base URL | `http://localhost:5000` |
| `access_token` | FusionAuth access token | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `refresh_token` | FusionAuth refresh token | `abc123def456...` |
| `square_gift_card_id` | Square gift card ID | `giftcard_123456789` |
| `gift_card_code` | Internal gift card code | `GC-ABCD-1234-EFGH` |
| `merchant_id` | Square merchant ID | `merchant_12345` |

## API Endpoint Matrix

### Authentication (5 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/token` | POST | No | OAuth token exchange |
| `/api/auth/refresh` | POST | No | Refresh access token |
| `/api/auth/user` | GET | Yes | Get user information |
| `/api/auth/logout` | POST | Yes | Logout user session |
| `/api/auth/status` | GET | No | Check auth status |

### Admin Management (5 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/admin/users` | GET | Admin | List all users |
| `/api/admin/users/stats` | GET | Admin | User statistics |
| `/api/admin/logs` | GET | Admin | System activity logs |
| `/api/admin/logs/stats` | GET | Admin | Log statistics |
| `/api/admin/logs/export` | GET | Admin | Export logs as JSON |

### Gift Cards - Square API (4 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/gift-cards/issue` | POST | No | Issue new gift card |
| `/api/gift-cards/reload` | POST | No | Add funds to card |
| `/api/gift-cards/redeem-square` | POST | No | Redeem via Square |
| `/api/gift-cards/balance/{id}` | GET | No | Check card balance |

### Gift Cards - Admin Management (6 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/gift-card-admin/list` | GET | Admin | List all gift cards |
| `/api/gift-card-admin/from-gan` | POST | Admin | Get card by GAN |
| `/api/gift-card-admin/from-nonce` | POST | Admin | Get card by nonce |
| `/api/gift-card-admin/link` | POST | Admin | Link customer to card |
| `/api/gift-card-admin/unlink` | POST | Admin | Unlink customer |
| `/api/gift-card-admin/issue` | POST | Admin | Issue with admin privileges |

### Gift Cards - Customer Operations (3 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/gift-cards/purchase` | POST | No | Purchase new gift card |
| `/api/gift-cards/check-balance` | POST | No | Check balance by code |
| `/api/gift-cards/redeem` | POST | No | Redeem gift card |

### Square Integration (1 endpoint)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/square/status` | GET | No | Square API status check |

### Webhooks (3 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/webhooks/gift-cards` | POST | No | Square webhook handler |
| `/api/webhooks/logs` | GET | No | Webhook activity logs |
| `/api/webhooks/stats` | GET | No | Webhook statistics |

### Fraud Detection (2 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/fraud/signals` | GET | No | Recent fraud signals |
| `/api/fraud/stats` | GET | No | Fraud detection stats |

### Threat Intelligence (2 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/threats/map` | GET | No | Geographic threat data |
| `/api/threats/stats` | GET | No | Threat statistics |

### Analytics Dashboard (1 endpoint)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/analytics/data` | GET | No | Analytics dashboard data |

### AI Digest Reports (4 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/digest/latest` | GET | No | Latest digest report |
| `/api/digest/list` | GET | No | List digest reports |
| `/api/digest/generate` | POST | No | Generate new digest |
| `/api/digest/stats` | GET | No | Digest statistics |

### Auto-Responder Engine (6 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auto-responder/rules` | GET | No | Auto-responder rules |
| `/api/auto-responder/trigger` | POST | No | Trigger processing |
| `/api/auto-responder/stats` | GET | No | Engine statistics |
| `/api/auto-responder/responses` | GET | No | Response history |
| `/api/auto-responder/alerts` | GET | No | Security alerts |
| `/api/auto-responder/blocked-ips` | GET | No | Blocked IP addresses |

### Threat Replay Engine (8 endpoints)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/threats/replay` | POST | No | Execute threat simulation |
| `/api/threats/replay-history` | GET | No | Replay execution history |
| `/api/threats/replay-scenarios` | GET | No | Available scenarios |
| `/api/threats/replay-stats` | GET | No | Replay statistics |
| `/api/threats/learning-updates` | GET | No | Defense learning updates |
| `/api/threats/audit-log` | GET | No | Replay audit log |
| `/api/threats/learning/toggle` | POST | No | Toggle learning mode |
| `/api/threats/learning/threshold` | POST | No | Update thresholds |

### System Health (1 endpoint)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/health` | GET | No | System health check |

## Summary Statistics
- **Total Endpoints**: 62
- **GET Endpoints**: 39
- **POST Endpoints**: 23
- **Admin-Only Endpoints**: 11
- **Public Endpoints**: 51
- **Feature Groups**: 13

## Testing Workflow
1. **Health Check**: Start with `/api/health` to verify server connectivity
2. **Square Status**: Check `/api/square/status` for API configuration
3. **Authentication**: Use auth endpoints if admin features are needed
4. **Core Features**: Test gift card operations, fraud detection, and threat intelligence
5. **Advanced Features**: Test AI digest, auto-responder, and threat replay systems
6. **Monitoring**: Use webhook, analytics, and logging endpoints

## Sample Test Scenarios

### Basic Gift Card Flow
1. Purchase gift card: `POST /api/gift-cards/purchase`
2. Check balance: `POST /api/gift-cards/check-balance`
3. Redeem amount: `POST /api/gift-cards/redeem`

### Security Testing Flow
1. Trigger webhook: `POST /api/webhooks/gift-cards`
2. Check fraud signals: `GET /api/fraud/signals`
3. Review threat map: `GET /api/threats/map`
4. Execute replay: `POST /api/threats/replay`

### Analytics & Monitoring Flow
1. Get analytics data: `GET /api/analytics/data`
2. Generate digest: `POST /api/digest/generate`
3. Check auto-responder: `GET /api/auto-responder/stats`
4. Review system logs: `GET /api/admin/logs` (requires admin auth)

## Notes
- All endpoints return JSON responses
- Error responses include descriptive error messages
- Timestamps are in ISO 8601 format
- Monetary amounts are in decimal string format (e.g., "50.00")
- Admin endpoints require valid FusionAuth access token
- Rate limiting may apply to certain endpoints in production