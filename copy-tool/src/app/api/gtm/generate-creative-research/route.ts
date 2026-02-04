import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import {
  PMCDocument,
  CreativeBrief,
  LaunchTier,
  TIER_CONFIG,
  PERSONA_CONFIG,
  PersonaId,
  PersonaInsight,
  CreativeResearch,
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

// Load persona markdown file
function loadPersonaMarkdown(personaId: PersonaId): string {
  const personaFiles: Record<PersonaId, string> = {
    'dedicated-educator': 'the-dedicated-educator.md',
    'ageless-matriarch': 'the-ageless-matriarch.md',
    'high-powered-executive': 'the-high-powered-executive.md',
    'wellness-healthcare-practitioner': 'the-wellness-healthcare-practitioner.md',
    'busy-suburban-supermom': 'the-busy-suburban-supermom.md',
    'creative-entrepreneur': 'the-creative-entrepreneur.md',
  };

  try {
    const personaPath = path.join(process.cwd(), 'training-data/personas', personaFiles[personaId]);
    return fs.readFileSync(personaPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load persona file for ${personaId}:`, error);
    return '';
  }
}

// ============================================
// PERSONA DATA EXTRACTION FUNCTIONS
// ============================================

interface ExtractedPersonaData {
  goldNuggetQuotes: string[];
  emotionalJob: string;
  copyAngles: { theme: string; angles: string[] }[];
  jobsToBeDone: { functional: string[]; emotional: string[]; social: string[] };
  objections: { objection: string; response: string }[];
  voiceOfCustomerQuotes: string[];
}

// Extract Gold Nugget Quotes section from persona markdown
function extractGoldNuggetQuotes(markdown: string): string[] {
  // Match the Gold Nugget Quotes section
  const section = markdown.match(/## Gold Nugget Quotes[\s\S]*?(?=---|\n## [A-Z])/i);
  if (!section) return [];

  // Extract all quoted text (lines starting with >)
  const quotes = section[0]
    .split('\n')
    .filter(line => line.trim().startsWith('>'))
    .map(line => line.replace(/^>\s*/, '').replace(/[""]$/, '').replace(/^[""]/, '').trim())
    .filter(q => q.length > 20);

  return quotes;
}

// Extract Voice of Customer quotes from the VOC section
function extractVOCQuotes(markdown: string): string[] {
  const section = markdown.match(/## Voice of Customer[\s\S]*?(?=---|\n## [A-Z])/i);
  if (!section) return [];

  const quotes = section[0]
    .split('\n')
    .filter(line => line.trim().startsWith('>'))
    .map(line => line.replace(/^>\s*/, '').replace(/[""]$/, '').replace(/^[""]/, '').trim())
    .filter(q => q.length > 20);

  return quotes;
}

// Extract the Emotional Job statement
function extractEmotionalJob(markdown: string): string {
  // Try to find "The Emotional Job This Product Is Doing" section
  const jobSection = markdown.match(/### The Emotional Job[\s\S]*?(?=###|\n## |---)/i);
  if (jobSection) {
    // Get meaningful lines (not headers, not empty)
    const lines = jobSection[0]
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('**'))
      .map(line => line.trim());
    return lines.join(' ').substring(0, 500);
  }

  // Fallback: look for "In One Sentence" section
  const summarySection = markdown.match(/### In One Sentence[\s\S]*?(?=###|\n## |---)/i);
  if (summarySection) {
    const quote = summarySection[0].match(/\*\*"([^"]+)"\*\*/);
    if (quote) return quote[1];
  }

  return '';
}

// Extract Copy Angles by Theme
function extractCopyAngles(markdown: string): { theme: string; angles: string[] }[] {
  const section = markdown.match(/## Copy Angles by Theme[\s\S]*?(?=---|\n## [A-Z])/i);
  if (!section) return [];

  const themes: { theme: string; angles: string[] }[] = [];

  // Match theme headers (### Major Theme or ### Theme)
  const themeBlocks = section[0].split(/### (?:Major )?Theme [A-Z0-9]+:|### /);

  for (const block of themeBlocks) {
    if (!block.trim()) continue;

    // Get theme name from first line
    const firstLine = block.split('\n')[0].trim();
    if (!firstLine) continue;

    // Extract angle headers (#### ... Angle)
    const angleMatches = block.match(/####[^#\n]+Angle[^:\n]*:?\s*"([^"]+)"/gi);
    const angles: string[] = [];

    if (angleMatches) {
      for (const match of angleMatches) {
        const angleQuote = match.match(/"([^"]+)"/);
        if (angleQuote) angles.push(angleQuote[1]);
      }
    }

    // Also extract "Static copy:" lines
    const staticCopyMatches = block.match(/\*\*Static copy:\*\*\s*"([^"]+)"/gi);
    if (staticCopyMatches) {
      for (const match of staticCopyMatches) {
        const copyQuote = match.match(/"([^"]+)"/);
        if (copyQuote && !angles.includes(copyQuote[1])) {
          angles.push(copyQuote[1]);
        }
      }
    }

    if (angles.length > 0) {
      themes.push({ theme: firstLine.replace(/[*"]/g, '').trim(), angles });
    }
  }

  return themes;
}

// Extract Jobs To Be Done
function extractJobsToBeDone(markdown: string): { functional: string[]; emotional: string[]; social: string[] } {
  const result = { functional: [] as string[], emotional: [] as string[], social: [] as string[] };

  const section = markdown.match(/## Jobs To Be Done[\s\S]*?(?=---|\n## [A-Z])/i);
  if (!section) return result;

  // Extract Functional Jobs
  const functionalMatch = section[0].match(/### Functional Jobs[\s\S]*?(?=### |$)/i);
  if (functionalMatch) {
    result.functional = functionalMatch[0]
      .split('\n')
      .filter(line => /^\d+\.\s*\*\*/.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*\*\*([^*]+)\*\*.*/, '$1').trim())
      .filter(j => j.length > 0);
  }

  // Extract Emotional Jobs
  const emotionalMatch = section[0].match(/### Emotional Jobs[\s\S]*?(?=### |$)/i);
  if (emotionalMatch) {
    result.emotional = emotionalMatch[0]
      .split('\n')
      .filter(line => /^\d+\.\s*\*\*/.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*\*\*([^*]+)\*\*.*/, '$1').trim())
      .filter(j => j.length > 0);
  }

  // Extract Social Jobs
  const socialMatch = section[0].match(/### Social Jobs[\s\S]*?(?=### |$)/i);
  if (socialMatch) {
    result.social = socialMatch[0]
      .split('\n')
      .filter(line => /^\d+\.\s*\*\*/.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*\*\*([^*]+)\*\*.*/, '$1').trim())
      .filter(j => j.length > 0);
  }

  return result;
}

// Extract Objections & How to Overcome
function extractObjections(markdown: string): { objection: string; response: string }[] {
  const section = markdown.match(/### Objections & How to Overcome[\s\S]*?(?=---|\n## |\n### [A-Z])/i);
  if (!section) return [];

  const objections: { objection: string; response: string }[] = [];

  // Match table rows: | "objection" | response |
  const tableRows = section[0].match(/\|[^|]+\|[^|]+\|/g);
  if (tableRows) {
    for (const row of tableRows) {
      const cells = row.split('|').filter(c => c.trim());
      if (cells.length >= 2 && !cells[0].includes('Objection') && !cells[0].includes('---')) {
        objections.push({
          objection: cells[0].replace(/[""]/g, '').trim(),
          response: cells[1].trim()
        });
      }
    }
  }

  return objections;
}

// Master function to extract all persona data
function extractPersonaData(markdown: string): ExtractedPersonaData {
  return {
    goldNuggetQuotes: extractGoldNuggetQuotes(markdown),
    emotionalJob: extractEmotionalJob(markdown),
    copyAngles: extractCopyAngles(markdown),
    jobsToBeDone: extractJobsToBeDone(markdown),
    objections: extractObjections(markdown),
    voiceOfCustomerQuotes: extractVOCQuotes(markdown),
  };
}

// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 10000, onRetry } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        // Calculate delay with exponential backoff + jitter
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500, maxDelayMs);
        onRetry?.(attempt, lastError);
        console.log(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay)}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Generate insight for a single persona
async function generatePersonaInsight(
  anthropic: Anthropic,
  personaId: PersonaId,
  personaMarkdown: string,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief,
  tier: LaunchTier,
  totalConceptsForTier: number
): Promise<PersonaInsight> {
  const personaConfig = PERSONA_CONFIG[personaId];

  // Extract structured persona data for enhanced prompts
  const extractedData = extractPersonaData(personaMarkdown);

  // Format extracted data for prompt injection
  const goldNuggetSection = extractedData.goldNuggetQuotes.length > 0
    ? `\n## GOLD NUGGET QUOTES (Real Customer Voices - USE THESE FOR HOOK INSPIRATION)\n${extractedData.goldNuggetQuotes.slice(0, 15).map((q, i) => `${i + 1}. "${q}"`).join('\n')}`
    : '';

  const vocSection = extractedData.voiceOfCustomerQuotes.length > 0
    ? `\n## VOICE OF CUSTOMER QUOTES\n${extractedData.voiceOfCustomerQuotes.slice(0, 8).map((q, i) => `${i + 1}. "${q}"`).join('\n')}`
    : '';

  const emotionalJobSection = extractedData.emotionalJob
    ? `\n## EMOTIONAL JOB TO BE DONE\n${extractedData.emotionalJob}`
    : '';

  const copyAnglesSection = extractedData.copyAngles.length > 0
    ? `\n## PROVEN COPY ANGLES BY THEME\n${extractedData.copyAngles.map(t => `### ${t.theme}\n${t.angles.map(a => `- "${a}"`).join('\n')}`).join('\n\n')}`
    : '';

  const jtbdSection = (extractedData.jobsToBeDone.functional.length > 0 || extractedData.jobsToBeDone.emotional.length > 0)
    ? `\n## JOBS TO BE DONE
### Functional Jobs
${extractedData.jobsToBeDone.functional.map(j => `- ${j}`).join('\n') || 'None extracted'}
### Emotional Jobs
${extractedData.jobsToBeDone.emotional.map(j => `- ${j}`).join('\n') || 'None extracted'}
### Social Jobs
${extractedData.jobsToBeDone.social.map(j => `- ${j}`).join('\n') || 'None extracted'}`
    : '';

  const objectionsSection = extractedData.objections.length > 0
    ? `\n## KNOWN OBJECTIONS & RESPONSES\n${extractedData.objections.map(o => `- "${o.objection}" → ${o.response}`).join('\n')}`
    : '';

  const prompt = `You are a senior creative strategist for Jones Road Beauty analyzing how a product fits each customer persona.

## YOUR TASK
Analyze how the following product maps to this specific persona. Generate insights that will guide creative concept development.

## PERSONA: ${personaConfig.name}
This persona represents ${personaConfig.percentage}% of the Jones Road Beauty customer base.
${emotionalJobSection}
${jtbdSection}
${goldNuggetSection}
${vocSection}
${copyAnglesSection}
${objectionsSection}

## PRODUCT INFORMATION
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How It's Different: ${pmc.howItsDifferent}
- Who It's For: ${pmc.whoItsFor}
- How To Use: ${pmc.howToUse}
${pmc.bobbisQuotes?.map(q => `- Bobbi's Quote: "${q.quote}" (${q.context})`).join('\n') || ''}

## CREATIVE BRIEF CONTEXT
- Launch Overview: ${creativeBrief.launchOverview}
- Key Benefits: ${creativeBrief.keyBenefits?.join(', ') || 'Not specified'}
- Target Demographic: ${creativeBrief.targetDemographic}
${creativeBrief.consumerInsights?.topDesires ? `- Top Desires: ${creativeBrief.consumerInsights.topDesires.join(', ')}` : ''}
${creativeBrief.consumerInsights?.topConcerns ? `- Top Concerns: ${creativeBrief.consumerInsights.topConcerns.join(', ')}` : ''}
${creativeBrief.keyDifferentiator ? `- Key Differentiator: ${creativeBrief.keyDifferentiator}` : ''}
${creativeBrief.positioningStatement ? `- Positioning: ${creativeBrief.positioningStatement}` : ''}

## TIER CONTEXT
This is a ${tier.replace('tier-', 'Tier ')} launch with approximately ${totalConceptsForTier} total concepts planned across all personas.

## ANALYSIS INSTRUCTIONS
1. Determine how RELEVANT this product is to this persona (high/medium/low)
   - HIGH: Product directly solves key pain points and aligns with core motivations
   - MEDIUM: Product has some relevance but isn't a perfect fit
   - LOW: Product doesn't strongly connect to this persona's needs

2. Identify which Jobs To Be Done this product solves (reference the JTBD section above)

3. Extract 2-4 messaging angles that would resonate with this persona.
   IMPORTANT: Reference the "Proven Copy Angles by Theme" section above and adapt them for this product.
   For each angle, specify:
   - The angle itself
   - Which hook formula works best (problem-first, identity-first, contrarian, direct-benefit)
   - Why this resonates with this persona

4. Generate 3-5 hook opportunities using the persona's voice and language patterns
   CRITICAL: Use the "Gold Nugget Quotes" and "Voice of Customer Quotes" above as direct inspiration.
   - Adapt real customer language to fit this product
   - Make hooks sound authentic to how this persona actually speaks
   - Reference the source quote when applicable

5. Identify 2-3 potential purchase objections (reference the "Known Objections" section if available)

6. Recommend how many concepts should target this persona (0-${Math.ceil(totalConceptsForTier / 3)}) based on:
   - Relevance score
   - Customer base percentage (${personaConfig.percentage}%)
   - Strategic priority

Return ONLY valid JSON:
{
  "personaId": "${personaId}",
  "personaName": "${personaConfig.name}",
  "customerBasePercentage": ${personaConfig.percentage},
  "productFit": {
    "relevanceScore": "high|medium|low",
    "primaryJobsToBeDone": ["JTBD 1", "JTBD 2"],
    "emotionalBenefits": ["How this makes them FEEL"],
    "functionalBenefits": ["What it DOES for them"]
  },
  "messagingAngles": [
    {
      "angle": "The specific creative angle",
      "hookFormula": "problem-first|identity-first|contrarian|direct-benefit",
      "whyItWorks": "Why this resonates with this persona"
    }
  ],
  "hookOpportunities": [
    {
      "hook": "Actual hook text to use in creative",
      "voiceOfCustomerSource": "VOC quote that inspired this (if applicable)"
    }
  ],
  "objections": ["Potential purchase objection 1", "Objection 2"],
  "recommendedConceptCount": X
}

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
  if (!jsonMatch) throw new Error(`No JSON found in persona insight response for ${personaId}`);

  return JSON.parse(jsonMatch[0]) as PersonaInsight;
}

// Generate product summary
async function generateProductSummary(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief
): Promise<{ keyDifferentiator: string; primaryBenefit: string; categoryPosition: string }> {
  const prompt = `You are a senior creative strategist for Jones Road Beauty.

Analyze this product and provide a concise summary for creative development.

PRODUCT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How It's Different: ${pmc.howItsDifferent}
- Who It's For: ${pmc.whoItsFor}
${creativeBrief.keyDifferentiator ? `- Key Differentiator: ${creativeBrief.keyDifferentiator}` : ''}
${creativeBrief.positioningStatement ? `- Positioning: ${creativeBrief.positioningStatement}` : ''}

Return ONLY valid JSON:
{
  "keyDifferentiator": "The single most important thing that sets this product apart (1 sentence)",
  "primaryBenefit": "The main benefit customers will experience (1 sentence)",
  "categoryPosition": "How this product positions in the beauty category (1 sentence)"
}

Be specific to THIS product, not generic beauty claims.
Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in product summary response");

  return JSON.parse(jsonMatch[0]);
}

// Generate general audience insights
async function generateGeneralAudienceInsights(
  anthropic: Anthropic,
  pmc: PMCDocument,
  creativeBrief: CreativeBrief
): Promise<{ universalHooks: string[]; broadAppealAngles: string[] }> {
  const prompt = `You are a senior creative strategist for Jones Road Beauty.

Generate universal hooks and broad appeal angles for this product that work across ALL audiences (not persona-specific).

PRODUCT:
- Tagline: ${pmc.tagline}
- What It Is: ${pmc.whatItIs}
- Why We Love It: ${pmc.whyWeLoveIt}
- How It's Different: ${pmc.howItsDifferent}
${creativeBrief.launchOverview ? `- Launch Overview: ${creativeBrief.launchOverview}` : ''}
${creativeBrief.keyBenefits ? `- Key Benefits: ${creativeBrief.keyBenefits.join(', ')}` : ''}

Return ONLY valid JSON:
{
  "universalHooks": [
    "Hook that works for anyone (3-5 hooks)",
    "Another universal hook"
  ],
  "broadAppealAngles": [
    "Creative angle with broad appeal (2-3 angles)",
    "Another broad angle"
  ]
}

Make hooks punchy and direct. Make angles specific to the product.
Return ONLY the JSON, no explanation or markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in general audience insights response");

  return JSON.parse(jsonMatch[0]);
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

    const anthropic = new Anthropic({ apiKey, timeout: 180000 }); // 3 min timeout for multiple calls

    const body = await request.json();
    const { tier, pmc, creativeBrief, productName } = body as {
      tier: LaunchTier;
      pmc: PMCDocument;
      creativeBrief: CreativeBrief;
      productName: string;
    };

    if (!tier || !pmc || !creativeBrief) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get tier config for concept counts
    const tierConfig = TIER_CONFIG[tier];
    const totalConceptsForTier = tierConfig.creative.concepts.max;

    // Skip research for tier 4 (no creative)
    if (totalConceptsForTier === 0) {
      return NextResponse.json({
        research: {
          status: 'draft',
          generatedAt: new Date().toISOString(),
          productSummary: {
            keyDifferentiator: "N/A - Tier 4 launch",
            primaryBenefit: "N/A",
            categoryPosition: "N/A",
          },
          personaInsights: [],
          generalAudienceInsights: {
            universalHooks: [],
            broadAppealAngles: [],
          },
          recommendedTotalConcepts: 0,
        } as CreativeResearch,
      });
    }

    console.log(`Generating creative research for ${productName} (${tier})...`);

    // Define persona IDs
    const personaIds: PersonaId[] = [
      'dedicated-educator',
      'ageless-matriarch',
      'high-powered-executive',
      'wellness-healthcare-practitioner',
      'busy-suburban-supermom',
      'creative-entrepreneur',
    ];

    // PARALLEL EXECUTION: Run all API calls concurrently for better performance
    // This reduces total time from ~16s (sequential) to ~12s (parallel)
    console.log("Starting parallel research generation...");

    const [productSummary, personaInsightsRaw, generalAudienceInsights] = await Promise.all([
      // 1. Product Summary
      (async () => {
        console.log("Generating product summary...");
        return generateProductSummary(anthropic, pmc, creativeBrief);
      })(),

      // 2. Persona Insights (all 6 in parallel with retry logic)
      (async () => {
        console.log("Generating persona insights...");
        const promises = personaIds.map(async (personaId) => {
          const markdown = loadPersonaMarkdown(personaId);
          if (!markdown) {
            console.warn(`No markdown found for ${personaId}, skipping...`);
            return null;
          }
          try {
            // Use retry logic with exponential backoff
            return await withRetry(
              () => generatePersonaInsight(
                anthropic,
                personaId,
                markdown,
                pmc,
                creativeBrief,
                tier,
                totalConceptsForTier
              ),
              {
                maxAttempts: 3,
                baseDelayMs: 1000,
                onRetry: (attempt, error) => {
                  console.warn(`Persona ${personaId} generation failed (attempt ${attempt}): ${error.message}`);
                }
              }
            );
          } catch (error) {
            console.error(`Error generating insight for ${personaId} after all retries:`, error);
            return null;
          }
        });
        return Promise.all(promises);
      })(),

      // 3. General Audience Insights
      (async () => {
        console.log("Generating general audience insights...");
        return generateGeneralAudienceInsights(anthropic, pmc, creativeBrief);
      })(),
    ]);

    const personaInsights = personaInsightsRaw.filter((p): p is PersonaInsight => p !== null);

    // Calculate total recommended concepts
    const recommendedTotalConcepts = personaInsights.reduce(
      (sum, p) => sum + p.recommendedConceptCount,
      0
    );

    const research: CreativeResearch = {
      status: 'draft',
      generatedAt: new Date().toISOString(),
      productSummary,
      personaInsights,
      generalAudienceInsights,
      recommendedTotalConcepts,
    };

    console.log(`Research complete: ${personaInsights.length} personas analyzed, ${recommendedTotalConcepts} concepts recommended`);

    return NextResponse.json({ research });
  } catch (error) {
    console.error("Error generating creative research:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate research: ${errorMessage}` }, { status: 500 });
  }
}
