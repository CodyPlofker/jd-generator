import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface PersonaProfile {
  affluence: number;
  velocity: number;
  loyalty: number;
  growth: number;
  influence: number;
}

interface OuterSignalAnalytics {
  customerShare: number;
  revenueShare: number;
  revenueIndex: number;
  performanceClass: "outperformer" | "underperformer" | "average";
  aov: number;
  aovVsBrand: number;
  ltv: number;
  ltvVsBrand: number;
  repeatRate: number;
  ordersPerYear: number;
  sampleSize: number;
  demographics: {
    avgAge: number;
    medianAge: number;
    genderFemale: number;
  };
  topStates: string[];
  productAffinityHigh: string[];
  productAffinityLow: string[];
  personaProfile?: PersonaProfile;
}

interface ParsedPersona {
  id: string;
  name: string;
  percentage: string;
  identitySnapshot: string;
  demographics: Record<string, string>;
  analytics?: OuterSignalAnalytics;
  // Psychographics
  coreIdentityTraits: string[];
  values: string[];
  worldview: string;
  // Emotional Landscape
  fears: string[];
  desires: string[];
  frustrations: string[];
  guiltyPleasures: string[];
  // Jobs To Be Done
  jobsFunctional: string[];
  jobsEmotional: string[];
  jobsSocial: string[];
  // Purchase Psychology
  purchaseTriggers: string[];
  purchaseObjections: Array<{ objection: string; response: string }>;
  // Day in Life
  dayInLife: string;
  // Messaging
  messagingAngles: Array<{ theme: string; hooks: string[] }>;
  languageResonates: string[];
  languageAvoid: string[];
  vocQuotes: string[];
  goldNuggetsByTheme: Array<{ theme: string; quotes: string[] }>;
  productAffinities: Array<{ product: string; reason: string }>;
  copyExamples: {
    adHook: string;
    emailSubjects: string[];
    ctas: string[];
  };
}

