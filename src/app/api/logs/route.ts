import { NextRequest, NextResponse } from "next/server";
import { getLogsByIp, getLogsByUser, getLogsByTimeRange } from "@/lib/logger";

/**
 * API endpoint to query request logs
 *
 * Query parameters:
 * - ip: Query logs by IP address
 * - user: Query logs by user ID (sync key)
 * - startTime: Start timestamp for time range query (milliseconds since epoch)
 * - endTime: End timestamp for time range query (milliseconds since epoch)
 * - limit: Maximum number of logs to return (default varies by query type)
 *
 * Examples:
 * - /api/logs?ip=192.168.1.1&limit=50
 * - /api/logs?user=mysynkey123&limit=100
 * - /api/logs?startTime=1640000000000&endTime=1640086400000
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.nextUrl.searchParams.get("ip");
    const user = request.nextUrl.searchParams.get("user");
    const startTimeStr = request.nextUrl.searchParams.get("startTime");
    const endTimeStr = request.nextUrl.searchParams.get("endTime");
    const limitStr = request.nextUrl.searchParams.get("limit");

    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // Query by IP address
    if (ip) {
      const logs = await getLogsByIp(ip, limit);
      return NextResponse.json({
        query: { type: "ip", value: ip },
        count: logs.length,
        logs,
      });
    }

    // Query by user ID (sync key)
    if (user) {
      const logs = await getLogsByUser(user, limit);
      return NextResponse.json({
        query: { type: "user", value: user },
        count: logs.length,
        logs,
      });
    }

    // Query by time range
    if (startTimeStr && endTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      const endTime = parseInt(endTimeStr, 10);

      if (isNaN(startTime) || isNaN(endTime)) {
        return NextResponse.json(
          { error: "Invalid timestamp format" },
          { status: 400 }
        );
      }

      const logs = await getLogsByTimeRange(startTime, endTime, limit);
      return NextResponse.json({
        query: { type: "timeRange", startTime, endTime },
        count: logs.length,
        logs,
      });
    }

    // No valid query parameters provided
    return NextResponse.json(
      {
        error: "Missing query parameters. Provide 'ip', 'user', or 'startTime' and 'endTime'",
        examples: [
          "/api/logs?ip=192.168.1.1&limit=50",
          "/api/logs?user=mysynkey123&limit=100",
          "/api/logs?startTime=1640000000000&endTime=1640086400000",
        ],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error querying logs:", error);
    return NextResponse.json(
      { error: "Failed to query logs" },
      { status: 500 }
    );
  }
}
