import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";
import { auth } from "@clerk/nextjs/server";

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
  const identifier = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(identifier)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { userId } = await auth();

    // For trial mode (no auth), return empty array
    // Trial users store phrases locally only
    if (!userId) {
      return NextResponse.json({
        phrases: [],
        trialMode: true,
      });
    }

    const redis = await getRedisClient();

    // Retrieve phrases from Redis using user ID
    const data = await redis.get(`phrases:${userId}`);
    const phrases = data ? JSON.parse(data) : [];

    return NextResponse.json({
      phrases,
      trialMode: false,
    });
  } catch (error) {
    console.error("Error loading phrases:", error);
    return NextResponse.json(
      { error: "Failed to load phrases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const identifier = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(identifier)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { userId } = await auth();
    const { phrases } = await request.json();

    // For trial mode (no auth), don't save to backend
    // Trial users store phrases locally only
    if (!userId) {
      return NextResponse.json({
        success: true,
        trialMode: true,
      });
    }

    if (!Array.isArray(phrases)) {
      return NextResponse.json(
        { error: "Phrases must be an array" },
        { status: 400 }
      );
    }

    if (phrases.length > 10000) {
      return NextResponse.json(
        { error: "Too many phrases (max 10000)" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Save phrases to Redis using user ID
    await redis.set(`phrases:${userId}`, JSON.stringify(phrases));

    return NextResponse.json({
      success: true,
      trialMode: false,
    });
  } catch (error) {
    console.error("Error saving phrases:", error);
    return NextResponse.json(
      { error: "Failed to save phrases" },
      { status: 500 }
    );
  }
}
