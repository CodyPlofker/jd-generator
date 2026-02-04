import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import {
  PMCDocument,
  CreativeBrief,
  RetentionStrategy,
  CreativeStrategy,
  PaidMediaStrategy,
  OrganicSocialStrategy,
  InfluencerStrategy,
  EcomStrategy,
  PRAffiliateStrategy,
  RetailStrategy,
  ChannelStrategies,
  LaunchTier,
  ChannelId,
  TIER_CONFIG,
  CreativeResearch,
  CreativeConcept,
  PersonaId,
  PERSONA_CONFIG,
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
// RETENTION STRATEGY (Email + SMS + DM)
// ============================================
async function generateRetentionStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<RetentionStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const retentionConfig = tierConfig.retention;

  const prompt = `You are a senior retention marketing strategist for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown.

Based on the product launch information, create a STRATEGIC PLAN for the retention channel (email, SMS, direct mail).

This is NOT a brief - it's a strategic plan showing WHAT deliverables are needed and WHEN they should be sent. The actual copy briefs will be created later.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- Who It's For: ${pmc.whoItsFor}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}
- Target Demographic: ${creativeBrief.targetDemographic}
${creativeBrief.coreMessage ? `- Core Message: ${creativeBrief.coreMessage}` : ""}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})
Campaign Duration: ${tierConfig.campaignDuration}

TIER REQUIREMENTS:
- Emails: ${retentionConfig.emails.min}-${retentionConfig.emails.max}
- SMS: ${retentionConfig.sms.min}-${retentionConfig.sms.max}
- Direct Mail: ${retentionConfig.directMail === true ? "Yes" : retentionConfig.directMail === "possible" ? "Possible" : "No"}
- Popup: ${retentionConfig.popup ? "Yes" : "No"}
- Flows: ${retentionConfig.flows.dedicated ? "Dedicated flow + " : ""}${retentionConfig.flows.universalFooter ? "Universal footer" : "None"}

EMAIL TYPES TO USE (select appropriate mix):
- teaser: Build anticipation before launch
- launch: Launch day announcement
- product-spotlight: Deep dive on product benefits
- social-proof: Reviews and testimonials
- reminder: Mid-campaign reminder
- last-chance: Final push before end
- gtl: Get the Look tutorial-style
- educational: How-to / problem-solution

SMS TYPES TO USE (select appropriate mix):
- launch: Launch day SMS
- reminder: Mid-campaign reminder
- last-chance: Final push
- social-proof: Review highlight

Create a strategic retention plan. Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences explaining the overall retention strategy approach for this launch",
  "emailItems": [
    {
      "id": "email-1",
      "type": "teaser",
      "name": "Pre-Launch Teaser",
      "timing": "D-3",
      "audience": "all",
      "description": "Build anticipation with sneak peek"
    }
  ],
  "smsItems": [
    {
      "id": "sms-1",
      "type": "launch",
      "name": "Launch Day SMS",
      "timing": "Launch Day",
      "description": "Announce the product is live"
    }
  ],
  "directMail": {
    "enabled": ${retentionConfig.directMail === true},
    "budget": "${retentionConfig.directMail === true ? "$X,XXX" : ""}",
    "description": "Description of direct mail approach if enabled"
  },
  "popup": {
    "enabled": ${retentionConfig.popup},
    "description": "Description of popup approach if enabled"
  },
  "flows": {
    "dedicatedFlow": ${retentionConfig.flows.dedicated},
    "universalFooter": ${retentionConfig.flows.universalFooter},
    "description": "Description of flow strategy"
  }
}

Create exactly ${retentionConfig.emails.min}-${retentionConfig.emails.max} email items and ${retentionConfig.sms.min}-${retentionConfig.sms.max} SMS items.
For timing, use: D-7, D-3, D-1, Launch Day, D+1, D+3, D+5, D+7, etc.
For audience: "all", "prospects", "repeat", or "vip"

Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in retention strategy response");

  return JSON.parse(jsonMatch[0]) as RetentionStrategy;
}

// ============================================
// CREATIVE STRATEGY (Paid Creative Concepts)
// ============================================

// Generate concepts from approved research (Phase 3)
async function generateConceptsFromResearch(
  anthropic: Anthropic,
  research: CreativeResearch,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<CreativeConcept[]> {
  const concepts: CreativeConcept[] = [];
  let conceptIndex = 1;

  // Generate concepts for each persona based on recommended count
  for (const insight of research.personaInsights) {
    if (insight.recommendedConceptCount === 0) continue;

    const prompt = `You are a senior creative strategist for Jones Road Beauty.

Generate ${insight.recommendedConceptCount} creative concept(s) specifically for this persona, using the research insights.

## PRODUCT: ${productName}
- Key Differentiator: ${research.productSummary.keyDifferentiator}
- Primary Benefit: ${research.productSummary.primaryBenefit}

## TARGET PERSONA: ${insight.personaName}
- Customer Base: ${insight.customerBasePercentage}%
- Product Relevance: ${insight.productFit.relevanceScore}
- Jobs This Product Solves: ${insight.productFit.primaryJobsToBeDone.join(', ')}
- Emotional Benefits: ${insight.productFit.emotionalBenefits.join(', ')}
- Functional Benefits: ${insight.productFit.functionalBenefits.join(', ')}

## MESSAGING ANGLES TO USE (from research):
${insight.messagingAngles.map((a, i) => `${i + 1}. ${a.angle} (${a.hookFormula}) - ${a.whyItWorks}`).join('\n')}

## HOOK OPPORTUNITIES (from research):
${insight.hookOpportunities.map((h, i) => `${i + 1}. "${h.hook}"${h.voiceOfCustomerSource ? ` (inspired by: ${h.voiceOfCustomerSource})` : ''}`).join('\n')}

## OBJECTIONS TO ADDRESS:
${insight.objections.join(', ')}

Generate ${insight.recommendedConceptCount} concept(s). Each concept should:
1. Use one of the messaging angles above
2. Include a hook from the hook opportunities (or inspired by them)
3. Assign 1-3 formats (static, video, carousel) based on what works best for the angle

Return ONLY valid JSON array:
[
  {
    "name": "Short memorable concept name (3-5 words)",
    "hookFormula": "problem-first|identity-first|contrarian|direct-benefit",
    "angle": "The specific creative angle in 1-2 sentences",
    "primaryHook": "The actual hook text to use",
    "formats": ["static", "video"]
  }
]

Return ONLY the JSON array, no explanation or markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") continue;

      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const personaConcepts = JSON.parse(jsonMatch[0]) as Array<{
        name: string;
        hookFormula: 'problem-first' | 'identity-first' | 'contrarian' | 'direct-benefit';
        angle: string;
        primaryHook?: string;
        formats: ('static' | 'video' | 'carousel')[];
      }>;

      for (const c of personaConcepts) {
        concepts.push({
          id: `concept-${conceptIndex++}`,
          name: c.name,
          hookFormula: c.hookFormula,
          angle: c.angle,
          targetPersona: insight.personaId as PersonaId,
          personaName: insight.personaName,
          formats: c.formats,
          primaryHook: c.primaryHook,
        });
      }
    } catch (error) {
      console.error(`Error generating concepts for ${insight.personaId}:`, error);
    }
  }

  // Generate general audience concepts if there are universal hooks
  if (research.generalAudienceInsights.broadAppealAngles.length > 0) {
    const generalCount = Math.max(1, Math.floor(concepts.length / 4)); // ~20% general

    const prompt = `You are a senior creative strategist for Jones Road Beauty.

Generate ${generalCount} creative concept(s) for GENERAL AUDIENCE (not persona-specific).

## PRODUCT: ${productName}
- Key Differentiator: ${research.productSummary.keyDifferentiator}
- Primary Benefit: ${research.productSummary.primaryBenefit}

## UNIVERSAL HOOKS:
${research.generalAudienceInsights.universalHooks.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

## BROAD APPEAL ANGLES:
${research.generalAudienceInsights.broadAppealAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Generate ${generalCount} concept(s) that appeal to anyone, not tied to a specific persona.

Return ONLY valid JSON array:
[
  {
    "name": "Short memorable concept name (3-5 words)",
    "hookFormula": "problem-first|identity-first|contrarian|direct-benefit",
    "angle": "The specific creative angle in 1-2 sentences",
    "primaryHook": "The actual hook text to use",
    "formats": ["static", "video"]
  }
]

Return ONLY the JSON array, no explanation or markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const generalConcepts = JSON.parse(jsonMatch[0]) as Array<{
            name: string;
            hookFormula: 'problem-first' | 'identity-first' | 'contrarian' | 'direct-benefit';
            angle: string;
            primaryHook?: string;
            formats: ('static' | 'video' | 'carousel')[];
          }>;

          for (const c of generalConcepts) {
            concepts.push({
              id: `concept-${conceptIndex++}`,
              name: c.name,
              hookFormula: c.hookFormula,
              angle: c.angle,
              targetPersona: 'general',
              personaName: 'General Audience',
              formats: c.formats,
              primaryHook: c.primaryHook,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating general audience concepts:", error);
    }
  }

  return concepts;
}

// Calculate format mix counts from concepts
function calculateFormatMix(concepts: CreativeConcept[]): { static: number; video: number; carousel: number } {
  const counts = { static: 0, video: 0, carousel: 0 };

  for (const concept of concepts) {
    for (const format of concept.formats) {
      counts[format]++;
    }
  }

  return counts;
}

async function generateCreativeStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier,
  research?: CreativeResearch
): Promise<CreativeStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const creativeConfig = tierConfig.creative;

  // Skip if tier 4 (no creative)
  if (creativeConfig.concepts.min === 0 && creativeConfig.concepts.max === 0) {
    return {
      status: "draft",
      currentPhase: 'concepts',
      strategicSummary: "No dedicated creative concepts required for Tier 4 launches.",
      concepts: [],
      formatMix: { static: 0, video: 0, carousel: 0 },
      visualDirection: "Use existing brand assets only.",
      partnershipFocus: "none",
    };
  }

  // If research is provided and approved, generate concepts from research
  if (research && research.status === 'approved') {
    console.log("Generating concepts from approved research...");

    const concepts = await generateConceptsFromResearch(
      anthropic,
      research,
      pmc,
      creativeBrief,
      productName,
      tier
    );

    // Calculate format mix from actual concepts (counts, not percentages)
    const formatMix = calculateFormatMix(concepts);

    return {
      status: "draft",
      currentPhase: 'concepts',
      strategicSummary: `Creative strategy based on persona research for ${productName}. ${concepts.length} concepts generated across ${research.personaInsights.filter(p => p.recommendedConceptCount > 0).length} personas.`,
      research,
      concepts,
      formatMix,
      ugcCreators: creativeConfig.ugcCreators.min > 0 ? {
        count: creativeConfig.ugcCreators.min,
        tiers: { micro: Math.ceil(creativeConfig.ugcCreators.min * 0.5), mid: Math.ceil(creativeConfig.ugcCreators.min * 0.3), macro: Math.floor(creativeConfig.ugcCreators.min * 0.2) }
      } : undefined,
      visualDirection: creativeBrief.creativeDeliverables?.visualDirection || "Photography-forward, natural lighting, real skin texture. Emphasize the product in action with genuine, effortless application.",
      partnershipFocus: creativeConfig.partnershipFocus,
    };
  }

  // NEW: If no research provided, return a minimal strategy that starts at research phase
  // User will need to generate research first, then generate concepts
  console.log("No research provided - returning initial strategy at research phase");

  return {
    status: "draft",
    currentPhase: 'research',
    strategicSummary: "",
    concepts: [],
    formatMix: { static: 0, video: 0, carousel: 0 },
    visualDirection: creativeBrief.creativeDeliverables?.visualDirection || "",
    partnershipFocus: creativeConfig.partnershipFocus,
    ugcCreators: creativeConfig.ugcCreators.min > 0 ? {
      count: creativeConfig.ugcCreators.min,
      tiers: { micro: Math.ceil(creativeConfig.ugcCreators.min * 0.5), mid: Math.ceil(creativeConfig.ugcCreators.min * 0.3), macro: Math.floor(creativeConfig.ugcCreators.min * 0.2) }
    } : undefined,
  };
}

// ============================================
// PAID MEDIA STRATEGY (Channel Allocation)
// ============================================
async function generatePaidMediaStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<PaidMediaStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const paidConfig = tierConfig.paidMedia;

  // Skip if tier 4 (no paid media)
  if (paidConfig.campaignType === "none") {
    return {
      status: "draft",
      strategicSummary: "No paid media support for Tier 4 launches.",
      campaignType: "none",
      channels: [],
      keyMetrics: [],
    };
  }

  const allChannels = ["meta", "tiktok", "google", "youtube", "pinterest", "ctv", "applovin", "programmatic"] as const;
  const enabledChannels = paidConfig.channels;

  const prompt = `You are a senior paid media strategist for Jones Road Beauty.

Based on the product launch information, create a STRATEGIC PLAN for paid media channel allocation.

This is NOT detailed media planning - it's a strategic overview of which channels to use and why.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Who It's For: ${pmc.whoItsFor}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}
- Target Demographic: ${creativeBrief.targetDemographic}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})

