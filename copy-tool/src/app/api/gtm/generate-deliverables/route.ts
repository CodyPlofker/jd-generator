import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import {
  PMCDocument,
  CreativeBrief,
  LaunchTier,
  ChannelStrategies,
  ChannelDeliverables,
  ChannelId,
  EmailDeliverable,
  SMSDeliverable,
  OrganicSocialStrategy,
  OrganicDeliverable,
  InfluencerStrategy,
  InfluencerDeliverable,
  RetailStrategy,
  RetailDeliverable,
  RetentionStrategy,
  RetentionDeliverables,
  CreativeStrategy,
  CreativeDeliverable,
  EcomStrategy,
  EcomDeliverable,
  PRAffiliateStrategy,
  PRAffiliateDeliverable,
} from "@/types/gtm";

// Load API key from .env.local file directly as fallback
function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

// ============================================
// PAID SOCIAL DELIVERABLES
// ============================================
// ============================================
// RETENTION DELIVERABLES (Email + SMS combined)
// ============================================
async function generateRetentionDeliverables(
  anthropic: Anthropic,
  strategy: RetentionStrategy,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string
): Promise<RetentionDeliverables> {
  // Load email training data
  let emailGuide = "";
  try {
    emailGuide = fs.readFileSync(
      path.join(process.cwd(), "training-data/channels/email.md"),
      "utf-8"
    );
  } catch {
    console.log("Email guide not found");
  }

  // Load SMS training data
  let smsGuide = "";
  try {
    smsGuide = fs.readFileSync(
      path.join(process.cwd(), "training-data/channels/sms.md"),
      "utf-8"
    );
  } catch {
    console.log("SMS guide not found");
  }

  const emailDeliverables: EmailDeliverable[] = [];
  const smsDeliverables: SMSDeliverable[] = [];

  // Generate email deliverables
  for (const item of strategy.emailItems) {
    const prompt = `You are an expert email copywriter for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown.

Generate email copy for this item:

PRODUCT: ${productName}
EMAIL TYPE: ${item.type}
NAME: ${item.name}
TIMING: ${item.timing}
AUDIENCE: ${item.audience}
DESCRIPTION: ${item.description}

STRATEGIC CONTEXT: ${strategy.strategicSummary}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- Who It's For: ${pmc.whoItsFor}
- How To Use: ${pmc.howToUse}

CREATIVE BRIEF:
- Key Benefits: ${creativeBrief.keyBenefits?.join(", ") || "N/A"}
- Target: ${creativeBrief.targetDemographic}

${emailGuide ? `EMAIL COPY GUIDELINES:\n${emailGuide.slice(0, 3000)}...\n` : ""}

Write the email copy with:
- subjectLines: 3-5 compelling subject line options (40-60 chars each)
- preheader: Preview text that complements the subject (50-100 chars)
- headline: Main headline in the email body
- body: 2-4 paragraphs of email body copy, natural and conversational. Use the Jones Road voice: confident, honest, warm, direct.
- cta: Primary call-to-action button text (2-5 words)

Jones Road voice: confident, honest, warm, direct. Like talking to a friend who happens to be a makeup expert. No fluff, no fake urgency.

Return ONLY a JSON object:
{
  "subjectLines": ["...", "...", "..."],
  "preheader": "...",
  "headline": "...",
  "body": "...",
  "cta": "..."
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") continue;

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const copy = JSON.parse(jsonMatch[0]);
        emailDeliverables.push({
          id: `email-${item.id}-${Date.now()}`,
          strategyItemId: item.id,
          type: item.type,
          name: item.name,
          audience: item.audience,
          copy: {
            subjectLines: copy.subjectLines || [copy.subjectLine],
            preheader: copy.preheader,
            headline: copy.headline,
            body: copy.body,
            cta: copy.cta,
          },
          status: "generated",
        });
      }
    } catch (error) {
      console.error("Error generating email copy for", item.name, error);
    }
  }

  // Generate SMS deliverables
  for (const item of strategy.smsItems) {
    const prompt = `You are an expert SMS copywriter for Jones Road Beauty.

Generate SMS message for:

PRODUCT: ${productName}
SMS TYPE: ${item.type}
NAME: ${item.name}
TIMING: ${item.timing}
DESCRIPTION: ${item.description}

STRATEGIC CONTEXT: ${strategy.strategicSummary}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}

${smsGuide ? `SMS COPY GUIDELINES:\n${smsGuide.slice(0, 1500)}...\n` : ""}

Write an SMS message that:
- Is 160 characters or less (ideal) or up to 320 chars max
- Feels personal and urgent without being spammy
- Includes a clear value proposition
- Has a sense of exclusivity for SMS subscribers
- Jones Road voice: confident, honest, warm. No fake urgency.

Return ONLY a JSON object:
{
  "message": "...",
  "link": "jonesroadbeauty.com/..."
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") continue;

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const copy = JSON.parse(jsonMatch[0]);
        smsDeliverables.push({
          id: `sms-${item.id}-${Date.now()}`,
          strategyItemId: item.id,
          type: item.type,
          name: item.name,
          copy: {
            message: copy.message,
            link: copy.link,
          },
          characterCount: copy.message?.length || 0,
          status: "generated",
        });
      }
    } catch (error) {
      console.error("Error generating SMS copy for", item.name, error);
    }
  }

  return {
    emails: emailDeliverables,
    sms: smsDeliverables,
  };
}

