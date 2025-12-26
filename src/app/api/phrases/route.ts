import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

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

    // Retrieve phrases from KV store
    const phrases = await kv.get(`phrases:${syncKey}`);

    return NextResponse.json({
      phrases: phrases || [],
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

    // Save phrases to KV store
    await kv.set(`phrases:${syncKey}`, phrases);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving phrases:", error);
    return NextResponse.json(
      { error: "Failed to save phrases" },
      { status: 500 }
    );
  }
}
