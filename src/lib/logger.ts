import { NextRequest } from "next/server";
import { createClient } from "redis";

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

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => console.error('Redis Logger Client Error', err));

    await redisClient.connect();
  }

  return redisClient;
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
 * Persists to both console and Redis for durability.
 */
export async function logRequest(data: RequestLogData): Promise<void> {
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

  const logString = JSON.stringify(logEntry);

  // Log to console in a structured format for immediate visibility
  console.log('[REQUEST]', logString);

  // Persist to Redis for historical analysis
  try {
    const redis = await getRedisClient();
    const timestamp = new Date(data.timestamp).getTime();

    // Store in a global sorted set by timestamp (score)
    // This allows querying logs by time range
    await redis.zAdd('logs:all', {
      score: timestamp,
      value: logString,
    });

    // Store in IP-specific sorted set for tracking individual users
    await redis.zAdd(`logs:ip:${data.ipAddress}`, {
      score: timestamp,
      value: logString,
    });

    // If userId is provided, also store in user-specific sorted set
    if (data.userId) {
      await redis.zAdd(`logs:user:${data.userId}`, {
        score: timestamp,
        value: logString,
      });
    }

    // Set expiration on the global log (keep logs for 30 days)
    await redis.expire('logs:all', 30 * 24 * 60 * 60);

    // Set expiration on IP-specific logs (keep for 30 days)
    await redis.expire(`logs:ip:${data.ipAddress}`, 30 * 24 * 60 * 60);

    // Set expiration on user-specific logs (keep for 30 days)
    if (data.userId) {
      await redis.expire(`logs:user:${data.userId}`, 30 * 24 * 60 * 60);
    }

    // Keep only the most recent 100,000 entries in the global log to prevent unbounded growth
    const globalCount = await redis.zCard('logs:all');
    if (globalCount > 100000) {
      // Remove oldest entries, keeping only the most recent 100,000
      await redis.zRemRangeByRank('logs:all', 0, globalCount - 100001);
    }

  } catch (error) {
    // If Redis logging fails, continue - don't block the request
    console.error('Failed to persist log to Redis:', error);
  }
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
    async logComplete(statusCode: number, userId?: string): Promise<void> {
      const duration = Date.now() - startTime;
      await logRequest({
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
    async logError(statusCode: number, error: string, userId?: string): Promise<void> {
      const duration = Date.now() - startTime;
      await logRequest({
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

/**
 * Query logs from Redis by IP address
 * @param ipAddress - The IP address to query logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of log entries
 */
export async function getLogsByIp(ipAddress: string, limit: number = 100): Promise<RequestLogData[]> {
  try {
    const redis = await getRedisClient();

    // Get the most recent logs for this IP (sorted in descending order)
    const logs = await redis.zRange(`logs:ip:${ipAddress}`, -limit, -1, { REV: true });

    return logs.map(log => JSON.parse(log));
  } catch (error) {
    console.error('Failed to query logs from Redis:', error);
    return [];
  }
}

/**
 * Query logs from Redis by user ID (sync key)
 * @param userId - The user ID (sync key) to query logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of log entries
 */
export async function getLogsByUser(userId: string, limit: number = 100): Promise<RequestLogData[]> {
  try {
    const redis = await getRedisClient();

    // Get the most recent logs for this user (sorted in descending order)
    const logs = await redis.zRange(`logs:user:${userId}`, -limit, -1, { REV: true });

    return logs.map(log => JSON.parse(log));
  } catch (error) {
    console.error('Failed to query logs from Redis:', error);
    return [];
  }
}

/**
 * Query all logs from Redis within a time range
 * @param startTime - Start timestamp (milliseconds since epoch)
 * @param endTime - End timestamp (milliseconds since epoch)
 * @param limit - Maximum number of logs to return (default: 1000)
 * @returns Array of log entries
 */
export async function getLogsByTimeRange(
  startTime: number,
  endTime: number,
  limit: number = 1000
): Promise<RequestLogData[]> {
  try {
    const redis = await getRedisClient();

    // Get logs within the time range
    const logs = await redis.zRangeByScore('logs:all', startTime, endTime, {
      LIMIT: { offset: 0, count: limit }
    });

    return logs.map(log => JSON.parse(log));
  } catch (error) {
    console.error('Failed to query logs from Redis:', error);
    return [];
  }
}
