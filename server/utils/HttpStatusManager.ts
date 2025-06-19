/**
 * HTTP Status Code Manager for Peter Digital Enterprise Security Platform
 * Provides comprehensive HTTP status code handling and response management
 */

export class HttpStatusManager {
  // HTTP Status Codes with descriptions
  static readonly StatusCodes = {
    // 1xx Informational
    CONTINUE: 100,
    SWITCHING_PROTOCOLS: 101,
    PROCESSING: 102,

    // 2xx Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NON_AUTHORITATIVE_INFORMATION: 203,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    PARTIAL_CONTENT: 206,

    // 3xx Redirection
    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,

    // 4xx Client Error
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,

    // 5xx Server Error
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511
  } as const;

  // Status code descriptions
  static readonly StatusMessages = {
    // 1xx Informational
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',

    // 2xx Success
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',

    // 3xx Redirection
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',

    // 4xx Client Error
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',

    // 5xx Server Error
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required'
  } as const;

  // Enterprise security specific error codes
  static readonly SecurityStatusCodes = {
    AUTHENTICATION_REQUIRED: 401,
    ACCESS_DENIED: 403,
    TOKEN_EXPIRED: 401,
    INVALID_TOKEN: 401,
    INSUFFICIENT_PERMISSIONS: 403,
    RATE_LIMITED: 429,
    SUSPICIOUS_ACTIVITY: 429,
    FRAUD_DETECTED: 403,
    THREAT_DETECTED: 403,
    SECURITY_VIOLATION: 403
  } as const;

  /**
   * Create standardized API response
   */
  static createResponse(
    statusCode: number,
    data?: any,
    message?: string,
    errors?: any[]
  ) {
    const statusMessage = this.StatusMessages[statusCode as keyof typeof this.StatusMessages] || 'Unknown Status';
    
    return {
      success: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      message: message || statusMessage,
      data: data || null,
      errors: errors || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create success response
   */
  static success(data?: any, message?: string, statusCode: number = 200) {
    return this.createResponse(statusCode, data, message);
  }

  /**
   * Create error response
   */
  static error(
    statusCode: number,
    message?: string,
    errors?: any[],
    data?: any
  ) {
    return this.createResponse(statusCode, data, message, errors);
  }

  /**
   * Authentication error responses
   */
  static authenticationRequired(message: string = 'Authentication required') {
    return this.error(this.StatusCodes.UNAUTHORIZED, message, [
      { code: 'AUTH_REQUIRED', message: 'Valid authentication token required' }
    ]);
  }

  static invalidToken(message: string = 'Invalid or expired token') {
    return this.error(this.StatusCodes.UNAUTHORIZED, message, [
      { code: 'INVALID_TOKEN', message: 'Token validation failed' }
    ]);
  }

  static accessDenied(message: string = 'Access denied') {
    return this.error(this.StatusCodes.FORBIDDEN, message, [
      { code: 'ACCESS_DENIED', message: 'Insufficient permissions for this resource' }
    ]);
  }

  /**
   * Validation error responses
   */
  static validationError(errors: any[], message: string = 'Validation failed') {
    return this.error(this.StatusCodes.UNPROCESSABLE_ENTITY, message, errors);
  }

  static badRequest(message: string = 'Bad request', errors?: any[]) {
    return this.error(this.StatusCodes.BAD_REQUEST, message, errors);
  }

  /**
   * Resource error responses
   */
  static notFound(resource: string = 'Resource') {
    return this.error(this.StatusCodes.NOT_FOUND, `${resource} not found`, [
      { code: 'NOT_FOUND', message: `The requested ${resource.toLowerCase()} could not be found` }
    ]);
  }

  static conflict(message: string = 'Conflict') {
    return this.error(this.StatusCodes.CONFLICT, message, [
      { code: 'CONFLICT', message: 'Resource conflict detected' }
    ]);
  }

  /**
   * Rate limiting responses
   */
  static rateLimited(resetTime?: number, message: string = 'Rate limit exceeded') {
    const errors = [{ code: 'RATE_LIMITED', message: 'Too many requests' }];
    if (resetTime) {
      errors.push({ code: 'RESET_TIME', message: `Rate limit resets at ${new Date(resetTime).toISOString()}` });
    }
    return this.error(this.StatusCodes.TOO_MANY_REQUESTS, message, errors);
  }

  /**
   * Security-specific responses
   */
  static fraudDetected(details?: any) {
    return this.error(this.StatusCodes.FORBIDDEN, 'Fraudulent activity detected', [
      { code: 'FRAUD_DETECTED', message: 'Transaction blocked due to fraud detection', details }
    ]);
  }

  static threatDetected(threatType?: string) {
    return this.error(this.StatusCodes.FORBIDDEN, 'Security threat detected', [
      { code: 'THREAT_DETECTED', message: `Security threat identified: ${threatType || 'unknown'}` }
    ]);
  }

  static suspiciousActivity(activity?: string) {
    return this.error(this.StatusCodes.TOO_MANY_REQUESTS, 'Suspicious activity detected', [
      { code: 'SUSPICIOUS_ACTIVITY', message: `Unusual pattern detected: ${activity || 'general'}` }
    ]);
  }

  /**
   * Server error responses
   */
  static internalError(message: string = 'Internal server error', error?: any) {
    const errors = [{ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }];
    if (process.env.NODE_ENV === 'development' && error) {
      errors.push({ code: 'DEBUG_INFO', message: error.message, stack: error.stack });
    }
    return this.error(this.StatusCodes.INTERNAL_SERVER_ERROR, message, errors);
  }

  static serviceUnavailable(service?: string) {
    return this.error(this.StatusCodes.SERVICE_UNAVAILABLE, 'Service temporarily unavailable', [
      { code: 'SERVICE_UNAVAILABLE', message: `${service || 'Service'} is currently unavailable` }
    ]);
  }

  /**
   * Payment-specific responses
   */
  static paymentRequired(message: string = 'Payment required') {
    return this.error(this.StatusCodes.PAYMENT_REQUIRED, message, [
      { code: 'PAYMENT_REQUIRED', message: 'Valid payment method required' }
    ]);
  }

  static insufficientFunds() {
    return this.error(this.StatusCodes.UNPROCESSABLE_ENTITY, 'Insufficient funds', [
      { code: 'INSUFFICIENT_FUNDS', message: 'Account balance insufficient for transaction' }
    ]);
  }

  /**
   * Check if status code indicates success
   */
  static isSuccess(statusCode: number): boolean {
    return statusCode >= 200 && statusCode < 300;
  }

  /**
   * Check if status code indicates client error
   */
  static isClientError(statusCode: number): boolean {
    return statusCode >= 400 && statusCode < 500;
  }

  /**
   * Check if status code indicates server error
   */
  static isServerError(statusCode: number): boolean {
    return statusCode >= 500 && statusCode < 600;
  }

  /**
   * Get status category
   */
  static getStatusCategory(statusCode: number): string {
    if (statusCode >= 100 && statusCode < 200) return 'informational';
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirection';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500 && statusCode < 600) return 'server_error';
    return 'unknown';
  }

  /**
   * Log response with appropriate level
   */
  static logResponse(statusCode: number, message: string, details?: any) {
    const category = this.getStatusCategory(statusCode);
    const logMessage = `[HTTP ${statusCode}] ${message}`;
    
    switch (category) {
      case 'success':
        console.log(logMessage, details);
        break;
      case 'client_error':
        console.warn(logMessage, details);
        break;
      case 'server_error':
        console.error(logMessage, details);
        break;
      default:
        console.log(logMessage, details);
    }
  }
}