TIER REQUIREMENTS:
- Campaign Type: ${paidConfig.campaignType}
- Enabled Channels: ${enabledChannels.join(", ")}

Campaign Type Definitions:
- net-new: Brand new purchase campaign, full funnel support
- bau-adsets: New ad sets within existing BAU campaigns
- creative-testing: Creative testing ad sets, scale top performers
- none: No paid media support

Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences on the overall paid media strategy for this launch",
  "campaignType": "${paidConfig.campaignType}",
  "channels": [
    ${allChannels.map(ch => `{
      "id": "${ch}",
      "name": "${ch}",
      "enabled": ${(enabledChannels as readonly string[]).includes(ch)},
      "budgetPercent": ${(enabledChannels as readonly string[]).includes(ch) ? Math.round(100 / enabledChannels.length) : 0},
      "notes": "Brief notes on ${ch} approach"
    }`).join(",\n    ")}
  ],
  "keyMetrics": ["ROAS", "CPA", "CTR"]
}

For enabled channels, provide budget percentages that total 100%.
Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in paid media strategy response");

  return JSON.parse(jsonMatch[0]) as PaidMediaStrategy;
}

// ============================================
// ORGANIC SOCIAL STRATEGY
// ============================================
async function generateOrganicSocialStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<OrganicSocialStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const organicConfig = tierConfig.organicSocial;

  const prompt = `You are a senior organic social strategist for Jones Road Beauty.

Based on the product launch information, create a STRATEGIC PLAN for organic social content.

This is NOT actual post copy - it's a calendar of posts showing WHAT content is needed and WHEN.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- Bobbi's Quotes: ${pmc.bobbisQuotes.map((q) => `"${q.quote}"`).join("; ")}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}
- Creative Considerations: ${creativeBrief.creativeConsiderations}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})

TIER REQUIREMENTS:
- Instagram: ${organicConfig.instagram.grid} grid posts, ${organicConfig.instagram.reels} reels, ${organicConfig.instagram.stories} stories
- TikTok: ${organicConfig.tiktok} posts
- YouTube: ${organicConfig.youtube.shorts} shorts, ${organicConfig.youtube.longform} longform
${organicConfig.creatorContent ? `- Creator Content: ${organicConfig.creatorContent.deliverables} outsourced deliverables, ${organicConfig.creatorContent.collabs} collab posts` : "- Creator Content: None"}

Post Format Options:
- Instagram: feed, story, reel
- TikTok: reel (treated as short video)
- YouTube: short, long-form

Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences on the overall organic social approach for this launch",
  "instagramPosts": [
    {"id": "ig-1", "format": "reel", "timing": "D-1", "concept": "Teaser: product peek"}
  ],
  "tiktokPosts": [
    {"id": "tt-1", "format": "reel", "timing": "Launch Day", "concept": "Product reveal"}
  ],
  "youtubePosts": [
    {"id": "yt-1", "format": "short", "timing": "Launch Day", "concept": "Quick demo"}
  ],
  "creatorContent": ${organicConfig.creatorContent ? `{
    "deliverables": ${organicConfig.creatorContent.deliverables},
    "collabPosts": ${organicConfig.creatorContent.collabs}
  }` : "null"},
  "platformNotes": {
    "instagram": "Notes on IG approach",
    "tiktok": "Notes on TikTok approach",
    "youtube": "Notes on YouTube approach"
  }
}

Create:
- ${organicConfig.instagram.grid + organicConfig.instagram.reels + organicConfig.instagram.stories} Instagram posts (mix of feed, reels, stories)
- ${organicConfig.tiktok} TikTok posts
- ${organicConfig.youtube.shorts + organicConfig.youtube.longform} YouTube posts

For timing use: D-7, D-3, D-1, Launch Day, D+1, D+3, D+5, D+7, etc.
Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in organic social strategy response");

  return JSON.parse(jsonMatch[0]) as OrganicSocialStrategy;
}

// ============================================
// INFLUENCER STRATEGY
// ============================================
async function generateInfluencerStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<InfluencerStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const influencerConfig = tierConfig.influencer;

  const prompt = `You are a senior influencer marketing strategist for Jones Road Beauty.