// ============================================
// CREATIVE STRATEGY DELIVERABLES
// ============================================
async function generateCreativeDeliverables(
  anthropic: Anthropic,
  strategy: CreativeStrategy,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string
): Promise<CreativeDeliverable[]> {
  // Load meta ads training data
  let metaAdsGuide = "";
  try {
    metaAdsGuide = fs.readFileSync(
      path.join(process.cwd(), "training-data/channels/meta-ads.md"),
      "utf-8"
    );
  } catch {
    console.log("Meta ads guide not found");
  }

  const deliverables: CreativeDeliverable[] = [];

  for (const concept of strategy.concepts) {
    for (const format of concept.formats) {
      const prompt = `You are a world-class direct response copywriter for Jones Road Beauty.

Generate ad copy for this creative concept:

PRODUCT: ${productName}
CONCEPT: ${concept.name}
ANGLE: ${concept.angle}
HOOK FORMULA: ${concept.hookFormula}
TARGET PERSONA: ${concept.targetPersona || "General audience"}
FORMAT: ${format}

STRATEGIC CONTEXT: ${strategy.strategicSummary}
VISUAL DIRECTION: ${strategy.visualDirection}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- Who It's For: ${pmc.whoItsFor}

${metaAdsGuide ? `AD COPY GUIDELINES:\n${metaAdsGuide.slice(0, 1500)}...\n` : ""}

COPY REQUIREMENTS:
${format === "static" ? `
For STATIC ads, provide:
- primaryText: 1-3 sentences for the ad caption (125 chars ideal, 250 max for Meta)
- headline: 5-7 words (40 chars max)
- linkDescription: 1 line supporting text (25 chars)
- creativeHeadline: Text overlay for the image (15-25 chars)
- subhead: Supporting text on image (20-40 chars)
- cta: Call to action (2-4 words)
- badge: Optional proof point (10-15 chars, e.g., "8 Shades", "Clinically Tested")
` : format === "video" ? `
For VIDEO ads, provide:
- primaryText: 1-3 sentences for the ad caption
- headline: 5-7 words
- linkDescription: 1 line supporting text
- hook: The first 3 seconds hook/text overlay (very short, attention-grabbing)
- script: Brief script outline (3-5 key moments/beats)
` : `
For CAROUSEL ads, provide:
- primaryText: 1-3 sentences introducing the carousel
- headline: 5-7 words
- linkDescription: 1 line supporting text
`}

Apply the ${concept.hookFormula} hook formula:
${concept.hookFormula === "problem-first" ? "Lead with the problem, then present the solution" : ""}
${concept.hookFormula === "identity-first" ? "Lead with who this is for, make them feel seen" : ""}
${concept.hookFormula === "contrarian" ? "Challenge what they think they know, flip the script" : ""}
${concept.hookFormula === "direct-benefit" ? "Lead with the biggest benefit, be direct" : ""}

Jones Road voice: confident, honest, warm, direct. No fluff, no fake urgency.

Return ONLY a JSON object with the copy fields.`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = response.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") continue;

        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const copy = JSON.parse(jsonMatch[0]);
          deliverables.push({
            id: `creative-${concept.id}-${format}-${Date.now()}`,
            conceptId: concept.id,
            conceptName: concept.name,
            format,
            // Carry persona context from concept to deliverable
            targetPersona: concept.targetPersona,
            personaName: concept.personaName,
            copy,
            status: "generated",
          });
        }
      } catch (error) {
        console.error("Error parsing copy for", concept.name, format, error);
      }
    }
  }

  return deliverables;
}

