import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// Load API key from .env.local file directly as fallback
function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fallback: read from .env.local directly
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

// Cache the API key on module load to avoid repeated file reads
const CACHED_API_KEY = getApiKey();

const TRAINING_DATA_DIR = path.join(process.cwd(), "training-data");

function readTrainingFile(relativePath: string): string {
  try {
    const fullPath = path.join(TRAINING_DATA_DIR, relativePath);
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

function getPersonaContent(personaId: string): string {
  const personaMap: Record<string, string> = {
    "dedicated-educator": "personas/the-dedicated-educator.md",
    "ageless-matriarch": "personas/the-ageless-matriarch.md",
    "high-powered-executive": "personas/the-high-powered-executive.md",
    "wellness-healthcare-practitioner": "personas/the-wellness-healthcare-practitioner.md",
    "busy-suburban-supermom": "personas/the-busy-suburban-supermom.md",
    "creative-entrepreneur": "personas/the-creative-entrepreneur.md",
    educator: "personas/the-dedicated-educator.md",
    matriarch: "personas/the-ageless-matriarch.md",
    executive: "personas/the-high-powered-executive.md",
    healthcare: "personas/the-wellness-healthcare-practitioner.md",
    supermom: "personas/the-busy-suburban-supermom.md",
    creative: "personas/the-creative-entrepreneur.md",
  };

  if (!personaId || !personaMap[personaId]) {
    return "";
  }

  return readTrainingFile(personaMap[personaId]);
}

function buildSystemPrompt(personaId: string): string {
  // Core brand voice - try new location first, then legacy
  let brandVoiceGuide = readTrainingFile("brand/brand-voice-guide.md");
  if (!brandVoiceGuide) {
    brandVoiceGuide = readTrainingFile("brand-voice/tone-guidelines.md");
  }
  const exampleCopy = readTrainingFile("brand-voice/example-copy.md");

  // Customer reviews for authentic voice
  const customerReviews = readTrainingFile("reviews/customer-reviews.md");

  // Product catalog
  const productCatalog = readTrainingFile("products/products.json");

  // Compliance/Regulatory rules
  const complianceRules = readTrainingFile("compliance/product-claims.md");

  // Frameworks
  const awarenessLevels = readTrainingFile("frameworks/awareness-levels.md");
  const marketSophistication = readTrainingFile("frameworks/market-sophistication.md");
  const uniqueMechanism = readTrainingFile("frameworks/unique-mechanism.md");

  // Channel-specific (brief generator is for meta ads / static creatives)
  const channelContent = readTrainingFile("channels/meta-ads.md");

  // Persona-specific
  const personaContent = getPersonaContent(personaId);

  let systemPrompt = `You are an expert copywriter for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown. Your job is to generate on-brand copy that follows the Jones Road voice and proven direct response frameworks.

## BRAND VOICE GUIDELINES

${brandVoiceGuide}

## EXAMPLE COPY (Reference for tone and style)

${exampleCopy}

## REAL CUSTOMER REVIEWS (Use for authentic voice and social proof)

${customerReviews ? customerReviews.substring(0, 8000) : "No reviews loaded"}

## PRODUCT CATALOG

${productCatalog ? productCatalog.substring(0, 4000) : "No product catalog loaded"}

## REGULATORY COMPLIANCE - CRITICAL

${complianceRules ? complianceRules : "No compliance rules loaded"}

## DIRECT RESPONSE FRAMEWORKS

### Awareness Levels
${awarenessLevels}

### Market Sophistication
${marketSophistication}

### Unique Mechanism
${uniqueMechanism}

## CHANNEL-SPECIFIC GUIDELINES

${channelContent}
`;

  if (personaContent) {
    systemPrompt += `
## TARGET PERSONA

${personaContent}
`;
  }

  systemPrompt += `
## YOUR TASK

Generate copy that:
1. Sounds authentically like Jones Road (confident, effortless, never try-hard)
2. Follows the channel-specific best practices
3. Speaks to the target persona's motivations and pain points (if specified)
4. Incorporates unique mechanism thinking when relevant

IMPORTANT:
- Never use words Jones Road avoids (anti-aging, flawless, revolutionary, etc.)
- Use soft benefit language (comfort, enhance, support - not fight, eliminate, combat)
- Remember: beauty is a Level 5 market - lead with identity, not just claims

REGULATORY COMPLIANCE - CRITICAL:
- ONLY use product claims that are explicitly listed in the Regulatory Compliance section above
- Never claim "long-wear", "all-day wear", or specific percentages unless explicitly approved for that product
- Never claim "non-comedogenic" or "dermatologist tested" unless listed for that specific product
- Never claim "24-hour hydration" unless it's listed in the product's approved claims
- When in doubt, use softer language like "helps", "may improve", or "designed to"
`;

  return systemPrompt;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = CACHED_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const body = await request.json();
    const { persona, product, angle, angleNotes, format } = body;

    if (!persona || !product || !angle || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure copyPlacements exists and is an array
    const copyPlacements = format?.specs?.copyPlacements || [];
    if (copyPlacements.length === 0) {
      return NextResponse.json({
        copy: "Copy zones not configured. Please add copy placements to this ad format."
      });
    }

    // Build detailed zone specs matching the main generator format
    const copyZoneSpecs = copyPlacements.map((p: { zone: string; position: string; style: string; maxChars: number; required: boolean; description?: string }) => `
### ${p.zone.toUpperCase()}
- Max Characters: **${p.maxChars}** (STRICT LIMIT - do not exceed)
- Position: ${p.position}
- Style: ${p.style}
- Required: ${p.required ? "Yes" : "No"}
${p.description ? `- Guidelines: ${p.description}` : ""}`).join("\n");

    // Check if this is a general brand ad (no specific product)
    const isGeneralBrandAd = product.id === 'general' || product.id === 'brand-value-props';

    const productSection = isGeneralBrandAd
      ? `BRAND: Jones Road Beauty
- Clean beauty brand founded by Bobbi Brown
- Philosophy: Less is more, real skin, effortless beauty
- Key messaging: Clean ingredients, easy application, makeup that works with your skin`
      : `PRODUCT: ${product.name} (${product.price})
- ${product.description || "No description"}
- Key benefits: ${(product.keyBenefits || []).join(", ") || "Not specified"}
- Best for: ${product.bestFor || "Everyone"}`;

    const systemPrompt = buildSystemPrompt(persona.id || "");

    const userPrompt = `Generate ad copy for the following brief:

PERSONA: ${persona.name}
- ${persona.overview || "No overview"}
- Key motivations: ${(persona.keyMotivations || []).join(", ") || "Not specified"}

${productSection}

ANGLE TO EMPHASIZE: ${angle}
${angleNotes ? `ADDITIONAL ANGLE NOTES: ${angleNotes}` : ''}

## AD FORMAT: ${format.name}

This ad uses a specific format with defined copy zones. Generate copy for EACH zone below.

**CRITICAL: You MUST respect the character limits. Count your characters. If your copy exceeds the limit, rewrite it shorter.**

${copyZoneSpecs}

${format.specs.styleNotes ? `Style notes: ${format.specs.styleNotes}` : ""}
${format.specs.bestFor ? `Best for: ${format.specs.bestFor.join(", ")}` : ""}

Write compelling, conversion-focused copy for each zone. The copy should:
1. Speak directly to the ${persona.name} persona's motivations
2. Lead with the "${angle}" angle
${isGeneralBrandAd ? '3. Focus on Jones Road Beauty brand values and philosophy' : `3. Highlight ${product.name}'s benefits naturally`}
4. Use Jones Road's voice: confident, honest, no-BS, warm but direct
5. Avoid: excessive emojis, clickbait, fake urgency, "clean beauty" clichés

**IMPORTANT:**
- Count characters for each zone before outputting
- If copy is too long, rewrite it shorter - do not exceed limits
- Character limits exist because designers need copy that fits the visual layout
- Shorter, punchier copy is almost always better
- For any LIST zones (like benefits-list), output EACH ITEM on its own line:
  1. First item
  2. Second item
  3. Third item
  (NOT as a paragraph - designers need to see each item separately)

## OUTPUT FORMAT
For each zone defined above, output in this exact format:

[ZONE-NAME]
[Your copy here - MUST be under the character limit]

Provide 2-3 variations for the main headline/hook zones.

Output only the copy - no explanations, no meta-commentary. Just the ready-to-use copy.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract the text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    return NextResponse.json({ copy: textContent.text });
  } catch (error) {
    console.error("Error generating brief copy:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate copy: ${errorMessage}` },
      { status: 500 }
    );
  }
}
