import { NextRequest } from "next/server";

export interface RequestLogData {
  timestamp: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
}

/**
 * Extracts the real IP address from the request headers.
 * Checks multiple headers in order of preference.
 */
export function getClientIp(request: NextRequest): string {
  // Check x-forwarded-for (most common in production with proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first one is the client
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    return ips[0];
  }

  // Check x-real-ip (used by some proxies)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address (may not work in serverless environments)
  return "unknown";
}

/**
 * Logs a request with all relevant tracking information.
 */
export function logRequest(data: RequestLogData): void {
  const logEntry = {
    timestamp: data.timestamp,
    method: data.method,
    path: data.path,
    ip: data.ipAddress,
    userAgent: data.userAgent,
    ...(data.userId && { userId: data.userId }),
    ...(data.statusCode && { status: data.statusCode }),
    ...(data.duration !== undefined && { duration: `${data.duration}ms` }),
    ...(data.error && { error: data.error }),
  };

  // Log to console in a structured format
  console.log('[REQUEST]', JSON.stringify(logEntry));
}

/**
 * Creates a request logger that tracks the full lifecycle of a request.
 */
export function createRequestLogger(request: NextRequest) {
  const startTime = Date.now();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const method = request.method;
  const path = request.nextUrl.pathname;

  return {
    ipAddress,
    userAgent,

    /**
     * Logs the completion of a request
     */
    logComplete(statusCode: number, userId?: string): void {
      const duration = Date.now() - startTime;
      logRequest({
        timestamp: new Date().toISOString(),
        method,
        path,
        ipAddress,
        userAgent,
        userId,
        statusCode,
        duration,
      });
    },

    /**
     * Logs a request that resulted in an error
     */
    logError(statusCode: number, error: string, userId?: string): void {
      const duration = Date.now() - startTime;
      logRequest({
        timestamp: new Date().toISOString(),
        method,
        path,
        ipAddress,
        userAgent,
        userId,
        statusCode,
        duration,
        error,
      });
    },
  };
}