Based on the product launch information, create a STRATEGIC PLAN for influencer marketing.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How It's Different: ${pmc.howItsDifferent}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}
- Target Demographic: ${creativeBrief.targetDemographic}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})

TIER REQUIREMENTS:
- Sponsored Content Budget: $${influencerConfig.sponsoredBudget}
- Paid Content Budget: $${influencerConfig.paidContentBudget} (expecting ${influencerConfig.expectedAds} partnership ads)
- Seeding: ${influencerConfig.seeding.min}-${influencerConfig.seeding.max} organic box sends
- VIP Tier: ${influencerConfig.vipTier ? "Yes" : "No"}
- Commission Increase: ${influencerConfig.commissionIncrease || "None"}
- Community Challenges: ${influencerConfig.communityChallenges === true ? "Yes" : influencerConfig.communityChallenges === "possible" ? "Possible" : "No"}

Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences on the overall influencer strategy for this launch",
  "sponsoredBudget": ${influencerConfig.sponsoredBudget},
  "paidContentBudget": ${influencerConfig.paidContentBudget},
  "expectedAds": ${influencerConfig.expectedAds},
  "seedingCount": {"min": ${influencerConfig.seeding.min}, "max": ${influencerConfig.seeding.max}},
  "vipTier": ${influencerConfig.vipTier},
  "creatorTiers": {"micro": X, "mid": Y, "macro": Z},
  "commissionIncrease": {
    "enabled": ${influencerConfig.commissionIncrease !== null && influencerConfig.commissionIncrease !== "possible"},
    "duration": "${influencerConfig.commissionIncrease || ""}"
  },
  "communityChallenges": ${influencerConfig.communityChallenges === true},
  "contentTypes": ["Tutorial", "Get Ready With Me", "Review"],
  "briefPoints": ["Key talking point 1", "Key talking point 2", "Key talking point 3"]
}

Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in influencer strategy response");

  return JSON.parse(jsonMatch[0]) as InfluencerStrategy;
}