// ============================================
// ECOM DELIVERABLES
// ============================================
async function generateEcomDeliverables(
  anthropic: Anthropic,
  strategy: EcomStrategy,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string
): Promise<EcomDeliverable[]> {
  const deliverables: EcomDeliverable[] = [];

  // Generate copy for enabled placements that need copy
  const placementsNeedingCopy = strategy.placements?.filter(p =>
    p.enabled && ['pdp-full', 'pdp-partial', 'hp-hero', 'hp-secondary'].includes(p.type)
  ) || [];

  for (const placement of placementsNeedingCopy) {
    const prompt = `You are an expert web copywriter for Jones Road Beauty.

Generate ${placement.type.replace(/-/g, ' ')} copy for:

PRODUCT: ${productName}
PLACEMENT: ${placement.type}
${placement.notes ? `NOTES: ${placement.notes}` : ''}

STRATEGIC CONTEXT: ${strategy.strategicSummary}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How To Use: ${pmc.howToUse}
- Who It's For: ${pmc.whoItsFor}

CREATIVE BRIEF:
- Key Benefits: ${creativeBrief.keyBenefits?.join(", ") || "N/A"}
- Target: ${creativeBrief.targetDemographic}

Write copy with:
- headline: Main headline (5-10 words)
- subhead: Supporting tagline (optional)
- body: Description paragraph (2-3 sentences)
- bullets: 3-5 benefit bullets (if applicable)
- cta: Call-to-action text

Jones Road voice: clean, confident, minimal. No fluff.

Return ONLY a JSON object:
{
  "headline": "...",
  "subhead": "...",
  "body": "...",
  "bullets": ["...", "..."],
  "cta": "..."
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content.find((c) => c.type === "text");
      if (content && content.type === "text") {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const copy = JSON.parse(jsonMatch[0]);
          deliverables.push({
            id: `ecom-${placement.id}-${Date.now()}`,
            placementId: placement.id,
            type: placement.type,
            copy,
            status: "generated",
          });
        }
      }
    } catch (error) {
      console.error("Error parsing ecom copy for", placement.type, error);
    }
  }

  return deliverables;
}

// ============================================
// PR & AFFILIATE DELIVERABLES
// ============================================
async function generatePRAffiliateDeliverables(
  anthropic: Anthropic,
  strategy: PRAffiliateStrategy,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string
): Promise<PRAffiliateDeliverable[]> {
  const deliverables: PRAffiliateDeliverable[] = [];

  // Press Release
  const prPrompt = `You are an expert PR copywriter for Jones Road Beauty, founded by makeup legend Bobbi Brown.

Generate a press release for:

PRODUCT: ${productName}
LAUNCH DATE: ${creativeBrief.launchDate}
PR ANGLE: ${strategy.prAngle}
KEY MESSAGES: ${strategy.keyMessages?.join("; ") || "N/A"}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How It's Different: ${pmc.howItsDifferent}
${pmc.bobbisQuotes?.length ? `- Bobbi's Quotes: ${pmc.bobbisQuotes.map(q => '"' + q.quote + '"').join("; ")}` : ""}

Write a press release with:
- title: Headline for the release
- body: Full press release with proper structure (dateline, lead, body)
- boilerplate: About Jones Road Beauty paragraph

Return ONLY a JSON object:
{
  "title": "...",
  "body": "...",
  "boilerplate": "..."
}`;

  try {
    const prResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prPrompt }],
    });

    const prContent = prResponse.content.find((c) => c.type === "text");
    if (prContent && prContent.type === "text") {
      const jsonMatch = prContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const copy = JSON.parse(jsonMatch[0]);
        deliverables.push({
          id: `pr-release-${Date.now()}`,
          type: "press-release",
          copy,
          status: "generated",
        });
      }
    }
  } catch (error) {
    console.error("Error parsing press release", error);
  }

  // Media Pitch
  const pitchPrompt = `You are an expert PR copywriter for Jones Road Beauty.

Generate a media pitch email for:

PRODUCT: ${productName}
PR ANGLE: ${strategy.prAngle}
TARGET OUTLETS: ${strategy.targetOutlets?.join(", ") || "Beauty editors"}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}

Write a media pitch with:
- title: Email subject line for editors
- body: Short, personalized pitch email (150-250 words)

Return ONLY a JSON object:
{
  "title": "...",
  "body": "..."
}`;

  try {
    const pitchResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: pitchPrompt }],
    });

    const pitchContent = pitchResponse.content.find((c) => c.type === "text");
    if (pitchContent && pitchContent.type === "text") {
      const jsonMatch = pitchContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const copy = JSON.parse(jsonMatch[0]);
        deliverables.push({
          id: `pr-pitch-${Date.now()}`,
          type: "media-pitch",
          copy,
          status: "generated",
        });
      }
    }
  } catch (error) {
    console.error("Error parsing media pitch", error);
  }

  return deliverables;
}

// ============================================
// ORGANIC SOCIAL DELIVERABLES
// ============================================
async function generateOrganicDeliverables(
  anthropic: Anthropic,
  strategy: OrganicSocialStrategy,
  pmc: PMCDocument,
  productName: string
): Promise<OrganicDeliverable[]> {
  const deliverables: OrganicDeliverable[] = [];

  // Combine all platform posts with their platform info
  const allPosts: Array<{ post: typeof strategy.instagramPosts[0]; platform: 'instagram' | 'tiktok' | 'youtube' }> = [
    ...(strategy.instagramPosts || []).map(post => ({ post, platform: 'instagram' as const })),
    ...(strategy.tiktokPosts || []).map(post => ({ post, platform: 'tiktok' as const })),
    ...(strategy.youtubePosts || []).map(post => ({ post, platform: 'youtube' as const })),
  ];

  for (const { post, platform } of allPosts) {
    const platformNotes = strategy.platformNotes?.[platform] || "";

    const prompt = `You are an expert organic social media copywriter for Jones Road Beauty.

Generate social post copy for:

PRODUCT: ${productName}
PLATFORM: ${platform}
FORMAT: ${post.format}
TIMING: ${post.timing}
CONCEPT: ${post.concept}

STRATEGIC CONTEXT: ${strategy.strategicSummary}
PLATFORM NOTES: ${platformNotes}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}

