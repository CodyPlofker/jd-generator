import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Extract base64 data and media type
    const matches = image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/s);
    if (!matches) {
      console.error("Image regex failed. Image starts with:", image.substring(0, 50));
      return NextResponse.json(
        { error: "Invalid image format. Expected base64 data URL." },
        { status: 400 }
      );
    }

    const mediaType = matches[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const imageData = matches[2];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: "text",
              text: `Analyze this ad creative image and identify the copy/text placement zones.

For each text zone you see (or where text should go), identify:
1. Zone name (e.g., "headline", "subhead", "body", "cta", "badge", "before-label", "after-label", etc.)
2. Position (e.g., "top-center", "bottom-left", "overlay-center", etc.)
3. Style (e.g., "bold", "subtle", "small-caps", "handwritten", etc.)
4. Estimated max characters based on the space available
5. Whether it appears required or optional for this format

Also provide:
- Overall style notes for this ad format
- What types of products/campaigns this format works best for

Return your analysis as valid JSON in this exact format:
{
  "formatSuggestion": "Short descriptive name for this format",
  "copyPlacements": [
    {
      "zone": "headline",
      "position": "top-center",
      "style": "bold",
      "maxChars": 40,
      "required": true,
      "description": "Main attention-grabbing headline"
    }
  ],
  "styleNotes": "Overall style description",
  "bestFor": ["product type 1", "campaign type 2"]
}

Only return the JSON, no other text.`,
            },
          ],
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No analysis generated" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(textContent.text);
      return NextResponse.json(analysis);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return NextResponse.json(analysis);
      }
      return NextResponse.json(
        { error: "Failed to parse analysis", raw: textContent.text },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