// ============================================
// ECOM STRATEGY (Site Placements)
// ============================================
async function generateEcomStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<EcomStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const ecomConfig = tierConfig.ecom;

  const prompt = `You are an ecommerce strategist for Jones Road Beauty.

Based on the product launch information, create a STRATEGIC PLAN for ecommerce placements.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Key Benefits: ${pmc.whyWeLoveIt}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})

TIER REQUIREMENTS:
- HP Hero: ${ecomConfig.hpHero === true ? "Yes" : ecomConfig.hpHero === "possible" ? "Possible" : "No"}
- HP Secondary Module: ${ecomConfig.hpSecondary ? "Yes" : "No"}
- HP Featured Products: ${ecomConfig.hpFeatured ? "Yes" : "No"}
- Breakout Cards: ${ecomConfig.breakoutCards === true ? "Both sizes" : ecomConfig.breakoutCards === "small only" ? "Small only" : "No"}
- Custom Tags: ${ecomConfig.customTags ? "Yes" : "No"}
- Full PDP: ${ecomConfig.fullPdp === true ? "Yes" : ecomConfig.fullPdp === "partial" ? "Partial" : "No"}
- Quiz: ${ecomConfig.quiz ? "Yes" : "No"}
- Pre-Launch Page: ${ecomConfig.preLaunch === true ? "Yes" : ecomConfig.preLaunch === "possible" ? "Possible" : "No"}
- Blog Post: ${ecomConfig.blogPost ? "Yes" : "No"}
- Early Access: ${ecomConfig.earlyAccess ? "Yes" : "No"}
- Landing Pages: Listicle=${ecomConfig.landingPages.listicle}, Trojan Horse=${ecomConfig.landingPages.trojanHorse}, Custom=${ecomConfig.landingPages.custom}

Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences on the overall ecom strategy for this launch",
  "placements": [
    {"id": "p-1", "type": "hp-hero", "enabled": ${ecomConfig.hpHero === true}, "notes": "Main homepage hero feature"},
    {"id": "p-2", "type": "hp-secondary", "enabled": ${ecomConfig.hpSecondary === true}, "notes": "Secondary homepage module"},
    {"id": "p-3", "type": "hp-featured", "enabled": ${ecomConfig.hpFeatured === true}, "notes": "Featured products carousel"},
    {"id": "p-4", "type": "breakout-card-large", "enabled": ${ecomConfig.breakoutCards === true}, "notes": "Large breakout card"},
    {"id": "p-5", "type": "breakout-card-small", "enabled": ${ecomConfig.breakoutCards === true || ecomConfig.breakoutCards === "small only"}, "notes": "Small breakout card"},
    {"id": "p-6", "type": "promo-bar", "enabled": true, "notes": "Promo bar header announcement"},
    {"id": "p-7", "type": "tags", "enabled": true, "notes": "Product tags"},
    {"id": "p-8", "type": "${ecomConfig.fullPdp === true ? "pdp-full" : "pdp-partial"}", "enabled": true, "notes": "${ecomConfig.fullPdp === true ? "Full PDP content with new modules" : "Partial PDP content"}"},
    {"id": "p-9", "type": "collection-page", "enabled": ${ecomConfig.hpHero === true}, "notes": "New collection page"},
    {"id": "p-10", "type": "quiz", "enabled": ${ecomConfig.quiz === true}, "notes": "Shade finder quiz"},
    {"id": "p-11", "type": "pre-launch", "enabled": ${ecomConfig.preLaunch === true}, "notes": "Pre-launch page"},
    {"id": "p-12", "type": "blog-post", "enabled": ${ecomConfig.blogPost === true}, "notes": "Blog post"},
    {"id": "p-13", "type": "early-access", "enabled": ${ecomConfig.earlyAccess === true}, "notes": "Early access page"}
  ],
  "landingPages": {
    "listicle": ${ecomConfig.landingPages.listicle},
    "trojanHorse": ${ecomConfig.landingPages.trojanHorse},
    "custom": ${ecomConfig.landingPages.custom}
  }
}

Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in ecom strategy response");

  return JSON.parse(jsonMatch[0]) as EcomStrategy;
}

// ============================================
// PR & AFFILIATE STRATEGY
// ============================================
async function generatePRAffiliateStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<PRAffiliateStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const prConfig = tierConfig.prAffiliate;

  const prompt = `You are a PR and affiliate marketing strategist for Jones Road Beauty.