Write the post with:
- caption: The main post caption (platform-appropriate length)
- hashtags: 5-10 relevant hashtags (for Instagram)
${post.format === "reel" || post.format === "short" ? '- hook: Opening hook for video (first 1-3 seconds text)' : ''}

Platform guidelines:
- Instagram: Up to 2200 chars, but 125-150 is ideal for feed. Reels can be longer.
- TikTok: Keep it snappy, trend-aware, authentic
- YouTube: Can be longer, SEO-friendly

Jones Road voice: confident, honest, warm. Not trying too hard.

Return ONLY a JSON object:
{
  "caption": "...",
  "hashtags": ["...", "..."]${post.format === "reel" || post.format === "short" ? ',\n  "hook": "..."' : ''}
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") continue;

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const copy = JSON.parse(jsonMatch[0]);
        deliverables.push({
          id: `organic-${post.id}-${Date.now()}`,
          postItemId: post.id,
          platform,
          format: post.format,
          copy,
          status: "generated",
        });
      }
    } catch (error) {
      console.error("Error parsing organic copy for", post.concept, error);
      continue;
    }
  }

  return deliverables;
}

// ============================================
// INFLUENCER DELIVERABLES
// ============================================
async function generateInfluencerDeliverables(
  anthropic: Anthropic,
  strategy: InfluencerStrategy,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string
): Promise<InfluencerDeliverable[]> {
  const prompt = `You are an expert at writing influencer briefs for Jones Road Beauty.

Generate a comprehensive influencer/UGC creator brief:

PRODUCT: ${productName}

STRATEGIC CONTEXT: ${strategy.strategicSummary}

SEEDING: ${strategy.seedingCount.min}-${strategy.seedingCount.max} creators
CREATOR TIERS: Micro: ${strategy.creatorTiers.micro}, Mid: ${strategy.creatorTiers.mid}, Macro: ${strategy.creatorTiers.macro}
CONTENT TYPES: ${strategy.contentTypes?.join(", ") || "Various"}

BRIEF POINTS FROM STRATEGY:
${strategy.briefPoints?.map((p, i) => `${i + 1}. ${p}`).join("\n") || "N/A"}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How To Use: ${pmc.howToUse}
- Who It's For: ${pmc.whoItsFor}

CREATIVE BRIEF:
- Key Benefits: ${creativeBrief.keyBenefits?.join(", ") || "N/A"}
- Target: ${creativeBrief.targetDemographic}

Create:
1. A full brief document (formatted for sharing with creators)
2. A list of talking points (bullet points they must mention)
3. A list of do's and don'ts for content creation

Return ONLY a JSON object:
{
  "briefDocument": "Full formatted brief text here...",
  "talkingPoints": ["point 1", "point 2", ...],
  "dosAndDonts": {
    "dos": ["do this", "do that", ...],
    "donts": ["don't do this", "don't do that", ...]
  }
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") return [];

  let copy: InfluencerDeliverable["copy"];
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      copy = JSON.parse(jsonMatch[0]);
    } else {
      return [];
    }
  } catch {
    console.error("Error parsing influencer brief");
    return [];
  }

  return [{
    id: `influencer-brief-${Date.now()}`,
    name: `${productName} Creator Brief`,
    copy,
    status: "generated",
  }];
}

// ============================================
// RETAIL DELIVERABLES
// ============================================
async function generateRetailDeliverables(
  anthropic: Anthropic,
  strategy: RetailStrategy,
  pmc: PMCDocument,
  productName: string
): Promise<RetailDeliverable[]> {
  const deliverables: RetailDeliverable[] = [];

  // Map activation types to deliverable types
  const activationToDeliverableType: Record<string, RetailDeliverable["type"]> = {
    'table-display': 'endcap-copy',
    'front-display': 'endcap-copy',
    'signage': 'signage',
    'brochure': 'brochure',
    'event': 'counter-card',
    'window-display': 'shelf-talker',
  };

  // Get enabled activations
  const enabledActivations = strategy.activations?.filter(a => a.enabled) || [];

  // If no activations, generate default set
  if (enabledActivations.length === 0) {
    // Generate basic retail copy using strategy summary
    const defaultTypes: RetailDeliverable["type"][] = ['endcap-copy', 'shelf-talker', 'counter-card'];

    for (const type of defaultTypes) {
      const prompt = `You are an expert retail copywriter for Jones Road Beauty.

Generate ${type} copy for:

PRODUCT: ${productName}
ASSET TYPE: ${type}

STRATEGIC CONTEXT: ${strategy.strategicSummary}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}