function parseMarkdown(content: string, filename: string): ParsedPersona {
  // Extract name from first heading
  const nameMatch = content.match(/^# (.+)$/m);
  const name = nameMatch ? nameMatch[1] : filename;

  // Extract percentage
  const percentMatch = content.match(/\*\*Percentage of Customer Base:\*\* (~?\d+%)/);
  const percentage = percentMatch ? percentMatch[1] : "";

  // Extract identity snapshot
  const identityMatch = content.match(/## Identity Snapshot\n\n([\s\S]*?)(?=\n---|\n##)/);
  const identitySnapshot = identityMatch ? identityMatch[1].trim() : "";

  // Extract demographics from table
  const demographics: Record<string, string> = {};
  const demoMatch = content.match(/## Demographics\n\n[\s\S]*?\|[\s\S]*?\|[\s\S]*?\n\|[-|]+\n([\s\S]*?)(?=\n---|\n##)/);
  if (demoMatch) {
    const rows = demoMatch[1].split("\n").filter(r => r.includes("|"));
    rows.forEach(row => {
      const parts = row.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const key = parts[0].replace(/\*\*/g, "");
        demographics[key] = parts[1];
      }
    });
  }

  // Extract OuterSignal Analytics
  let analytics: OuterSignalAnalytics | undefined;
  const analyticsSection = content.match(/## OuterSignal Analytics[\s\S]*?(?=\n---\n\n## Psychographics)/);
  if (analyticsSection) {
    const section = analyticsSection[0];

    // Parse Revenue Performance table
    const customerShareMatch = section.match(/\*\*Customer Share\*\*\s*\|\s*([\d.]+)%/);
    const revenueShareMatch = section.match(/\*\*Revenue Share\*\*\s*\|\s*([\d.]+)%\s*\|\s*([+-]?[\d.]+pp)?/);
    const revenueIndexMatch = section.match(/\*\*Revenue Index\*\*\s*\|\s*([\d.]+)x/);
    const aovMatch = section.match(/\*\*AOV\*\*\s*\|\s*\$([\d,]+)\s*\|\s*([+-]?\d+)%/);
    const ltvMatch = section.match(/\*\*LTV\*\*\s*\|\s*\$([\d,]+)\s*\|\s*([+-]?\d+)%/);
    const repeatRateMatch = section.match(/\*\*Repeat Rate\*\*\s*\|\s*([\d.]+)%/);
    const ordersMatch = section.match(/\*\*Orders\/Year\*\*\s*\|\s*([\d.]+)/);
    const sampleSizeMatch = section.match(/\*\*Sample Size\*\*\s*\|\s*([\d,]+)\s*customers/);

    // Parse Demographics
    const avgAgeMatch = section.match(/\*\*Average Age:\*\*\s*([\d.]+)/);
    const medianAgeMatch = section.match(/\*\*Median Age:\*\*\s*([\d.]+)/);
    const genderMatch = section.match(/\*\*Gender:\*\*\s*([\d.]+)%\s*Female/);

    // Parse Top States
    const topStates: string[] = [];
    const statesMatch = section.match(/### Top States\n([\s\S]*?)(?=\n###|\n---|\n##)/);
    if (statesMatch) {
      const stateLines = statesMatch[1].match(/^\d+\.\s*(\w+(?:\s+\w+)?)/gm);
      if (stateLines) {
        stateLines.forEach(line => {
          const stateNameMatch = line.match(/^\d+\.\s*(\w+(?:\s+\w+)?)/);
          if (stateNameMatch) topStates.push(stateNameMatch[1]);
        });
      }
    }

    // Parse Product Affinity
    const productAffinityHigh: string[] = [];
    const productAffinityLow: string[] = [];
    const affinityHighMatch = section.match(/\*\*Over-indexes:\*\*\s*([^\n]+)/);
    const affinityLowMatch = section.match(/\*\*Under-indexes:\*\*\s*([^\n]+)/);
    if (affinityHighMatch) {
      productAffinityHigh.push(...affinityHighMatch[1].split(",").map(p => p.trim()));
    }
    if (affinityLowMatch) {
      productAffinityLow.push(...affinityLowMatch[1].split(",").map(p => p.trim()));
    }

    // Parse Persona Profile
    let personaProfile: PersonaProfile | undefined;
    const profileMatch = section.match(/### Persona Profile\n([\s\S]*?)(?=\n###|\n---|\n##)/);
    if (profileMatch) {
      const affluenceMatch = profileMatch[1].match(/\*\*Affluence:\*\*\s*(\d+)/);
      const velocityMatch = profileMatch[1].match(/\*\*Velocity:\*\*\s*(\d+)/);
      const loyaltyMatch = profileMatch[1].match(/\*\*Loyalty:\*\*\s*(\d+)/);
      const growthMatch = profileMatch[1].match(/\*\*Growth:\*\*\s*(\d+)/);
      const influenceMatch = profileMatch[1].match(/\*\*Influence:\*\*\s*(\d+)/);

      if (affluenceMatch || velocityMatch || loyaltyMatch || growthMatch || influenceMatch) {
        personaProfile = {
          affluence: affluenceMatch ? parseInt(affluenceMatch[1]) : 0,
          velocity: velocityMatch ? parseInt(velocityMatch[1]) : 0,
          loyalty: loyaltyMatch ? parseInt(loyaltyMatch[1]) : 0,
          growth: growthMatch ? parseInt(growthMatch[1]) : 0,
          influence: influenceMatch ? parseInt(influenceMatch[1]) : 0,
        };
      }
    }

    // Determine performance class
    const revenueIndex = revenueIndexMatch ? parseFloat(revenueIndexMatch[1]) : 1;
    let performanceClass: "outperformer" | "underperformer" | "average" = "average";
    if (revenueIndex >= 1.05) performanceClass = "outperformer";
    else if (revenueIndex <= 0.95) performanceClass = "underperformer";

    analytics = {
      customerShare: customerShareMatch ? parseFloat(customerShareMatch[1]) : 0,
      revenueShare: revenueShareMatch ? parseFloat(revenueShareMatch[1]) : 0,
      revenueIndex,
      performanceClass,
      aov: aovMatch ? parseInt(aovMatch[1].replace(",", "")) : 0,
      aovVsBrand: aovMatch ? parseInt(aovMatch[2]) : 0,
      ltv: ltvMatch ? parseInt(ltvMatch[1].replace(",", "")) : 0,
      ltvVsBrand: ltvMatch ? parseInt(ltvMatch[2]) : 0,
      repeatRate: repeatRateMatch ? parseFloat(repeatRateMatch[1]) : 0,
      ordersPerYear: ordersMatch ? parseFloat(ordersMatch[1]) : 0,
      sampleSize: sampleSizeMatch ? parseInt(sampleSizeMatch[1].replace(",", "")) : 0,
      demographics: {
        avgAge: avgAgeMatch ? parseFloat(avgAgeMatch[1]) : 0,
        medianAge: medianAgeMatch ? parseFloat(medianAgeMatch[1]) : 0,
        genderFemale: genderMatch ? parseFloat(genderMatch[1]) : 0,
      },
      topStates,
      productAffinityHigh,
      productAffinityLow,
      personaProfile,
    };
  }

  // Extract Psychographics - Core Identity Traits
  const traitsMatch = content.match(/### Core Identity Traits\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const coreIdentityTraits = traitsMatch
    ? traitsMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "").replace(/\*\*/g, ""))
    : [];

  // Extract Psychographics - Values
  const valuesMatch = content.match(/### Values\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const values = valuesMatch
    ? valuesMatch[1].split("\n").filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""))
    : [];

  // Extract Psychographics - Worldview
  const worldviewMatch = content.match(/### Worldview\n([\s\S]*?)(?=\n---|\n##)/);
  const worldview = worldviewMatch ? worldviewMatch[1].trim() : "";

  // Extract fears
  const fearsMatch = content.match(/### Fears\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const fears = fearsMatch ? fearsMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "")) : [];

  // Extract desires
  const desiresMatch = content.match(/### Desires\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const desires = desiresMatch ? desiresMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "")) : [];

  // Extract frustrations
  const frustMatch = content.match(/### Frustrations\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const frustrations = frustMatch ? frustMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "")) : [];

  // Extract guilty pleasures
  const guiltyMatch = content.match(/### Guilty Pleasures\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const guiltyPleasures = guiltyMatch
    ? guiltyMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, ""))
    : [];

  // Extract Jobs To Be Done - Functional
  const jobsFuncMatch = content.match(/### Functional Jobs\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const jobsFunctional = jobsFuncMatch
    ? jobsFuncMatch[1].split("\n").filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""))
    : [];

  // Extract Jobs To Be Done - Emotional
  const jobsEmoMatch = content.match(/### Emotional Jobs\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const jobsEmotional = jobsEmoMatch
    ? jobsEmoMatch[1].split("\n").filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""))
    : [];

  // Extract Jobs To Be Done - Social
  const jobsSocMatch = content.match(/### Social Jobs\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const jobsSocial = jobsSocMatch
    ? jobsSocMatch[1].split("\n").filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""))
    : [];

  // Extract Purchase Psychology - Triggers
  const triggersMatch = content.match(/### Triggers to Purchase\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const purchaseTriggers = triggersMatch
    ? triggersMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, ""))
    : [];

  // Extract Purchase Psychology - Objections
  const purchaseObjections: Array<{ objection: string; response: string }> = [];
  const objMatch = content.match(/### Objections & How to Overcome\n\n[\s\S]*?\|[\s\S]*?\|[\s\S]*?\n\|[-|]+\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  if (objMatch) {
    const rows = objMatch[1].split("\n").filter(r => r.includes("|"));
    rows.forEach(row => {
      const parts = row.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        purchaseObjections.push({
          objection: parts[0].replace(/"/g, ""),
          response: parts[1]
        });
      }
    });
  }

  // Extract Day in Life
  const dayMatch = content.match(/## Day in (?:Her|His|Their) Life\n\n([\s\S]*?)(?=\n---|\n##)/);
  const dayInLife = dayMatch ? dayMatch[1].trim() : "";

  // Extract messaging angles
  const messagingAngles: Array<{ theme: string; hooks: string[] }> = [];
  const msgMatch = content.match(/## Messaging Angles by Key Motivation\n([\s\S]*?)(?=\n---|\n## Language)/);
  if (msgMatch) {
    const sections = msgMatch[1].split(/### \d+\. /).filter(Boolean);
    sections.forEach(section => {
      const themeMatch = section.match(/^([^\n]+)/);
      if (themeMatch) {
        const hooks = section.split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "").replace(/"/g, ""));
        messagingAngles.push({ theme: themeMatch[1].trim(), hooks });
      }
    });
  }

  // Extract language that resonates
  const langResMatch = content.match(/### Use These Words\/Phrases\n([\s\S]*?)(?=\n###|\n---|\n##)/);
  const languageResonates = langResMatch ? langResMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "").replace(/"/g, "")) : [];

  // Extract language to avoid
  const langAvoidMatch = content.match(/### Avoid These\n([\s\S]*?)(?=\n---|\n##)/);
  const languageAvoid = langAvoidMatch ? langAvoidMatch[1].split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, "")) : [];

  // Extract VOC quotes from both "Voice of Customer" and "Gold Nugget Quotes" sections
  const vocQuotes: string[] = [];

  // First try the original Voice of Customer section
  const vocSection = content.match(/## Voice of Customer[\s\S]*?(?=\n## Gold Nugget|\n## Purchase|\n## Jobs|---\n\n##)/);
  if (vocSection) {
    const quotes = vocSection[0].match(/> "([^"]+)"/g);
    if (quotes) {
      quotes.slice(0, 8).forEach(q => {
        const clean = q.replace(/^> "/, "").replace(/"$/, "");
        if (clean.length < 250) vocQuotes.push(clean);
      });
    }
  }

  // Also extract from Gold Nugget Quotes section (expanded reviews) - both flat and by theme
  const goldNuggetsByTheme: Array<{ theme: string; quotes: string[] }> = [];
  const goldNuggetSection = content.match(/## Gold Nugget Quotes[\s\S]*?(?=\n## Copy Angles|\n## Deep Persona|---\n\n##)/);
  if (goldNuggetSection) {
    // Parse by theme (### headers)
    const themeBlocks = goldNuggetSection[0].split(/### /).filter(Boolean);
    themeBlocks.forEach(block => {
      const lines = block.split("\n");
      const themeName = lines[0]?.trim();
      if (themeName && !themeName.startsWith("## Gold Nugget")) {
        const themeQuotes: string[] = [];
        lines.forEach(line => {
          const quoteMatch = line.match(/^> "([^"]+)"/);
          if (quoteMatch && quoteMatch[1].length < 300) {
            themeQuotes.push(quoteMatch[1]);
            // Also add to flat vocQuotes if not duplicate
            if (!vocQuotes.includes(quoteMatch[1])) {
              vocQuotes.push(quoteMatch[1]);
            }
          }
        });
        if (themeQuotes.length > 0) {
          goldNuggetsByTheme.push({ theme: themeName, quotes: themeQuotes });
        }
      }
    });
  }

  // Extract product affinities
  const productAffinities: Array<{ product: string; reason: string }> = [];
  const prodMatch = content.match(/## Product Affinities\n\n[\s\S]*?\|[\s\S]*?\|[\s\S]*?\n\|[-|]+\n([\s\S]*?)(?=\n---|\n##)/);
  if (prodMatch) {
    const rows = prodMatch[1].split("\n").filter(r => r.includes("|"));
    rows.forEach(row => {
      const parts = row.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        productAffinities.push({
          product: parts[0].replace(/\*\*/g, ""),
          reason: parts[1]
        });
      }
    });
  }

  // Extract copy examples
  const adHookMatch = content.match(/\*\*Ad Hook:\*\*\n> "([^"]+)"/);
  const adHook = adHookMatch ? adHookMatch[1] : "";

  const emailSubjects: string[] = [];
  const emailMatch = content.match(/\*\*Email Subject Lines:\*\*\n([\s\S]*?)(?=\n\*\*|\n---|\n##)/);
  if (emailMatch) {
    emailMatch[1].split("\n").filter(l => l.startsWith("- ")).forEach(l => {
      emailSubjects.push(l.replace(/^- "?/, "").replace(/"?$/, ""));
    });
  }

  const ctas: string[] = [];
  const ctaMatch = content.match(/\*\*CTA Options:\*\*\n([\s\S]*?)(?=\n---|\n##|$)/);
  if (ctaMatch) {
    ctaMatch[1].split("\n").filter(l => l.startsWith("- ")).forEach(l => {
      ctas.push(l.replace(/^- "?/, "").replace(/"?$/, ""));
    });
  }

  return {
    id: filename.replace(".md", ""),
    name,
    percentage,
    identitySnapshot,
    demographics,
    analytics,
    coreIdentityTraits,
    values,
    worldview,
    fears,
    desires,
    frustrations,
    guiltyPleasures,
    jobsFunctional,
    jobsEmotional,
    jobsSocial,
    purchaseTriggers,
    purchaseObjections,
    dayInLife,
    messagingAngles,
    languageResonates,
    languageAvoid,
    vocQuotes,
    goldNuggetsByTheme,
    productAffinities,
    copyExamples: { adHook, emailSubjects, ctas }
  };
}

export async function GET() {
  try {
    const personasDir = path.join(process.cwd(), "training-data/personas");
    const files = fs.readdirSync(personasDir).filter(f => f.endsWith(".md"));

    const personas: ParsedPersona[] = [];

    for (const file of files) {
      const filePath = path.join(personasDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = parseMarkdown(content, file);
      personas.push(parsed);
    }

    // Sort by percentage (descending)
    personas.sort((a, b) => {
      const aNum = parseInt(a.percentage.replace(/[^0-9]/g, "")) || 0;
      const bNum = parseInt(b.percentage.replace(/[^0-9]/g, "")) || 0;
      return bNum - aNum;
    });

    return NextResponse.json(personas);
  } catch (error) {
    console.error("Error reading persona files:", error);
    return NextResponse.json({ error: "Failed to load personas" }, { status: 500 });
  }
}