Based on the product launch information, create a STRATEGIC PLAN for PR and affiliate marketing.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- How It's Different: ${pmc.howItsDifferent}
- Bobbi's Quotes: ${pmc.bobbisQuotes.map((q) => `"${q.quote}"`).join("; ")}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}
${creativeBrief.keyDifferentiator ? `- Key Differentiator: ${creativeBrief.keyDifferentiator}` : ""}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})

TIER REQUIREMENTS:
- Long Lead Features: ${prConfig.longLeadFeatures}
- Product Placements: ${prConfig.productPlacements}
- Awards: ${prConfig.awards ? "Yes" : "No"}
- Early Access: ${prConfig.earlyAccess ? "Yes" : "No"}
- Commission Increase: ${prConfig.commissionIncrease || "None"}

Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences on the overall PR & affiliate strategy for this launch",
  "prAngle": "The main PR angle / news hook for this launch",
  "longLeadFeatures": {
    "count": ${prConfig.longLeadFeatures},
    "targets": ["Target publication 1", "Target publication 2"]
  },
  "productPlacements": {
    "count": ${prConfig.productPlacements},
    "targets": ["Allure", "Byrdie", "Who What Wear", "Glamour"]
  },
  "awards": ${prConfig.awards},
  "earlyAccess": ${prConfig.earlyAccess},
  "affiliateApproach": "Overall approach to affiliate marketing for this launch",
  "commissionIncrease": {
    "enabled": ${prConfig.commissionIncrease !== null && prConfig.commissionIncrease !== "possible"},
    "duration": "${prConfig.commissionIncrease || ""}"
  }
}

Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in PR/affiliate strategy response");

  return JSON.parse(jsonMatch[0]) as PRAffiliateStrategy;
}