${type === "endcap-copy" ? `
ENDCAP requirements:
- headline: Bold, attention-grabbing (5-10 words)
- body: 1-2 sentences about the product
- callout: Price point or promo callout if applicable
` : type === "shelf-talker" ? `
SHELF TALKER requirements:
- headline: Very short (3-5 words)
- body: 1 sentence benefit
- callout: Quick proof point
` : `
COUNTER CARD requirements:
- headline: Engaging question or statement (5-8 words)
- body: 2-3 sentences explaining the product
- callout: Optional promo or "Ask me about..."
`}

Jones Road voice: clean, confident, minimal. No fluff.

Return ONLY a JSON object:
{
  "headline": "...",
  "body": "...",
  "callout": "..."
}`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = response.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") continue;

        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const copy = JSON.parse(jsonMatch[0]);
          deliverables.push({
            id: `retail-${type}-${Date.now()}`,
            activationId: `default-${type}`,
            type,
            retailer: 'all',
            copy,
            status: "generated",
          });
        }
      } catch {
        console.error("Error parsing retail copy for", type);
      }
    }
    return deliverables;
  }

  // Generate deliverables for each enabled activation
  for (const activation of enabledActivations) {
    const deliverableType = activationToDeliverableType[activation.type] || 'counter-card';

    const prompt = `You are an expert retail copywriter for Jones Road Beauty.

Generate ${deliverableType} copy for:

PRODUCT: ${productName}
RETAILER: ${activation.retailer}
ACTIVATION TYPE: ${activation.type}
${activation.notes ? `NOTES: ${activation.notes}` : ''}

STRATEGIC CONTEXT: ${strategy.strategicSummary}

PMC REFERENCE:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}

Requirements:
- headline: Attention-grabbing (5-10 words)
- body: 1-2 sentences about the product
- callout: Optional proof point or promo

Jones Road voice: clean, confident, minimal. No fluff.

Return ONLY a JSON object:
{
  "headline": "...",
  "body": "...",
  "callout": "..."
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") continue;

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const copy = JSON.parse(jsonMatch[0]);
        deliverables.push({
          id: `retail-${activation.id}-${Date.now()}`,
          activationId: activation.id,
          type: deliverableType,
          retailer: activation.retailer,
          copy,
          status: "generated",
        });
      }
    } catch {
      console.error("Error parsing retail copy for", activation.type);
    }
  }

  return deliverables;
}

