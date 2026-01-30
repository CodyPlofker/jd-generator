"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ParsedPersona {
  id: string;
  name: string;
  percentage: string;
  identitySnapshot: string;
  demographics: Record<string, string>;
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
];

const SECTIONS = {
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

            {/* Product Affinities */}
            {persona.productAffinities.length > 0 && (
              <CollapsibleSection id="products" title="Product Affinities">
                <div className="space-y-2">
                  {persona.productAffinities.map((p, i) => (
                    <div key={i} className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-4">
                      <span className="font-medium text-[var(--foreground)]">{p.product}</span>
                      <p className="text-sm text-[var(--muted)] mt-1">{p.reason}</p>
                    </div>
                  ))}
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
                  {persona.percentage && (
                    <span className="text-xs bg-[var(--input-bg)] text-[var(--muted)] px-2 py-1 rounded">
                      {persona.percentage}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)] line-clamp-3">
                  {persona.identitySnapshot.substring(0, 150)}...
                </p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {persona.productAffinities.slice(0, 3).map((p, i) => (
                    <span key={i} className="text-xs bg-[var(--input-bg)] text-[var(--muted-dim)] px-2 py-0.5 rounded">
                      {p.product}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