// ============================================
// RETAIL STRATEGY
// ============================================
async function generateRetailStrategy(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  productName: string,
  tier: LaunchTier
): Promise<RetailStrategy> {
  const tierConfig = TIER_CONFIG[tier];
  const retailConfig = tierConfig.retail;

  const prompt = `You are a retail marketing strategist for Jones Road Beauty.

Based on the product launch information, create a STRATEGIC PLAN for retail activations.

PRODUCT: ${productName}

PMC DOCUMENT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Key Benefits: ${pmc.whyWeLoveIt}

CREATIVE BRIEF:
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits.join(", ")}

TIER: ${tier.replace("tier-", "Tier ")} (${tierConfig.description})

TIER REQUIREMENTS:
- Store Takeover: ${retailConfig.storeTakeover ? "Yes" : "No"}
- Events: ${retailConfig.events}
- Brochure: ${retailConfig.brochure ? "Yes" : "No"}
- Signage: ${retailConfig.signage ? "Yes" : "No"}
- Window Display: ${retailConfig.windowDisplay ? "Yes" : "No"}
- TV Update: ${retailConfig.tvUpdate === true ? "Yes" : retailConfig.tvUpdate === "possible" ? "Possible" : "No"}
- Exclusive Offer: ${retailConfig.exclusiveOffer === true ? "Yes" : retailConfig.exclusiveOffer === "possible" ? "Possible" : "No"}

Return ONLY valid JSON:

{
  "status": "draft",
  "strategicSummary": "2-3 sentences on the overall retail strategy for this launch",
  "activations": [
    {"id": "r-1", "retailer": "retail-store", "type": "table-display", "enabled": true, "notes": "Update existing table displays"},
    {"id": "r-2", "retailer": "retail-store", "type": "front-display", "enabled": ${retailConfig.storeTakeover || retailConfig.events > 0}, "notes": "Front of house display"},
    {"id": "r-3", "retailer": "retail-store", "type": "event", "enabled": ${retailConfig.events > 0}, "notes": "${retailConfig.events} in-store events"},
    {"id": "r-4", "retailer": "retail-store", "type": "tv-update", "enabled": ${retailConfig.tvUpdate === true}, "notes": "Update store TVs"},
    {"id": "r-5", "retailer": "retail-store", "type": "signage", "enabled": ${retailConfig.signage === true}, "notes": "Exterior signage update"},
    {"id": "r-6", "retailer": "retail-store", "type": "window-display", "enabled": ${retailConfig.windowDisplay === true}, "notes": "Window display"},
    {"id": "r-7", "retailer": "retail-store", "type": "brochure", "enabled": ${retailConfig.brochure === true}, "notes": "Product education brochure"},
    {"id": "r-8", "retailer": "retail-store", "type": "exclusive-offer", "enabled": ${retailConfig.exclusiveOffer === true}, "notes": "In-store exclusive offer"}
  ]
}

Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in retail strategy response");

  return JSON.parse(jsonMatch[0]) as RetailStrategy;
}

// ============================================
// MAIN API HANDLER
// ============================================
export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey, timeout: 120000 });

    const body = await request.json();
    const { tier, pmc, creativeBrief, productName, channels, creativeResearch } = body as {
      tier: LaunchTier;
      pmc: PMCDocument;
      creativeBrief: CreativeBrief;
      productName: string;
      channels: ChannelId[];
      creativeResearch?: CreativeResearch;
    };

    if (!tier || !pmc || !creativeBrief) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Default to retention if no channels specified
    const selectedChannels = channels || ["retention"];

    const strategies: ChannelStrategies = {};

    // Generate strategy for each selected channel
    for (const channel of selectedChannels) {
      console.log(`Generating strategy for ${channel}...`);

      try {
        switch (channel) {
          case "retention":
            strategies.retention = await generateRetentionStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
          case "creative":
            strategies.creative = await generateCreativeStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier,
              creativeResearch
            );
            break;
          case "paid-media":
            strategies.paidMedia = await generatePaidMediaStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
          case "organic-social":
            strategies.organicSocial = await generateOrganicSocialStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
          case "influencer":
            strategies.influencer = await generateInfluencerStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
          case "ecom":
            strategies.ecom = await generateEcomStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
          case "pr-affiliate":
            strategies.prAffiliate = await generatePRAffiliateStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
          case "retail":
            strategies.retail = await generateRetailStrategy(
              anthropic,
              pmc,
              creativeBrief,
              productName,
              tier
            );
            break;
        }
      } catch (error) {
        console.error(`Error generating ${channel} strategy:`, error);
        // Continue with other channels even if one fails
      }
    }

    return NextResponse.json({
      channelStrategies: strategies,
    });
  } catch (error) {
    console.error("Error generating strategy:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate strategy: ${errorMessage}` }, { status: 500 });
  }
}
