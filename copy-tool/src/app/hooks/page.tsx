"use client";

import { useState, useEffect } from "react";
import { GeneratedHook, SavedHook, HookPOV, HookType, HookChannel, AwarenessLevel } from "@/types/hook";
import { Persona, Product } from "@/types/brief";

const hookFrameworks = [
  { id: "identity", name: "Identity Signal", description: "\"That's me\" recognition" },
  { id: "expectation", name: "Expectation Violation", description: "\"Wait... what?\"" },
  { id: "avoidable-loss", name: "Avoidable Loss", description: "Fear of wasted money/time/effort" },
  { id: "evidence", name: "Evidence + Specificity", description: "Receipts over cute" },
  { id: "question", name: "Question Hook", description: "Provocative question" },
  { id: "story", name: "Story/Scene", description: "Drop into a moment" },
  { id: "contrarian", name: "Contrarian", description: "Challenge conventional wisdom" },
  { id: "pattern-interrupt", name: "Pattern Interrupt", description: "Unexpected statement" },
];

const povOptions: { id: HookPOV; name: string }[] = [
  { id: "brand", name: "Brand" },
  { id: "creator", name: "Creator" },
];

const typeOptions: { id: HookType; name: string }[] = [
  { id: "paid", name: "Paid" },
  { id: "organic", name: "Organic" },
];

const channelOptions: { id: HookChannel; name: string }[] = [
  { id: "meta", name: "Meta" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "instagram", name: "Instagram" },
];

const awarenessOptions: { id: AwarenessLevel; name: string; description: string }[] = [
  { id: "unaware", name: "Unaware", description: "Don't know they have a problem" },
  { id: "problem-aware", name: "Problem Aware", description: "Know the problem, not solutions" },
  { id: "solution-aware", name: "Solution Aware", description: "Know solutions exist, not YOUR product" },
  { id: "product-aware", name: "Product Aware", description: "Know your product, not convinced" },
  { id: "most-aware", name: "Most Aware", description: "Ready to buy, need a reason to act" },
];