// ============================================
// MAIN HANDLER
// ============================================
export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey, timeout: 120000 });

    const body = await request.json();
    const {
      tier,
      pmc,
      creativeBrief,
      channelStrategies,
      selectedChannels,
      productName,
      launchId,
    } = body as {
      tier: LaunchTier;
      pmc: PMCDocument;
      creativeBrief: CreativeBrief;
      channelStrategies?: ChannelStrategies;
      selectedChannels?: ChannelId[];
      productName: string;
      launchId?: string;
    };

    if (!tier || !pmc || !creativeBrief) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const channelDeliverables: ChannelDeliverables = {};
    const channels = selectedChannels || ["retention"];

    // Generate deliverables for each selected channel
    for (const channel of channels) {
      switch (channel) {
        // NEW: Retention channel (Email + SMS combined)
        case "retention":
          if (channelStrategies?.retention) {
            const retentionStrategy = channelStrategies.retention;
            if (retentionStrategy.emailItems?.length || retentionStrategy.smsItems?.length) {
              channelDeliverables.retention = await generateRetentionDeliverables(
                anthropic,
                retentionStrategy,
                pmc,
                creativeBrief,
                productName
              );
            }
          }
          break;

        // NEW: Creative channel (concepts for paid)
        case "creative":
          if (channelStrategies?.creative?.concepts?.length) {
            channelDeliverables.creative = await generateCreativeDeliverables(
              anthropic,
              channelStrategies.creative,
              pmc,
              creativeBrief,
              productName
            );
          }
          break;

        // Paid Media (no copy deliverables, just strategic allocation)
        case "paid-media":
          // Paid media doesn't generate copy deliverables - it's about channel allocation
          break;

        case "organic-social":
          if (channelStrategies?.organicSocial) {
            const organic = channelStrategies.organicSocial;
            const hasPosts = (organic.instagramPosts?.length || 0) +
                            (organic.tiktokPosts?.length || 0) +
                            (organic.youtubePosts?.length || 0) > 0;
            if (hasPosts) {
              channelDeliverables.organicSocial = await generateOrganicDeliverables(
                anthropic,
                organic,
                pmc,
                productName
              );
            }
          }
          break;

        case "influencer":
          if (channelStrategies?.influencer) {
            channelDeliverables.influencer = await generateInfluencerDeliverables(
              anthropic,
              channelStrategies.influencer,
              pmc,
              creativeBrief,
              productName
            );
          }
          break;

        // NEW: Ecom channel
        case "ecom":
          if (channelStrategies?.ecom) {
            channelDeliverables.ecom = await generateEcomDeliverables(
              anthropic,
              channelStrategies.ecom,
              pmc,
              creativeBrief,
              productName
            );
          }
          break;

        // NEW: PR & Affiliate channel
        case "pr-affiliate":
          if (channelStrategies?.prAffiliate) {
            channelDeliverables.prAffiliate = await generatePRAffiliateDeliverables(
              anthropic,
              channelStrategies.prAffiliate,
              pmc,
              creativeBrief,
              productName
            );
          }
          break;

        case "retail":
          if (channelStrategies?.retail) {
            channelDeliverables.retail = await generateRetailDeliverables(
              anthropic,
              channelStrategies.retail,
              pmc,
              productName
            );
          }
          break;
      }
    }

    // Save to launch if launchId provided
    if (launchId) {
      try {
        const { list } = await import("@vercel/blob");
        const { blobs } = await list({ prefix: "gtm-launches/" });
        const launchBlob = blobs.find((b) => b.pathname.includes(launchId));

        if (launchBlob) {
          const launchResponse = await fetch(launchBlob.url);
          const launch = await launchResponse.json();

          const updatedLaunch = {
            ...launch,
            channelDeliverables,
            status: "complete",
            updatedAt: new Date().toISOString(),
          };

          await put(
            `gtm-launches/${launchId}.json`,
            JSON.stringify(updatedLaunch),
            { access: "public", contentType: "application/json", allowOverwrite: true }
          );
        }
      } catch (e) {
        console.error("Error saving deliverables to launch:", e);
      }
    }

    return NextResponse.json({
      channelDeliverables,
    });
  } catch (error) {
    console.error("Error generating deliverables:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate deliverables: ${errorMessage}` },
      { status: 500 }
    );
  }
}
