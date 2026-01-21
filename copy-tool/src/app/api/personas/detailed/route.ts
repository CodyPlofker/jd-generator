import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface ParsedPersona {
  id: string;
  name: string;
  percentage: string;
  identitySnapshot: string;
  demographics: Record<string, string>;
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

  // Extract VOC quotes
  const vocQuotes: string[] = [];
  const vocSection = content.match(/## Voice of Customer[\s\S]*?(?=\n## Purchase|## Jobs|---\n\n##)/);
  if (vocSection) {
    const quotes = vocSection[0].match(/> "([^"]+)"/g);
    if (quotes) {
      quotes.slice(0, 8).forEach(q => {
        const clean = q.replace(/^> "/, "").replace(/"$/, "");
        if (clean.length < 250) vocQuotes.push(clean);
      });
    }
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
