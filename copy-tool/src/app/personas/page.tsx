"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
  coreIdentityTraits: string[];
  values: string[];
  worldview: string;
  fears: string[];
  desires: string[];
  frustrations: string[];
  guiltyPleasures: string[];
  jobsFunctional: string[];
  jobsEmotional: string[];
  jobsSocial: string[];
  purchaseTriggers: string[];
  purchaseObjections: Array<{ objection: string; response: string }>;
  dayInLife: string;
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

const TABS = [
  { id: "who", label: "Who She Is" },
  { id: "messaging", label: "How to Talk to Her" },
  { id: "copy", label: "Copy Examples" },
  { id: "analytics", label: "Analytics" },
];

const SECTIONS = {
  analytics: [
    { id: "persona-profile", label: "Persona Profile" },
    { id: "revenue", label: "Revenue Performance" },
    { id: "customer-demo", label: "Customer Demographics" },
    { id: "geography", label: "Geography" },
    { id: "product-affinity", label: "Product Affinity" },
  ],
  who: [
    { id: "identity", label: "Identity" },
    { id: "demographics", label: "Demographics" },
    { id: "psychographics", label: "Psychographics" },
    { id: "emotions", label: "Emotions" },
    { id: "jobs", label: "Jobs To Be Done" },
    { id: "dayinlife", label: "Day in Life" },
    { id: "products", label: "Products" },
  ],
  messaging: [
    { id: "angles", label: "Messaging Angles" },
    { id: "voc", label: "Voice of Customer" },
    { id: "language", label: "Language Guide" },
    { id: "purchase", label: "Purchase Psychology" },
  ],
  copy: [
    { id: "hooks", label: "Ad Hooks" },
    { id: "emails", label: "Email Subjects" },
    { id: "ctas", label: "CTAs" },
  ],
};

// Copy to clipboard helper
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-lg transition-all ${copied ? "bg-green-500/20 text-green-400" : "hover:bg-[var(--input-bg)] text-[var(--muted-dim)] hover:text-[var(--muted)]"} ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

// Collapsible section
function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = true,
  highlight = false
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  highlight?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id={id} className={`scroll-mt-32 ${highlight ? "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)] rounded-xl" : ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left cursor-pointer group"
      >
        <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide group-hover:text-[var(--foreground)] transition-colors">
          {title}
        </h2>
        <svg
          className={`w-5 h-5 text-[var(--muted-dim)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pb-6">{children}</div>}
    </section>
  );
}

