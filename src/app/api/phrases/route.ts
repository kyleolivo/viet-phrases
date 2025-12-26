import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

// Create Redis client with connection pooling for serverless
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

// GET /api/phrases?syncKey=xxx - Load phrases for a sync key
export async function GET(request: NextRequest) {
  try {
    const syncKey = request.nextUrl.searchParams.get("syncKey");

    if (!syncKey) {
      return NextResponse.json(
        { error: "Sync key is required" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Retrieve phrases from Redis
    const data = await redis.get(`phrases:${syncKey}`);
    const phrases = data ? JSON.parse(data) : [];

    return NextResponse.json({
      phrases,
    });
  } catch (error) {
    console.error("Error loading phrases:", error);
    return NextResponse.json(
      { error: "Failed to load phrases" },
      { status: 500 }
    );
  }
}

// POST /api/phrases - Save phrases for a sync key
export async function POST(request: NextRequest) {
  try {
    const { syncKey, phrases } = await request.json();

    if (!syncKey) {
      return NextResponse.json(
        { error: "Sync key is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(phrases)) {
      return NextResponse.json(
        { error: "Phrases must be an array" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Save phrases to Redis (serialize to JSON)
    await redis.set(`phrases:${syncKey}`, JSON.stringify(phrases));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving phrases:", error);
    return NextResponse.json(
      { error: "Failed to save phrases" },
      { status: 500 }
    );
  }
}
