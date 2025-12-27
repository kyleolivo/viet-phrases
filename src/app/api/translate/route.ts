import { NextRequest, NextResponse } from "next/server";

const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests = 20, windowMs = 60000): boolean {
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

export async function POST(request: NextRequest) {
  const identifier = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(identifier)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json({ error: "Text cannot be empty" }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ error: "Text is too long (max 500 characters)" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `You are a Vietnamese language helper. The user wants to communicate something in Vietnamese.

Given the English input below, provide:
1. The simplest, most natural Vietnamese phrase to convey this meaning (not a literal translation)
2. A phonetic pronunciation guide for English speakers using this format:
   - Write each syllable with English-friendly spelling
   - Add tone arrows after each syllable: → (level), ↗ (rising), ↘ (falling), ↷ (dipping), ↓ (drop)
   - Example: "sin→ chow↘" for "Xin chào"
3. A category for this phrase (one of: greetings, food, directions, shopping, emergencies, social, transport, numbers, questions, or general)

Input: "${text}"

Respond in this exact JSON format only, no other text:
{"vietnamese": "...", "phonetic": "...", "category": "..."}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return NextResponse.json(
        { error: "Translation service error" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: "No translation received" },
        { status: 500 }
      );
    }

    // Parse the JSON response from Claude
    // Strip markdown code fences if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      // Remove opening ```json or ``` and closing ```
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonContent);

    return NextResponse.json({
      vietnamese: parsed.vietnamese,
      phonetic: parsed.phonetic,
      category: parsed.category,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
