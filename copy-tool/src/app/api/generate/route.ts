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

// Log once on startup so you know if the key is configured
if (CACHED_API_KEY) {
  console.log(`[API] Anthropic API key loaded (${CACHED_API_KEY.substring(0, 12)}...)`);
} else {
  console.error("[API] WARNING: No Anthropic API key found!");
}

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

function getChannelContent(channelId: string, landingPageType?: string): string {
  const channelMap: Record<string, string> = {
    "meta-ads": "channels/meta-ads.md",
    email: "channels/email.md",
    sms: "channels/sms.md",
    "product-page": "channels/product-page.md",
    "landing-page": "channels/landing-page.md",
  };

  if (!channelId || !channelMap[channelId]) {
    return "";
  }

  let content = readTrainingFile(channelMap[channelId]);

  // For landing pages, also load type-specific training data
  if (channelId === "landing-page" && landingPageType) {
    const typeContent = readTrainingFile(`channels/landing-page-${landingPageType}.md`);
    if (typeContent) {
      content += `\n\n## ${landingPageType.toUpperCase()} LANDING PAGE SPECIFIC GUIDELINES\n\n${typeContent}`;
    }
  }

  return content;
}

function buildSystemPrompt(
  channel: string,
  persona: string,
  awareness: string,
  landingPageType?: string
): string {
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

  // Frameworks
  const awarenessLevels = readTrainingFile("frameworks/awareness-levels.md");
  const marketSophistication = readTrainingFile("frameworks/market-sophistication.md");
  const uniqueMechanism = readTrainingFile("frameworks/unique-mechanism.md");

  // Channel-specific
  const channelContent = getChannelContent(channel, landingPageType);

  // Persona-specific
  const personaContent = getPersonaContent(persona);

  let systemPrompt = `You are an expert copywriter for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown. Your job is to generate on-brand copy that follows the Jones Road voice and proven direct response frameworks.

## BRAND VOICE GUIDELINES

${brandVoiceGuide}

## EXAMPLE COPY (Reference for tone and style)

${exampleCopy}

## REAL CUSTOMER REVIEWS (Use for authentic voice and social proof)

${customerReviews ? customerReviews.substring(0, 8000) : "No reviews loaded"}

## PRODUCT CATALOG

${productCatalog ? productCatalog.substring(0, 4000) : "No product catalog loaded"}

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

  if (awareness) {
    systemPrompt += `
## AWARENESS LEVEL FOCUS
The user has specified that the target audience is at the "${awareness}" awareness level. Adjust your copy accordingly:
- Unaware: Lead with story, identity, or curiosity - not product
- Problem Aware: Agitate the problem, then introduce the solution category
- Solution Aware: Differentiate your approach, explain the unique mechanism
- Product Aware: Focus on proof, testimonials, overcome objections
- Most Aware: Make an offer, create urgency, remind them why they wanted it
`;
  }

  systemPrompt += `
## YOUR TASK

Generate copy that:
1. Sounds authentically like Jones Road (confident, effortless, never try-hard)
2. Follows the channel-specific best practices
3. Speaks to the target persona's motivations and pain points (if specified)
4. Uses the appropriate awareness level approach
5. Incorporates unique mechanism thinking when relevant

IMPORTANT:
- Never use words Jones Road avoids (anti-aging, flawless, revolutionary, etc.)
- Use soft benefit language (comfort, enhance, support - not fight, eliminate, combat)
- Remember: beauty is a Level 5 market - lead with identity, not just claims
- Keep the appropriate length and tone for the selected channel

Output only the copy - no explanations, no meta-commentary. Just the ready-to-use copy.
`;

  return systemPrompt;
}

// Load ad format specs
function getAdFormatSpecs(formatId: string): { name: string; specs: { copyPlacements: Array<{ zone: string; position: string; style: string; maxChars: number; required: boolean }>; styleNotes: string; bestFor: string[] } } | null {
  if (!formatId) return null;

  try {
    const formatsPath = path.join(TRAINING_DATA_DIR, "ad-formats/ad-formats.json");
    const formats = JSON.parse(fs.readFileSync(formatsPath, "utf-8"));
    return formats.find((f: { id: string }) => f.id === formatId) || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { persona, channel, landingPageType, bulletCount, smsType, emailType, metaAdType, adFormatId, awareness, productInfo, angle, referenceImage } = await request.json();

    if (!channel || !productInfo) {
      return NextResponse.json(
        { error: "Channel and product info are required" },
        { status: 400 }
      );
    }

    // Use cached API key
    const apiKey = CACHED_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = buildSystemPrompt(channel, persona, awareness, landingPageType);

    let userPrompt = `Generate ${channel.replace("-", " ")} copy for:\n\nProduct/Offer: ${productInfo}`;

    if (angle) {
      userPrompt += `\n\nAngle/Hook: ${angle}`;
    }

    if (persona) {
      userPrompt += `\n\nTarget Persona: ${persona}`;
    }

    // Load ad format if specified
    const adFormat = adFormatId ? getAdFormatSpecs(adFormatId) : null;

    const channelInstructions: Record<string, string> = {
      "meta-ads": metaAdType === "static-creative" ? `
Generate copy for a STATIC CREATIVE (image ad with text overlays).

${adFormat ? `## AD FORMAT: ${adFormat.name}

This ad uses a specific format with defined copy zones. Generate copy for EACH zone below:

${adFormat.specs.copyPlacements.map((p: { zone: string; position: string; style: string; maxChars: number; required: boolean }) => `
### ${p.zone.toUpperCase()}
- Position: ${p.position}
- Style: ${p.style}
- Required: ${p.required ? "Yes" : "No"}
`).join("")}

Style notes: ${adFormat.specs.styleNotes}
Best for: ${adFormat.specs.bestFor.join(", ")}

## OUTPUT FORMAT
For each zone defined above:

### [ZONE NAME]
**Copy:** [Your generated copy]

Provide 2-3 variations for the main headline/hook zones.` : referenceImage ? `## REFERENCE CREATIVE ANALYSIS
I've uploaded a reference creative image. Please:
1. Analyze the layout and identify ALL text placement zones (headline, subhead, body text, CTA button, badges, etc.)
2. Note the style for each zone
3. Generate Jones Road copy for EACH text zone you identify

## OUTPUT FORMAT
For each text zone identified in the reference:

### [ZONE NAME] (e.g., "Main Headline", "Subhead", "Body Text", "CTA Button")
**Position:** [Where it appears - top, center, bottom, etc.]
**Style:** [Large/bold, small/subtle, etc.]
**Copy:** [Your generated copy]

Provide 2-3 variations for the main headline/hook.` : `## OUTPUT FORMAT
Generate copy for a static creative with these common zones:

### CREATIVE HEADLINE
[Main text overlay - bold, attention-grabbing, 3-8 words]
Provide 3-5 variations with different hooks.

### CREATIVE SUBHEAD (if applicable)
[Secondary text - supports the headline, 5-15 words]

### BODY TEXT (if applicable)
[Longer supporting copy if the layout calls for it - 1-2 sentences max]

### CTA TEXT
[Button or action text - 2-4 words, action-oriented]

Keep all copy SHORT and punchy - this goes ON the image, not in Meta's text fields.`}` : `
Generate META AD COPY (the text fields around the ad, not on the image):

## OUTPUT FORMAT

### PRIMARY TEXT
[The main copy that appears above the image in the feed - can be longer, 1-3 paragraphs]
Provide 2-3 variations with different hooks/angles.

### HEADLINE
[Short, punchy text that appears on or below the image - 5-10 words max]
Provide 3-5 variations.

### LINK DESCRIPTION
[Secondary text in the link preview - supports the headline - 1 sentence]`,
      email: emailType ? `
Generate email copy for type: ${emailType.replace(/-/g, " ").toUpperCase()}

## EMAIL TYPE GUIDELINES
${emailType === "gtl" ? "Goal: Showcase a polished, editorial makeup look and guide readers through recreating it step by step. Include step-by-step products list in order of application." : ""}
${emailType === "plain-text" ? "Goal: Create an intimate, personal connection. Feels like a note from a friend or founder. Use first-person voice, short paragraphs, minimal design feel. Warm and authentic." : ""}
${emailType === "product-spotlight" ? "Goal: Shine a light on ONE product. Deep dive into benefits, why it works, and who it's for. Educational, confident, not pushy." : ""}
${emailType === "product-roundup" ? "Goal: Curate a collection of products around a theme (season, skin type, occasion, vibe). Include 3-6 products with short descriptions. Editorial and curated." : ""}
${emailType === "back-in-stock" ? "Goal: Create urgency around a previously sold-out item returning. Brief reminder of why it sold out, key benefits, urgency note. Excited but not hypey." : ""}
${emailType === "product-launch" ? "Goal: Announce a brand-new product with excitement and anticipation. Include what's new, what makes it different, who it's for, and key benefits." : ""}
${emailType === "teaser" ? "Goal: Build anticipation before a launch. Create curiosity without revealing everything. Brief, intriguing, leave questions unanswered. Mysterious and exciting." : ""}
${emailType === "retail-event" ? "Goal: Drive attendance to an in-person event or experience. Include date, time, location, what to expect, why they should come. Inviting and exclusive." : ""}
${emailType === "promotional" ? "Goal: Announce a promotion, sale, or gift-with-purchase offer. Include offer details, qualifying purchase amount, expiration. Exciting but not desperate." : ""}
${emailType === "set-kit" ? "Goal: Promote a bundled set or kit, emphasizing value and convenience. Include what's inside list, the story behind the kit, who it's for, savings. Helpful and value-focused." : ""}
${emailType === "how-to-problem" ? "Goal: Address a common problem and position the product as the solution. Empathize with the issue, introduce the solution, explain how it works. Understanding and educational." : ""}
${emailType === "duos" ? "Goal: Show how two products work better together. Explain why they complement each other, how to use together. Helpful, like a recommendation from a friend." : ""}
${emailType === "shade-roundup" ? "Goal: Showcase shade range or highlight specific shades for different needs. Include shade breakdown with descriptions and skin tone recommendations. Inclusive and helpful." : ""}
${emailType === "how-to-tutorial" ? "Goal: Educate on how to apply or use a specific product. Include step-by-step instructions (3-5 steps max), pro tips. Instructional and empowering." : ""}
${emailType === "social-proof" ? "Goal: Build credibility through customer reviews or press quotes. Include 2-4 curated reviews or press quotes. Let others do the talking." : ""}

## OUTPUT FORMAT
Generate email copy with these sections:

### SUBJECT LINES (3-5 options)
1. [Subject line option 1]
2. [Subject line option 2]
3. [Subject line option 3]
4. [Subject line option 4]
5. [Subject line option 5]

### PREVIEW TEXT
[Preview text that complements subject line - extends it, doesn't repeat]

### HEADLINE
[Main headline for the email body]

### BODY COPY
[Email body copy - adjust format based on email type]

### CTA
[Primary call-to-action button text]

Follow the email framework from training data. Keep subject lines under 50 characters when possible.` : `
Generate email copy with:
- Subject Line (3-5 options)
- Preview Text
- Body Copy
- CTA Button Text`,
      sms: smsType ? `
Generate SMS copy for type: ${smsType.replace("-", " ").toUpperCase()}

## SMS TYPE GUIDELINES
${smsType === "product-launch" ? "Goal: Announce a brand-new product. Highlight what's new, different, and exciting." : ""}
${smsType === "product-spotlight" ? "Goal: Focus on one hero product. Emphasize key benefits, why we love it, problem it solves, when/how to use. Adding seasonality is a plus." : ""}
${smsType === "product-roundup" ? "Goal: Highlight a group of products under a common theme. Great for editorial-style curation." : ""}
${smsType === "category-push" ? "Goal: Drive traffic to a specific category. Reinforce with a seasonal or need-based hook." : ""}
${smsType === "social-proof" ? "Goal: Use short customer quotes or review snippets to validate the product. Great for nudging those on the fence." : ""}
${smsType === "sale-promo" ? "Goal: Announce a promotion — % off, sitewide promos, or bundles. Lead with the offer and urgency." : ""}
${smsType === "reminder" ? "Goal: Close out offers or push final hours of a sale. Keep it punchy, direct, and urgent." : ""}
${smsType === "educational" ? "Goal: Share quick how-to content, step routines, or problem-solution approaches." : ""}
${smsType === "cross-sell" ? "Goal: Suggest complementary products after purchase or to pair with their faves." : ""}

## OUTPUT FORMAT
Generate 2-3 SMS variations. Each must:
- Stay UNDER 120 characters (including spaces and line breaks)
- Have a strong hook as the first line
- Include 1-2 sentences of body copy
- End with a clear CTA and [link] placeholder
- NO emojis
- Use line breaks for readability

Format each variation like this:
### SMS VARIATION 1
[Copy here]

Character count: XXX

Follow the SMS framework from training data.` : `
Generate SMS copy (keep it SHORT - under 120 characters):
- Provide 2-3 variations
- Use line breaks for readability
- End with clear CTA and [link] placeholder
- NO emojis`,
      "product-page": `
Generate product page copy with:
- Short Description (1-2 sentences, above the fold)
- Long Description (full story)
- Why We Love It section
- How It's Different section
- Bobbi's Tip (if applicable)`,
      "landing-page": landingPageType === "listicle" ? `
Generate a LISTICLE landing page with EXACTLY ${bulletCount || 5} list items.

## OUTPUT FORMAT - USE THESE EXACT SECTION LABELS:

### HEADLINE VARIATIONS
Provide 3-5 headline variations using different styles (desire, problem, curiosity, identity, contrarian).
Label each with style name.

### HERO SECTION
[The main headline you recommend using]
[SHOP NOW]

### LIST ITEMS
Generate exactly ${bulletCount || 5} numbered items. Each item needs:
- Number (1. 2. 3. etc.)
- Benefit headline (bold)
- 2-3 sentences of supporting copy
- [SHOP NOW] link

### FINAL CTA SECTION
- Summary headline
- Brief tagline
- Product name + tagline
- [SHOP CTA BUTTON - $XX]
- Optional: shipping note

Follow the listicle framework from training data. Make each list item scannable but substantive.` : `
Generate landing page copy with:
- Hero Headline
- Hero Subheadline
- Problem Section (agitate the pain point)
- Solution Section (introduce the approach + unique mechanism)
- Product Details
- Social Proof Section (placeholder for reviews)
- Final CTA Section`,
    };

    userPrompt += channelInstructions[channel] || "";

    // Build message content - either text only or text + image
    type MessageContent =
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } }
        >;

    let messageContent: MessageContent;

    if (referenceImage) {
      // Extract base64 data and media type from data URL
      const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid image format" },
          { status: 400 }
        );
      }

      const mediaType = matches[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      const imageData = matches[2];

      // Add reference image instructions to prompt
      const referenceInstructions = `

## REFERENCE AD FORMAT

I've uploaded a screenshot of an ad format I like. Please:
1. Analyze the STRUCTURE and FORMAT of this reference ad (headline placement, copy length, layout, tone)
2. Generate Jones Road copy that follows this same structure/format
3. DO NOT copy any content from the reference - only use it as a structural template
4. Apply all Jones Road brand voice guidelines and frameworks to the NEW copy

The output should feel like this reference ad's format, but sound 100% authentically Jones Road.`;

      userPrompt += referenceInstructions;

      messageContent = [
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
          text: userPrompt,
        },
      ];
    } else {
      messageContent = userPrompt;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    console.log("API response received:", response.content.length, "content blocks");

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return NextResponse.json({ copy: content.text });
  } catch (error) {
    console.error("Error generating copy:", error);
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate copy" },
      { status: 500 }
    );
  }
}
