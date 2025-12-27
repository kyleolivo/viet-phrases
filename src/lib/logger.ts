import { NextRequest } from "next/server";
import { Axiom } from "@axiomhq/js";

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

let axiomClient: Axiom | null = null;

function getAxiomClient(): Axiom | null {
  if (!process.env.AXIOM_TOKEN || !process.env.AXIOM_DATASET) {
    return null;
  }

  if (!axiomClient) {
    axiomClient = new Axiom({
      token: process.env.AXIOM_TOKEN,
    });
  }

  return axiomClient;
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
 * Logs to console in structured JSON format for ingestion by Vercel Log Drains.
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
    ...(data.duration !== undefined && { duration: data.duration }),
    ...(data.error && { error: data.error }),
  };

  // Log to console in structured JSON format
  // This will be captured by Vercel Log Drains and sent to Axiom
  console.log(JSON.stringify({ type: 'request', ...logEntry }));
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

/**
 * Query logs from Axiom by IP address
 * @param ipAddress - The IP address to query logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of log entries
 */
export async function getLogsByIp(ipAddress: string, limit: number = 100): Promise<any[]> {
  const axiom = getAxiomClient();
  if (!axiom) {
    console.error('Axiom client not configured. Set AXIOM_TOKEN and AXIOM_DATASET environment variables.');
    return [];
  }

  try {
    const dataset = process.env.AXIOM_DATASET!;

    // Query Axiom using APL (Axiom Processing Language)
    const result = await axiom.query(
      `${dataset} | where type == "request" and ip == "${ipAddress}" | order by _time desc | limit ${limit}`
    );

    return result.matches || [];
  } catch (error) {
    console.error('Failed to query logs from Axiom:', error);
    return [];
  }
}

/**
 * Query logs from Axiom by user ID (sync key)
 * @param userId - The user ID (sync key) to query logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of log entries
 */
export async function getLogsByUser(userId: string, limit: number = 100): Promise<any[]> {
  const axiom = getAxiomClient();
  if (!axiom) {
    console.error('Axiom client not configured. Set AXIOM_TOKEN and AXIOM_DATASET environment variables.');
    return [];
  }

  try {
    const dataset = process.env.AXIOM_DATASET!;

    // Query Axiom using APL (Axiom Processing Language)
    const result = await axiom.query(
      `${dataset} | where type == "request" and userId == "${userId}" | order by _time desc | limit ${limit}`
    );

    return result.matches || [];
  } catch (error) {
    console.error('Failed to query logs from Axiom:', error);
    return [];
  }
}

/**
 * Query all logs from Axiom within a time range
 * @param startTime - Start timestamp (ISO 8601 string)
 * @param endTime - End timestamp (ISO 8601 string)
 * @param limit - Maximum number of logs to return (default: 1000)
 * @returns Array of log entries
 */
export async function getLogsByTimeRange(
  startTime: string,
  endTime: string,
  limit: number = 1000
): Promise<any[]> {
  const axiom = getAxiomClient();
  if (!axiom) {
    console.error('Axiom client not configured. Set AXIOM_TOKEN and AXIOM_DATASET environment variables.');
    return [];
  }

  try {
    const dataset = process.env.AXIOM_DATASET!;

    // Query Axiom using APL with time range
    const result = await axiom.query(
      `${dataset} | where type == "request" and _time >= datetime("${startTime}") and _time <= datetime("${endTime}") | order by _time desc | limit ${limit}`,
      {
        startTime,
        endTime,
      }
    );

    return result.matches || [];
  } catch (error) {
    console.error('Failed to query logs from Axiom:', error);
    return [];
  }
}
