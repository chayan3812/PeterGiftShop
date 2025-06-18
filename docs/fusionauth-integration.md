# FusionAuth Integration Guide

## Overview

This project has been integrated with FusionAuth for enterprise-grade OAuth authentication. The system supports role-based access control with two primary roles:

- **Admin**: Full access to all administrative functions (you only)
- **Customer**: Standard user access to gift card functions

## Architecture

### Backend Components

1. **FusionAuthService** (`server/services/FusionAuthService.ts`)
   - Handles OAuth token exchange
   - JWT verification and validation
   - User information retrieval
   - Middleware for authentication and authorization

2. **AuthController** (`server/controllers/AuthController.ts`)
   - REST API endpoints for authentication flow
   - Token management (access/refresh tokens)
   - Secure cookie handling

3. **Authentication Routes** (`server/routes.ts`)
   - `/api/auth/token` - OAuth code exchange
   - `/api/auth/refresh` - Token refresh
   - `/api/auth/user` - User information
   - `/api/auth/logout` - Logout functionality
   - `/api/auth/status` - Authentication status

### Frontend Components

1. **RequireAdmin** (`client/src/components/admin/RequireAdmin.tsx`)
   - Protects admin routes
   - Handles authentication redirects
   - Role-based access control

2. **OAuth Callback** (`client/src/pages/oauth-callback.tsx`)
   - Handles OAuth redirect
   - Token exchange processing
   - Error handling

3. **FusionAuth Provider** (`client/src/App.tsx`)
   - Wraps application with authentication context
   - Configuration management

## Environment Variables

### Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# FusionAuth Configuration
FUSIONAUTH_API_KEY=your_fusionauth_api_key
FUSIONAUTH_BASE_URL=http://localhost:9011
FUSIONAUTH_APPLICATION_ID=your_application_id
FUSIONAUTH_JWT_PUBLIC_KEY=your_jwt_public_key

# Frontend Configuration (VITE_ prefix required)
VITE_FUSIONAUTH_CLIENT_ID=your_client_id
VITE_FUSIONAUTH_CLIENT_SECRET=your_client_secret
VITE_FUSIONAUTH_SERVER_URL=http://localhost:9011

# Square API (existing)
SQUARE_ACCESS_TOKEN=your_square_token
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=your_location_id
```

## FusionAuth Setup

### 1. Install FusionAuth

```bash
# Using Docker
docker pull fusionauth/fusionauth-app:latest

# Or download from https://fusionauth.io/download/
```

### 2. Configure Application

1. Create a new Application in FusionAuth
2. Configure OAuth settings:
   - **Authorized redirect URLs**: `http://localhost:5000/oauth-callback`
   - **Logout URL**: `http://localhost:5000/`
   - **Enabled grants**: Authorization Code
3. Create roles:
   - `admin` - Administrator role
   - `customer` - Standard user role

### 3. Create Admin User

1. Register yourself as a user in FusionAuth
2. Assign the `admin` role to your user
3. All other users will automatically get the `customer` role

### 4. Generate API Key

1. Go to Settings > API Keys
2. Create a new API Key with appropriate permissions
3. Copy the API Key to your `.env` file

## Authentication Flow

### 1. Admin Access

1. User visits `/admin/*` route
2. `RequireAdmin` component checks authentication
3. If not authenticated, redirects to FusionAuth login
4. After successful login, redirects back to admin dashboard
5. Admin role is verified before granting access

### 2. OAuth Flow

1. User clicks "Sign In with FusionAuth"
2. Redirected to FusionAuth OAuth endpoint
3. User authenticates with FusionAuth
4. FusionAuth redirects to `/oauth-callback` with auth code
5. Frontend exchanges code for tokens via `/api/auth/token`
6. Tokens stored in secure HTTP-only cookies
7. User redirected to intended destination

### 3. Token Management

- **Access Token**: Short-lived (configurable in FusionAuth)
- **Refresh Token**: Long-lived (30 days)
- **Secure Storage**: HTTP-only cookies with appropriate flags
- **Automatic Refresh**: Handled by authentication middleware

## Security Features

### 1. Role-Based Access Control

```typescript
// Middleware usage example
app.get('/api/admin/*', fusionAuthService.requireAdmin());
```

### 2. JWT Verification

- Public key verification for production
- Signature validation
- Token expiration checking
- Issuer validation

### 3. Secure Cookie Configuration

```typescript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: expiresIn * 1000
});
```

## Development vs Production

### Development Mode

- Uses simplified authentication for demo purposes
- Allows admin access without full FusionAuth setup
- Includes fallback configurations

### Production Mode

- Requires full FusionAuth configuration
- Strict JWT verification
- Secure cookie settings
- HTTPS enforcement

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Set `FUSIONAUTH_API_KEY` in `.env`
   - Restart the server

2. **"Invalid token"**
   - Check JWT public key configuration
   - Verify token hasn't expired

3. **"Authentication required"**
   - Ensure cookies are being sent
   - Check CORS configuration

4. **OAuth redirect issues**
   - Verify redirect URI matches FusionAuth config
   - Check URL encoding

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will provide detailed authentication logs in the console.

## API Reference

### Authentication Endpoints

#### POST `/api/auth/token`
Exchange OAuth authorization code for access token.

**Request:**
```json
{
  "code": "authorization_code",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "redirect_uri": "http://localhost:5000/oauth-callback"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

#### GET `/api/auth/user`
Get current user information.

#### POST `/api/auth/logout`
Logout and clear authentication cookies.

#### GET `/api/auth/status`
Check authentication service status.

## Next Steps

1. Configure FusionAuth instance with your settings
2. Update environment variables with your credentials
3. Test authentication flow
4. Create admin user and assign roles
5. Deploy to production with HTTPS

## Support

For FusionAuth-specific issues, refer to:
- [FusionAuth Documentation](https://fusionauth.io/docs/)
- [OAuth 2.0 Guide](https://fusionauth.io/docs/v1/tech/oauth/)
- [React SDK Documentation](https://github.com/FusionAuth/fusionauth-react-sdk)