export default function HooksPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "library">("generate");

  // Input state
  const [brief, setBrief] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [angle, setAngle] = useState("");

  // Filter state
  const [selectedPOV, setSelectedPOV] = useState<HookPOV | "">("");
  const [selectedType, setSelectedType] = useState<HookType | "">("");
  const [selectedChannel, setSelectedChannel] = useState<HookChannel | "">("");
  const [selectedAwareness, setSelectedAwareness] = useState<AwarenessLevel | "">("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Generated hooks
  const [generatedHooks, setGeneratedHooks] = useState<GeneratedHook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Library state
  const [savedHooks, setSavedHooks] = useState<SavedHook[]>([]);
  const [libraryFilter, setLibraryFilter] = useState("");

  useEffect(() => {
    // Always use dark mode
    document.documentElement.setAttribute("data-theme", "dark");

    // Load products and personas
    Promise.all([
      fetch("/api/products").then(res => res.json()),
      fetch("/api/personas").then(res => res.json()),
    ]).then(([productsData, personasData]) => {
      setProducts(productsData);
      setPersonas(personasData);
    }).catch(console.error);

    // Load saved hooks from localStorage
    const savedHooksData = localStorage.getItem("hookLibrary");
    if (savedHooksData) {
      setSavedHooks(JSON.parse(savedHooksData));
    }
  }, []);

  const handleFrameworkToggle = (frameworkId: string) => {
    setSelectedFrameworks(prev =>
      prev.includes(frameworkId)
        ? prev.filter(f => f !== frameworkId)
        : [...prev, frameworkId]
    );
  };

  const handleGenerate = async () => {
    if (!brief.trim() && !selectedProduct) {
      alert("Please enter a brief or select a product");
      return;
    }

    setIsLoading(true);
    setGeneratedHooks([]);

    try {
      const response = await fetch("/api/hooks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim() || undefined,
          product: selectedProduct || undefined,
          persona: selectedPersona || undefined,
          angle: angle || undefined,
          pov: selectedPOV || undefined,
          type: selectedType || undefined,
          channel: selectedChannel || undefined,
          awarenessLevel: selectedAwareness || undefined,
          frameworks: selectedFrameworks.length > 0 ? selectedFrameworks : undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setGeneratedHooks(data.hooks);
      }
    } catch (error) {
      console.error("Error generating hooks:", error);
      alert("Error generating hooks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveHook = (hook: GeneratedHook) => {
    const savedHook: SavedHook = {
      ...hook,
      savedAt: new Date().toISOString(),
    };

    const updated = [...savedHooks, savedHook];
    setSavedHooks(updated);
    localStorage.setItem("hookLibrary", JSON.stringify(updated));
  };

  const handleDeleteHook = (hookId: string) => {
    const updated = savedHooks.filter(h => h.id !== hookId);
    setSavedHooks(updated);
    localStorage.setItem("hookLibrary", JSON.stringify(updated));
  };

  const handleCopyHook = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredLibraryHooks = savedHooks.filter(hook =>
    !libraryFilter ||
    hook.text.toLowerCase().includes(libraryFilter.toLowerCase()) ||
    hook.frameworkName.toLowerCase().includes(libraryFilter.toLowerCase()) ||
    hook.product?.toLowerCase().includes(libraryFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-[var(--card-border)] flex items-center justify-center">
              <span className="text-[var(--foreground)] text-xs font-semibold">JR</span>
            </div>
            <span className="font-medium text-[var(--foreground)]">Hook Generator</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              Copy Studio
            </a>
            <a href="/brief-generator" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              Brief Generator
            </a>
            <a href="/gtm" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              GTM Workflow
            </a>
            <a href="/boards" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              Boards
            </a>
            <a href="/training" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              Training Data
            </a>
            <a href="/ad-formats" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              Ad Formats
            </a>
            <a href="/personas" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors">
              Personas
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Jones Road Beauty</p>
          <h1 className="text-4xl font-light text-[var(--foreground)] mb-2">
            Generate <span className="font-semibold">Video Hooks</span>
          </h1>
          <p className="text-[var(--muted)] mt-4 max-w-lg mx-auto">
            Create scroll-stopping opening lines for ads and organic videos using proven frameworks.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "generate"
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "library"
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Library ({savedHooks.length})
          </button>
        </div>

        {activeTab === "generate" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              {/* Product & Persona Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="floating-label mb-3 block">Product</label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="input-dark w-full p-3 rounded-lg cursor-pointer"
                  >
                    <option value="">Any product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="floating-label mb-3 block">Persona</label>
                  <select
                    value={selectedPersona}
                    onChange={(e) => setSelectedPersona(e.target.value)}
                    className="input-dark w-full p-3 rounded-lg cursor-pointer"
                  >
                    <option value="">Any persona</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Angle */}
              <div>
                <label className="floating-label mb-3 block">Angle / Hook Direction</label>
                <input
                  type="text"
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  placeholder="e.g., time-saving, natural ingredients, no-makeup makeup..."
                  className="input-dark w-full p-3 rounded-lg"
                />
              </div>

              {/* Brief / Description */}
              <div>
                <label className="floating-label mb-3 block">Additional Context</label>
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Any additional details, notes, or specific direction for the hooks..."
                  className="input-dark w-full p-4 rounded-lg min-h-[80px] resize-none"
                />
              </div>

              {/* Filters */}
              <div className="border-t border-[var(--card-border)] pt-6">
                <label className="floating-label mb-4 block">Filters (Optional)</label>

                <div className="grid grid-cols-2 gap-4">
                  {/* POV */}
                  <div>
                    <label className="text-xs text-[var(--muted)] mb-2 block">POV</label>
                    <select
                      value={selectedPOV}
                      onChange={(e) => setSelectedPOV(e.target.value as HookPOV | "")}
                      className="input-dark w-full p-2 rounded-lg text-sm cursor-pointer"
                    >
                      <option value="">Any</option>
                      {povOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-xs text-[var(--muted)] mb-2 block">Type</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as HookType | "")}
                      className="input-dark w-full p-2 rounded-lg text-sm cursor-pointer"
                    >
                      <option value="">Any</option>
                      {typeOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Channel */}
                  <div>
                    <label className="text-xs text-[var(--muted)] mb-2 block">Channel</label>
                    <select
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value as HookChannel | "")}
                      className="input-dark w-full p-2 rounded-lg text-sm cursor-pointer"
                    >
                      <option value="">Any</option>
                      {channelOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Awareness */}
                  <div>
                    <label className="text-xs text-[var(--muted)] mb-2 block">Awareness Level</label>
                    <select
                      value={selectedAwareness}
                      onChange={(e) => setSelectedAwareness(e.target.value as AwarenessLevel | "")}
                      className="input-dark w-full p-2 rounded-lg text-sm cursor-pointer"
                    >
                      <option value="">Any</option>
                      {awarenessOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Framework Selection */}
              <div>
                <label className="floating-label mb-3 block">Frameworks (Optional - select specific or leave empty for variety)</label>
                <div className="grid grid-cols-2 gap-2">
                  {hookFrameworks.map((framework) => (
                    <button
                      key={framework.id}
                      onClick={() => handleFrameworkToggle(framework.id)}
                      className={`channel-card py-2 px-3 text-left rounded-lg cursor-pointer ${
                        selectedFrameworks.includes(framework.id) ? "selected" : ""
                      }`}
                    >
                      <span className="text-sm font-medium block">{framework.name}</span>
                      <span className="text-xs text-[var(--muted)]">{framework.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-4 rounded-lg text-center font-medium transition-all bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Generating..." : "Generate Hooks"}
              </button>
            </div>

            {/* Right Column - Results */}
            <div>
              <div className="sticky top-24">
                <label className="floating-label mb-4 block">Generated Hooks</label>

                {generatedHooks.length === 0 && !isLoading && (
                  <div className="card-dark rounded-xl p-8 text-center">
                    <p className="text-[var(--muted)]">
                      Configure your inputs and click Generate to create hooks
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="card-dark rounded-xl p-8 text-center">
                    <div className="animate-pulse">
                      <div className="h-4 bg-[var(--card-border)] rounded w-3/4 mx-auto mb-4"></div>
                      <div className="h-4 bg-[var(--card-border)] rounded w-1/2 mx-auto mb-4"></div>
                      <div className="h-4 bg-[var(--card-border)] rounded w-2/3 mx-auto"></div>
                    </div>
                    <p className="text-[var(--muted)] mt-4">Generating hooks...</p>
                  </div>
                )}

                {generatedHooks.length > 0 && (
                  <div className="space-y-4">
                    {generatedHooks.map((hook) => (
                      <div key={hook.id} className="card-dark rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <span className="text-xs px-2 py-1 rounded bg-[var(--card-border)] text-[var(--muted)]">
                            {hook.frameworkName}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopyHook(hook.text)}
                              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => handleSaveHook(hook)}
                              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        <p className="text-[var(--foreground)] leading-relaxed">{hook.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Library Tab */
          <div>
            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                value={libraryFilter}
                onChange={(e) => setLibraryFilter(e.target.value)}
                placeholder="Search saved hooks..."
                className="input-dark w-full max-w-md p-3 rounded-lg"
              />
            </div>

            {filteredLibraryHooks.length === 0 ? (
              <div className="card-dark rounded-xl p-8 text-center">
                <p className="text-[var(--muted)]">
                  {savedHooks.length === 0
                    ? "No saved hooks yet. Generate some hooks and save your favorites!"
                    : "No hooks match your search."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLibraryHooks.map((hook) => (
                  <div key={hook.id} className="card-dark rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-xs px-2 py-1 rounded bg-[var(--card-border)] text-[var(--muted)]">
                        {hook.frameworkName}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyHook(hook.text)}
                          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleDeleteHook(hook.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-[var(--foreground)] leading-relaxed text-sm">{hook.text}</p>
                    {hook.product && (
                      <p className="text-xs text-[var(--muted)] mt-2">Product: {hook.product}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
