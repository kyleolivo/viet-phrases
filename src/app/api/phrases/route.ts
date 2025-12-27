import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";
import { createRequestLogger, getClientIp } from "@/lib/logger";

const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimit.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    await redisClient.connect();
  }

  return redisClient;
}

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);
  const identifier = getClientIp(request);

  if (!checkRateLimit(identifier)) {
    logger.logError(429, "Rate limit exceeded");
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const syncKey = request.nextUrl.searchParams.get("syncKey");

    if (!syncKey || typeof syncKey !== "string") {
      logger.logError(400, "Sync key is required");
      return NextResponse.json(
        { error: "Sync key is required" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9]{6,32}$/.test(syncKey)) {
      logger.logError(400, "Invalid sync key format", syncKey);
      return NextResponse.json(
        { error: "Invalid sync key format" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Retrieve phrases from Redis
    const data = await redis.get(`phrases:${syncKey}`);
    const phrases = data ? JSON.parse(data) : [];

    logger.logComplete(200, syncKey);
    return NextResponse.json({
      phrases,
    });
  } catch (error) {
    console.error("Error loading phrases:", error);
    const syncKey = request.nextUrl.searchParams.get("syncKey") || undefined;
    logger.logError(500, error instanceof Error ? error.message : "Failed to load phrases", syncKey);
    return NextResponse.json(
      { error: "Failed to load phrases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);
  const identifier = getClientIp(request);

  if (!checkRateLimit(identifier)) {
    logger.logError(429, "Rate limit exceeded");
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let syncKey: string | undefined;

  try {
    const body = await request.json();
    syncKey = body.syncKey;
    const phrases = body.phrases;

    if (!syncKey || typeof syncKey !== "string") {
      logger.logError(400, "Sync key is required");
      return NextResponse.json(
        { error: "Sync key is required" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9]{6,32}$/.test(syncKey)) {
      logger.logError(400, "Invalid sync key format", syncKey);
      return NextResponse.json(
        { error: "Invalid sync key format" },
        { status: 400 }
      );
    }

    if (!Array.isArray(phrases)) {
      logger.logError(400, "Phrases must be an array", syncKey);
      return NextResponse.json(
        { error: "Phrases must be an array" },
        { status: 400 }
      );
    }

    if (phrases.length > 10000) {
      logger.logError(400, "Too many phrases", syncKey);
      return NextResponse.json(
        { error: "Too many phrases (max 10000)" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Save phrases to Redis (serialize to JSON)
    await redis.set(`phrases:${syncKey}`, JSON.stringify(phrases));

    logger.logComplete(200, syncKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving phrases:", error);
    logger.logError(500, error instanceof Error ? error.message : "Failed to save phrases", syncKey);
    return NextResponse.json(
      { error: "Failed to save phrases" },
      { status: 500 }
    );
  }
}