// Copyable item with hover effect
function CopyableItem({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`group flex items-start justify-between gap-2 p-3 rounded-lg hover:bg-[var(--input-bg)] transition-colors ${className}`}>
      <span className="text-sm text-[var(--foreground)]">"{text}"</span>
      <CopyButton text={text} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<ParsedPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<ParsedPersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("who");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const response = await fetch("/api/personas/detailed");
      const data = await response.json();
      setPersonas(data);
    } catch (error) {
      console.error("Error loading personas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Render persona detail view
  const renderPersonaDetail = (persona: ParsedPersona) => {

    return (
      <div>
        {/* Tab Content */}
        {activeTab === "analytics" && persona.analytics && (
          <div className="space-y-2">
            {/* Persona Profile Radar Chart */}
            {persona.analytics.personaProfile && (
              <CollapsibleSection id="persona-profile" title="Persona Profile">
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
                  <div className="flex items-center justify-center">
                    <svg viewBox="0 0 300 300" className="w-72 h-72">
                      {/* Background pentagon grid */}
                      {[100, 75, 50, 25].map((scale, i) => (
                        <polygon
                          key={i}
                          points={[
                            [150, 150 - scale], // Affluence (top)
                            [150 + scale * 0.95, 150 - scale * 0.31], // Velocity (top right)
                            [150 + scale * 0.59, 150 + scale * 0.81], // Loyalty (bottom right)
                            [150 - scale * 0.59, 150 + scale * 0.81], // Growth (bottom left)
                            [150 - scale * 0.95, 150 - scale * 0.31], // Influence (top left)
                          ].map(p => p.join(",")).join(" ")}
                          fill="none"
                          stroke="var(--card-border)"
                          strokeWidth="1"
                        />
                      ))}
                      {/* Axis lines */}
                      {[
                        [150, 50], // Affluence
                        [245, 119], // Velocity
                        [209, 231], // Loyalty
                        [91, 231], // Growth
                        [55, 119], // Influence
                      ].map((point, i) => (
                        <line
                          key={i}
                          x1="150"
                          y1="150"
                          x2={point[0]}
                          y2={point[1]}
                          stroke="var(--card-border)"
                          strokeWidth="1"
                        />
                      ))}
                      {/* Data polygon */}
                      <polygon
                        points={[
                          [150, 150 - persona.analytics.personaProfile!.affluence], // Affluence
                          [150 + persona.analytics.personaProfile!.velocity * 0.95, 150 - persona.analytics.personaProfile!.velocity * 0.31], // Velocity
                          [150 + persona.analytics.personaProfile!.loyalty * 0.59, 150 + persona.analytics.personaProfile!.loyalty * 0.81], // Loyalty
                          [150 - persona.analytics.personaProfile!.growth * 0.59, 150 + persona.analytics.personaProfile!.growth * 0.81], // Growth
                          [150 - persona.analytics.personaProfile!.influence * 0.95, 150 - persona.analytics.personaProfile!.influence * 0.31], // Influence
                        ].map(p => p.join(",")).join(" ")}
                        fill="rgba(250, 204, 21, 0.3)"
                        stroke="rgb(250, 204, 21)"
                        strokeWidth="2"
                      />
                      {/* Labels */}
                      <text x="150" y="35" textAnchor="middle" className="fill-[var(--muted)] text-xs">Affluence</text>
                      <text x="260" y="119" textAnchor="start" className="fill-[var(--muted)] text-xs">Velocity</text>
                      <text x="220" y="255" textAnchor="middle" className="fill-[var(--muted)] text-xs">Loyalty</text>
                      <text x="80" y="255" textAnchor="middle" className="fill-[var(--muted)] text-xs">Growth</text>
                      <text x="40" y="119" textAnchor="end" className="fill-[var(--muted)] text-xs">Influence</text>
                    </svg>
                  </div>
                  {/* Values grid */}
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {[
                      { label: "Affluence", value: persona.analytics.personaProfile!.affluence },
                      { label: "Velocity", value: persona.analytics.personaProfile!.velocity },
                      { label: "Loyalty", value: persona.analytics.personaProfile!.loyalty },
                      { label: "Growth", value: persona.analytics.personaProfile!.growth },
                      { label: "Influence", value: persona.analytics.personaProfile!.influence },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p className="text-lg font-semibold text-[var(--foreground)]">{item.value}</p>
                        <p className="text-xs text-[var(--muted-dim)]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Revenue Performance */}
            <CollapsibleSection id="revenue" title="Revenue Performance">
              <div className="space-y-4">
                {/* Performance Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  persona.analytics.performanceClass === "outperformer"
                    ? "bg-green-500/20 text-green-400"
                    : persona.analytics.performanceClass === "underperformer"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {persona.analytics.performanceClass === "outperformer" && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                  {persona.analytics.performanceClass === "underperformer" && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {persona.analytics.revenueIndex}x Revenue Index
                  {persona.analytics.performanceClass === "outperformer" && " — Outperformer"}
                  {persona.analytics.performanceClass === "underperformer" && " — Underperformer"}
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">Customer Share</p>
                    <p className="text-2xl font-semibold text-[var(--foreground)]">{persona.analytics.customerShare}%</p>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">Revenue Share</p>
                    <p className="text-2xl font-semibold text-[var(--foreground)]">{persona.analytics.revenueShare}%</p>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">AOV</p>
                    <p className="text-2xl font-semibold text-[var(--foreground)]">${persona.analytics.aov}</p>
                    <p className={`text-xs ${persona.analytics.aovVsBrand >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {persona.analytics.aovVsBrand >= 0 ? "+" : ""}{persona.analytics.aovVsBrand}% vs brand
                    </p>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">LTV</p>
                    <p className="text-2xl font-semibold text-[var(--foreground)]">${persona.analytics.ltv}</p>
                    <p className={`text-xs ${persona.analytics.ltvVsBrand >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {persona.analytics.ltvVsBrand >= 0 ? "+" : ""}{persona.analytics.ltvVsBrand}% vs brand
                    </p>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">Repeat Rate</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">{persona.analytics.repeatRate}%</p>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">Orders/Year</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">{persona.analytics.ordersPerYear}</p>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                    <p className="text-xs text-[var(--muted-dim)] mb-1">Sample Size</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">{persona.analytics.sampleSize.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Customer Demographics */}
            <CollapsibleSection id="customer-demo" title="Customer Demographics">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                  <p className="text-xs text-[var(--muted-dim)] mb-1">Average Age</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{persona.analytics.demographics.avgAge}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                  <p className="text-xs text-[var(--muted-dim)] mb-1">Median Age</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{persona.analytics.demographics.medianAge}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                  <p className="text-xs text-[var(--muted-dim)] mb-1">Female</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{persona.analytics.demographics.genderFemale}%</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Geography */}
            {persona.analytics.topStates.length > 0 && (
              <CollapsibleSection id="geography" title="Top States">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {persona.analytics.topStates.map((state, i) => (
                    <div key={state} className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4 flex items-center gap-3">
                      <span className="text-lg font-bold text-[var(--muted-dim)]">{i + 1}</span>
                      <span className="text-sm text-[var(--foreground)]">{state}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Product Affinity */}
            {(persona.analytics.productAffinityHigh.length > 0 || persona.analytics.productAffinityLow.length > 0) && (
              <CollapsibleSection id="product-affinity" title="Product Affinity">
                <div className="space-y-4">
                  {persona.analytics.productAffinityHigh.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-green-400 font-medium mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        Over-indexes (vs Brand Average)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {persona.analytics.productAffinityHigh.map((product, i) => (
                          <span key={i} className="text-sm bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {persona.analytics.productAffinityLow.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-red-400 font-medium mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        Under-indexes (vs Brand Average)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {persona.analytics.productAffinityLow.map((product, i) => (
                          <span key={i} className="text-sm bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {activeTab === "analytics" && !persona.analytics && (
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-8 text-center">
            <p className="text-[var(--muted)]">Analytics data not available for this persona.</p>
          </div>
        )}

        {activeTab === "who" && (
          <div className="space-y-2">
            {/* Identity */}
            <CollapsibleSection id="identity" title="Identity Snapshot">
              <p className="text-base text-[var(--foreground)] leading-relaxed">
                {persona.identitySnapshot}
              </p>
            </CollapsibleSection>

            {/* Demographics */}
            {Object.keys(persona.demographics).length > 0 && (
              <CollapsibleSection id="demographics" title="Demographics">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(persona.demographics).map(([key, value]) => (
                    <div key={key} className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-3">
                      <p className="text-xs text-[var(--muted-dim)] mb-1">{key}</p>
                      <p className="text-sm text-[var(--foreground)]">{value}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Psychographics */}
            {(persona.coreIdentityTraits.length > 0 || persona.values.length > 0 || persona.worldview) && (
              <CollapsibleSection id="psychographics" title="Psychographics">
                <div className="space-y-4">
                  {persona.coreIdentityTraits.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Core Identity Traits</p>
                      <ul className="space-y-2">
                        {persona.coreIdentityTraits.map((trait, i) => (
                          <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                            <span className="text-[var(--muted-dim)] flex-shrink-0">•</span> {trait}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {persona.values.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Values</p>
                      <ul className="space-y-2">
                        {persona.values.map((value, i) => (
                          <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                            <span className="text-[var(--muted-dim)] flex-shrink-0">{i + 1}.</span> {value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {persona.worldview && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Worldview</p>
                      <p className="text-sm text-[var(--foreground)] leading-relaxed">{persona.worldview}</p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Emotional Landscape */}
            <CollapsibleSection id="emotions" title="Emotional Landscape">
              <div className="grid grid-cols-1 gap-4">
                {persona.fears.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Fears</p>
                    <ul className="space-y-1.5">
                      {persona.fears.map((f, i) => (
                        <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                          <span className="text-[var(--muted-dim)] flex-shrink-0">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {persona.desires.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Desires</p>
                    <ul className="space-y-1.5">
                      {persona.desires.map((d, i) => (
                        <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                          <span className="text-[var(--muted-dim)] flex-shrink-0">•</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {persona.frustrations.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Frustrations</p>
                    <ul className="space-y-1.5">
                      {persona.frustrations.map((f, i) => (
                        <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                          <span className="text-[var(--muted-dim)] flex-shrink-0">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {persona.guiltyPleasures.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Guilty Pleasures</p>
                    <ul className="space-y-1.5">
                      {persona.guiltyPleasures.map((g, i) => (
                        <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                          <span className="text-[var(--muted-dim)] flex-shrink-0">•</span> {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Jobs To Be Done */}
            {(persona.jobsFunctional.length > 0 || persona.jobsEmotional.length > 0 || persona.jobsSocial.length > 0) && (
              <CollapsibleSection id="jobs" title="Jobs To Be Done">
                <div className="grid grid-cols-1 gap-4">
                  {persona.jobsFunctional.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Functional</p>
                      <ul className="space-y-2">
                        {persona.jobsFunctional.map((job, i) => (
                          <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                            <span className="text-[var(--muted-dim)] flex-shrink-0">{i + 1}.</span> {job}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {persona.jobsEmotional.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Emotional</p>
                      <ul className="space-y-2">
                        {persona.jobsEmotional.map((job, i) => (
                          <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                            <span className="text-[var(--muted-dim)] flex-shrink-0">{i + 1}.</span> {job}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {persona.jobsSocial.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Social</p>
                      <ul className="space-y-2">
                        {persona.jobsSocial.map((job, i) => (
                          <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                            <span className="text-[var(--muted-dim)] flex-shrink-0">{i + 1}.</span> {job}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Day in Life */}
            {persona.dayInLife && (
              <CollapsibleSection id="dayinlife" title="Day in Her Life">
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
                  <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-line">
                    {persona.dayInLife}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Product Affinities - Using OuterSignal Data */}
            {persona.analytics && (persona.analytics.productAffinityHigh.length > 0 || persona.analytics.productAffinityLow.length > 0) && (
              <CollapsibleSection id="products" title="Product Affinities">
                <div className="space-y-4">
                  {persona.analytics.productAffinityHigh.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-green-400 font-medium mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        Over-indexes (vs Brand Average)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {persona.analytics.productAffinityHigh.map((product, i) => (
                          <span key={i} className="text-sm bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {persona.analytics.productAffinityLow.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-red-400 font-medium mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        Under-indexes (vs Brand Average)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {persona.analytics.productAffinityLow.map((product, i) => (
                          <span key={i} className="text-sm bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {activeTab === "messaging" && (
          <div className="space-y-2">
            {/* Messaging Angles */}
            {persona.messagingAngles.length > 0 && (
              <CollapsibleSection id="angles" title="Messaging Angles">
                <div className="space-y-4">
                  {persona.messagingAngles.map((angle, i) => (
                    <div key={i} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
                      <p className="text-base font-medium text-[var(--foreground)] mb-3">{angle.theme}</p>
                      <div className="space-y-1">
                        {angle.hooks.map((h, j) => (
                          <CopyableItem key={j} text={h} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Voice of Customer - organized by theme if available */}
            {(persona.goldNuggetsByTheme?.length > 0 || persona.vocQuotes.length > 0) && (
              <CollapsibleSection id="voc" title="Voice of Customer">
                <div className="space-y-6">
                  {/* Themed Gold Nugget Quotes */}
                  {persona.goldNuggetsByTheme?.length > 0 ? (
                    persona.goldNuggetsByTheme.map((themeGroup, i) => (
                      <div key={i} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
                        <p className="text-sm font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--muted)]"></span>
                          {themeGroup.theme}
                        </p>
                        <div className="space-y-3">
                          {themeGroup.quotes.map((quote, j) => (
                            <div key={j} className="group flex justify-between gap-2 pl-4 border-l-2 border-[var(--card-border)] hover:border-[var(--muted-dim)] transition-colors">
                              <p className="text-sm text-[var(--muted)] italic leading-relaxed">"{quote}"</p>
                              <CopyButton text={quote} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Fallback to flat list if no themed quotes */
                    persona.vocQuotes.map((quote, i) => (
                      <div key={i} className="group bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 border-l-4 border-l-[var(--muted-dim)]">
                        <div className="flex justify-between gap-2">
                          <p className="text-sm text-[var(--foreground)] italic leading-relaxed">"{quote}"</p>
                          <CopyButton text={quote} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Language Guide */}
            <CollapsibleSection id="language" title="Language Guide">
              <div className="grid grid-cols-1 gap-4">
                {persona.languageResonates.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
                    <p className="text-xs text-[var(--muted)] font-medium mb-4 uppercase tracking-wide">Use These Words</p>
                    <div className="flex flex-wrap gap-2">
                      {persona.languageResonates.map((w, i) => (
                        <button
                          key={i}
                          onClick={() => navigator.clipboard.writeText(w)}
                          className="text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] px-3 py-1.5 rounded-lg hover:border-[var(--muted-dim)] transition-colors cursor-pointer"
                          title="Click to copy"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {persona.languageAvoid.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
                    <p className="text-xs text-[var(--muted)] font-medium mb-4 uppercase tracking-wide">Avoid These Words</p>
                    <div className="flex flex-wrap gap-2">
                      {persona.languageAvoid.map((w, i) => (
                        <span key={i} className="text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--muted)] px-3 py-1.5 rounded-lg line-through">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Purchase Psychology */}
            {(persona.purchaseTriggers.length > 0 || persona.purchaseObjections.length > 0) && (
              <CollapsibleSection id="purchase" title="Purchase Psychology">
                <div className="space-y-4">
                  {persona.purchaseTriggers.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Triggers to Purchase</p>
                      <ul className="space-y-2">
                        {persona.purchaseTriggers.map((trigger, i) => (
                          <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                            <span className="text-[var(--muted-dim)] flex-shrink-0">•</span> {trigger}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {persona.purchaseObjections.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                      <p className="text-xs text-[var(--muted)] font-medium mb-3 uppercase tracking-wide">Objections & How to Overcome</p>
                      <div className="space-y-3">
                        {persona.purchaseObjections.map((obj, i) => (
                          <div key={i} className="border-l-2 border-[var(--card-border)] pl-3">
                            <p className="text-sm text-[var(--muted)] italic">"{obj.objection}"</p>
                            <p className="text-sm text-[var(--foreground)] mt-1">→ {obj.response}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {activeTab === "copy" && (
          <div className="space-y-2">
            {/* Ad Hooks */}
            {persona.copyExamples.adHook && (
              <CollapsibleSection id="hooks" title="Ad Hooks">
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-lg text-[var(--foreground)] font-medium">"{persona.copyExamples.adHook}"</p>
                    <CopyButton text={persona.copyExamples.adHook} />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Email Subject Lines */}
            {persona.copyExamples.emailSubjects.length > 0 && (
              <CollapsibleSection id="emails" title="Email Subject Lines">
                <div className="space-y-2">
                  {persona.copyExamples.emailSubjects.map((subject, i) => (
                    <div key={i} className="group flex items-center justify-between gap-2 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg hover:bg-[var(--input-bg)] transition-colors">
                      <span className="text-sm text-[var(--foreground)]">{subject}</span>
                      <CopyButton text={subject} className="opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* CTAs */}
            {persona.copyExamples.ctas.length > 0 && (
              <CollapsibleSection id="ctas" title="Call-to-Actions">
                <div className="flex flex-wrap gap-3">
                  {persona.copyExamples.ctas.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => navigator.clipboard.writeText(c)}
                      className="text-sm bg-[var(--foreground)] text-[var(--background)] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                      title="Click to copy"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}
      </div>
    );
  };

  // Detail view with sidebar and tabs
  if (selectedPersona) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <header className="border-b border-[var(--card-border)] bg-[var(--card)] sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedPersona(null)}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-[var(--foreground)]">{selectedPersona.name}</h1>
                  {selectedPersona.percentage && (
                    <span className="text-sm text-[var(--muted)]">{selectedPersona.percentage} of customer base</span>
                  )}
                </div>
              </div>

            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main content with sidebar */}
        <div className="max-w-7xl mx-auto flex">
          {/* Sidebar */}
          <aside className="w-48 flex-shrink-0 border-r border-[var(--card-border)] sticky top-[140px] h-[calc(100vh-140px)] overflow-y-auto hidden lg:block">
            <nav className="p-4 space-y-1">
              {SECTIONS[activeTab as keyof typeof SECTIONS].map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main ref={mainRef} className="flex-1 p-6">
            {renderPersonaDetail(selectedPersona)}
          </main>
        </div>
      </div>
    );
  }

  // Gallery view
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Customer Personas</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-[var(--muted)] mb-8 max-w-2xl">
          Deep profiles of our core customer segments. Use these for messaging inspiration, copy angles, and understanding what resonates.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-[var(--card)] rounded-xl loading-shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona)}
                className="text-left bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 hover:border-[var(--muted-dim)] transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-[var(--foreground)] transition-colors">
                    {persona.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {persona.analytics && (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        persona.analytics.performanceClass === "outperformer"
                          ? "bg-green-500/20 text-green-400"
                          : persona.analytics.performanceClass === "underperformer"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {persona.analytics.revenueIndex}x
                      </span>
                    )}
                    {persona.percentage && (
                      <span className="text-xs bg-[var(--input-bg)] text-[var(--muted)] px-2 py-1 rounded">
                        {persona.percentage}
                      </span>
                    )}
                  </div>
                </div>
                {persona.analytics && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-[var(--foreground)]">${persona.analytics.aov}</p>
                      <p className="text-xs text-[var(--muted-dim)]">AOV</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-[var(--foreground)]">${persona.analytics.ltv}</p>
                      <p className="text-xs text-[var(--muted-dim)]">LTV</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-[var(--foreground)]">{persona.analytics.repeatRate}%</p>
                      <p className="text-xs text-[var(--muted-dim)]">Repeat</p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-[var(--muted)] line-clamp-2">
                  {persona.identitySnapshot.substring(0, 100)}...
                </p>
                {persona.analytics && persona.analytics.productAffinityHigh.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {persona.analytics.productAffinityHigh.slice(0, 3).map((product, i) => (
                      <span key={i} className="text-xs bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded">
                        {product}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
