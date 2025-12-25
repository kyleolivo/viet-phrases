import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
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
    const parsed = JSON.parse(content);

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
