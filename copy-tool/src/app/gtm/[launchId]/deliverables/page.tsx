"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  GTMLaunch,
  CreativeDeliverable,
  EmailDeliverable,
  SMSDeliverable,
  OrganicDeliverable,
  InfluencerDeliverable,
  RetailDeliverable,
  EcomDeliverable,
  PRAffiliateDeliverable,
  ChannelDeliverables,
  ChannelId,
  CHANNEL_CONFIG,
  EMAIL_TYPES,
  SMS_TYPES,
} from "@/types/gtm";

export default function DeliverablesPage() {
  const params = useParams();
  const launchId = params.launchId as string;

  const [launch, setLaunch] = useState<GTMLaunch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [channelDeliverables, setChannelDeliverables] = useState<ChannelDeliverables>({});
  const [activeTab, setActiveTab] = useState<ChannelId>("retention");

  // Legacy state for backwards compatibility
  const [deliverables, setDeliverables] = useState<CreativeDeliverable[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<string | null>(null);
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterConcept, setFilterConcept] = useState<string>("all");

  // Migrate old channel IDs to new ones
  const migrateChannelIds = (channels: string[]): ChannelId[] => {
    const migrationMap: Record<string, ChannelId> = {
      'email': 'retention',
      'sms': 'retention',
      'paid-social': 'creative',
      'web': 'ecom',
      'pr': 'pr-affiliate',
    };

    const migrated = channels.map(ch => migrationMap[ch] || ch as ChannelId);
    // Remove duplicates (e.g., if both email and sms were selected, they both become retention)
    return [...new Set(migrated)] as ChannelId[];
  };

  useEffect(() => {
    fetchLaunch();
  }, [launchId]);

  const fetchLaunch = async () => {
    try {
      const response = await fetch("/api/gtm/launches");
      const launches = await response.json();
      const found = launches.find((l: GTMLaunch) => l.id === launchId);
      if (found) {
        setLaunch(found);
        // Load channel deliverables or fallback to legacy
        if (found.channelDeliverables) {
          setChannelDeliverables(found.channelDeliverables);
        }
        setDeliverables(found.deliverables || found.channelDeliverables?.paidSocial || []);
        // Set active tab to first selected channel (with migration)
        if (found.selectedChannels?.length) {
          const migratedChannels = migrateChannelIds(found.selectedChannels);
          setActiveTab(migratedChannels[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching launch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDeliverables = async () => {
    if (!launch?.selectedChannels?.length && !launch?.channelStrategies) {
      alert("Please complete the strategy step first");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/gtm/generate-deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: launch.tier,
          pmc: launch.pmc,
          creativeBrief: launch.creativeBrief,
          channelStrategies: launch.channelStrategies,
          selectedChannels: launch.selectedChannels,
          productName: launch.product || launch.name,
          launchId: launch.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate deliverables");
      }

      const data = await response.json();
      setChannelDeliverables(data.channelDeliverables || {});
      setDeliverables(data.deliverables || []);

      // Save status
      await saveLaunch({
        channelDeliverables: data.channelDeliverables,
        status: "complete",
      });
    } catch (error) {
      console.error("Error generating deliverables:", error);
      alert("Failed to generate deliverables. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveLaunch = async (updates: Partial<GTMLaunch>) => {
    if (!launch) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/gtm/launches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...launch,
          channelDeliverables,
          deliverables,
          ...updates,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setLaunch(updated);
      }
    } catch (error) {
      console.error("Error saving launch:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePaidSocialDeliverable = (id: string, updates: Partial<CreativeDeliverable>) => {
    const updated = (channelDeliverables.creative || deliverables).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    if (channelDeliverables.creative) {
      setChannelDeliverables({ ...channelDeliverables, creative: updated });
    }
    setDeliverables(updated);
  };

  const updateEmailDeliverable = (id: string, updates: Partial<EmailDeliverable>) => {
    const updated = (channelDeliverables.retention?.emails || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({
      ...channelDeliverables,
      retention: { ...channelDeliverables.retention, emails: updated, sms: channelDeliverables.retention?.sms || [] }
    });
  };

  const updateSMSDeliverable = (id: string, updates: Partial<SMSDeliverable>) => {
    const updated = (channelDeliverables.retention?.sms || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({
      ...channelDeliverables,
      retention: { ...channelDeliverables.retention, emails: channelDeliverables.retention?.emails || [], sms: updated }
    });
  };

  const updateOrganicDeliverable = (id: string, updates: Partial<OrganicDeliverable>) => {
    const updated = (channelDeliverables.organicSocial || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({ ...channelDeliverables, organicSocial: updated });
  };

  const updateInfluencerDeliverable = (id: string, updates: Partial<InfluencerDeliverable>) => {
    const updated = (channelDeliverables.influencer || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({ ...channelDeliverables, influencer: updated });
  };

  const updateRetailDeliverable = (id: string, updates: Partial<RetailDeliverable>) => {
    const updated = (channelDeliverables.retail || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({ ...channelDeliverables, retail: updated });
  };

  const updatePRAffiliateDeliverable = (id: string, updates: Partial<PRAffiliateDeliverable>) => {
    const updated = (channelDeliverables.prAffiliate || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({ ...channelDeliverables, prAffiliate: updated });
  };

  const updateEcomDeliverable = (id: string, updates: Partial<EcomDeliverable>) => {
    const updated = (channelDeliverables.ecom || []).map((d) =>
      d.id === id ? { ...d, ...updates, status: "edited" as const } : d
    );
    setChannelDeliverables({ ...channelDeliverables, ecom: updated });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportAll = () => {
    const exportData = {
      retention: channelDeliverables.retention,
      creative: channelDeliverables.creative || deliverables,
      organicSocial: channelDeliverables.organicSocial,
      influencer: channelDeliverables.influencer,
      ecom: channelDeliverables.ecom,
      prAffiliate: channelDeliverables.prAffiliate,
      retail: channelDeliverables.retail,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${launch?.name || "deliverables"}-all-channels.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasAnyDeliverables = () => {
    return (
      (channelDeliverables.retention?.emails?.length || 0) > 0 ||
      (channelDeliverables.retention?.sms?.length || 0) > 0 ||
      (channelDeliverables.creative?.length || 0) > 0 ||
      (channelDeliverables.organicSocial?.length || 0) > 0 ||
      (channelDeliverables.influencer?.length || 0) > 0 ||
      (channelDeliverables.ecom?.length || 0) > 0 ||
      (channelDeliverables.prAffiliate?.length || 0) > 0 ||
      (channelDeliverables.retail?.length || 0) > 0 ||
      deliverables.length > 0
    );
  };

  const hasAnyStrategy = () => {
    return (
      // New channel structure
      launch?.channelStrategies?.retention?.emailItems?.length ||
      launch?.channelStrategies?.retention?.smsItems?.length ||
      launch?.channelStrategies?.creative?.concepts?.length ||
      launch?.channelStrategies?.paidMedia?.channels?.length ||
      launch?.channelStrategies?.organicSocial?.instagramPosts?.length ||
      launch?.channelStrategies?.influencer?.strategicSummary ||
      launch?.channelStrategies?.ecom?.placements?.length ||
      launch?.channelStrategies?.prAffiliate?.strategicSummary ||
      launch?.channelStrategies?.retail?.activations?.length
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="loading-shimmer w-8 h-8 rounded-full"></div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl text-[var(--foreground)]">Launch not found</h1>
          <Link href="/gtm" className="text-[var(--accent)] hover:underline mt-2 block">
            Back to launches
          </Link>
        </div>
      </div>
    );
  }

  const selectedChannels = migrateChannelIds(launch.selectedChannels || ["retention"]);

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/gtm" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                ← GTM Workflow
              </Link>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-[var(--foreground)] font-medium">{launch.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                {launch.tier.replace("tier-", "Tier ")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={`/gtm/${launchId}/brief`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs">✓</span>
                <span className="hidden sm:inline">Brief</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/strategy`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs">✓</span>
                <span className="hidden sm:inline">Strategy</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/deliverables`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</span>
                <span className="hidden sm:inline">Deliverables</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
            Step 3: Channel Deliverables
          </h1>
          <p className="text-[var(--muted)]">
            Generate and review copy for all {selectedChannels.length} selected channels.
          </p>
        </div>

        {/* No strategy warning */}
        {!hasAnyStrategy() && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              Please complete the strategy step first.{" "}
              <Link href={`/gtm/${launchId}/strategy`} className="underline">
                Go to Strategy →
              </Link>
            </p>
          </div>
        )}

        {/* Generate or View */}
        {!hasAnyDeliverables() ? (
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-12 text-center">
            {isGenerating ? (
              <div>
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <svg className="animate-spin w-16 h-16 text-[var(--accent)]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                  Generating Deliverables...
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  Creating copy for {selectedChannels.length} channels. This may take a few minutes.
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--input-bg)] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                  Generate All Deliverables
                </h3>
                <p className="text-sm text-[var(--muted)] mb-4 max-w-md mx-auto">
                  AI will generate copy for each channel based on your approved strategies:
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {selectedChannels.map((ch) => {
                    const config = CHANNEL_CONFIG[ch];
                    if (!config) return null;
                    return (
                      <span key={ch} className="text-xs px-2 py-1 rounded bg-[var(--input-bg)] text-[var(--muted)]">
                        {config.name}
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={generateDeliverables}
                  disabled={!hasAnyStrategy()}
                  className="btn-primary py-2.5 px-6 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate All Copy
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Channel Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {selectedChannels.map((ch) => {
                const config = CHANNEL_CONFIG[ch];
                if (!config) return null; // Skip if channel not in new config

                const hasContent =
                  (ch === "retention" && (channelDeliverables.retention?.emails?.length || channelDeliverables.retention?.sms?.length)) ||
                  (ch === "creative" && channelDeliverables.creative?.length) ||
                  (ch === "paid-media" && channelDeliverables.paidMedia?.length) ||
                  (ch === "organic-social" && channelDeliverables.organicSocial?.length) ||
                  (ch === "influencer" && channelDeliverables.influencer?.length) ||
                  (ch === "ecom" && channelDeliverables.ecom?.length) ||
                  (ch === "pr-affiliate" && channelDeliverables.prAffiliate?.length) ||
                  (ch === "retail" && channelDeliverables.retail?.length);

                return (
                  <button
                    key={ch}
                    onClick={() => setActiveTab(ch)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === ch
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span>{config.name}</span>
                    {hasContent && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === ch ? "bg-white/20" : "bg-green-500/20 text-green-400"}`}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Channel Content */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
              {activeTab === "retention" && (
                <RetentionDeliverablesView
                  emailDeliverables={channelDeliverables.retention?.emails || []}
                  smsDeliverables={channelDeliverables.retention?.sms || []}
                  onUpdateEmail={updateEmailDeliverable}
                  onUpdateSMS={updateSMSDeliverable}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {activeTab === "creative" && (
                <PaidSocialDeliverablesView
                  deliverables={channelDeliverables.creative || deliverables}
                  concepts={launch.channelStrategies?.creative?.concepts || []}
                  onUpdate={updatePaidSocialDeliverable}
                  copyToClipboard={copyToClipboard}
                  selectedDeliverable={selectedDeliverable}
                  setSelectedDeliverable={setSelectedDeliverable}
                  filterFormat={filterFormat}
                  setFilterFormat={setFilterFormat}
                  filterConcept={filterConcept}
                  setFilterConcept={setFilterConcept}
                />
              )}
              {activeTab === "paid-media" && (
                <PaidMediaDeliverablesView
                  strategy={launch.channelStrategies?.paidMedia}
                />
              )}
              {activeTab === "organic-social" && (
                <OrganicDeliverablesView
                  deliverables={channelDeliverables.organicSocial || []}
                  onUpdate={updateOrganicDeliverable}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {activeTab === "influencer" && (
                <InfluencerDeliverablesView
                  deliverables={channelDeliverables.influencer || []}
                  onUpdate={updateInfluencerDeliverable}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {activeTab === "ecom" && (
                <WebDeliverablesView
                  deliverables={channelDeliverables.ecom || []}
                  onUpdate={updateEcomDeliverable}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {activeTab === "pr-affiliate" && (
                <PRDeliverablesView
                  deliverables={channelDeliverables.prAffiliate || []}
                  onUpdate={updatePRAffiliateDeliverable}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {activeTab === "retail" && (
                <RetailDeliverablesView
                  deliverables={channelDeliverables.retail || []}
                  onUpdate={updateRetailDeliverable}
                  copyToClipboard={copyToClipboard}
                />
              )}
            </div>
          </>
        )}

        {/* Bottom Actions */}
        {hasAnyDeliverables() && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--card-border)]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => saveLaunch({ channelDeliverables })}
                disabled={isSaving}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save All"}
              </button>
              <button
                onClick={exportAll}
                className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export All
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/gtm/${launchId}/strategy`}
                className="py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer"
              >
                ← Back to Strategy
              </Link>
              <Link
                href="/gtm"
                className="btn-primary py-2.5 px-6 rounded-lg cursor-pointer"
              >
                Done
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// PAID SOCIAL DELIVERABLES VIEW
// ============================================
function PaidSocialDeliverablesView({
  deliverables,
  concepts,
  onUpdate,
  copyToClipboard,
  selectedDeliverable,
  setSelectedDeliverable,
  filterFormat,
  setFilterFormat,
  filterConcept,
  setFilterConcept,
}: {
  deliverables: CreativeDeliverable[];
  concepts: { id: string; name: string; personaName?: string }[];
  onUpdate: (id: string, updates: Partial<CreativeDeliverable>) => void;
  copyToClipboard: (text: string) => void;
  selectedDeliverable: string | null;
  setSelectedDeliverable: (id: string | null) => void;
  filterFormat: string;
  setFilterFormat: (f: string) => void;
  filterConcept: string;
  setFilterConcept: (c: string) => void;
}) {
  // Get unique personas from deliverables
  const [filterPersona, setFilterPersona] = useState<string>("all");
  const uniquePersonas = Array.from(
    new Set(deliverables.map(d => d.personaName).filter(Boolean))
  ) as string[];

  const filteredDeliverables = deliverables.filter((d) => {
    if (filterFormat !== "all" && d.format !== filterFormat) return false;
    if (filterConcept !== "all" && d.conceptId !== filterConcept) return false;
    if (filterPersona !== "all" && d.personaName !== filterPersona) return false;
    return true;
  });

  // Group deliverables by persona for stats
  const personaStats = deliverables.reduce((acc, d) => {
    const persona = d.personaName || 'General';
    if (!acc[persona]) acc[persona] = 0;
    acc[persona]++;
    return acc;
  }, {} as Record<string, number>);

  const selected = deliverables.find((d) => d.id === selectedDeliverable);

  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No paid social deliverables generated yet.</p>;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: Deliverables List */}
      <div className="col-span-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)]"
            >
              <option value="all">All Formats</option>
              <option value="static">Static</option>
              <option value="video">Video</option>
              <option value="carousel">Carousel</option>
            </select>
            <select
              value={filterPersona}
              onChange={(e) => setFilterPersona(e.target.value)}
              className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)]"
            >
              <option value="all">All Personas</option>
              {uniquePersonas.map((persona) => (
                <option key={persona} value={persona}>
                  {persona}
                </option>
              ))}
            </select>
          </div>
          <select
            value={filterConcept}
            onChange={(e) => setFilterConcept(e.target.value)}
            className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)]"
          >
            <option value="all">All Concepts</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.personaName ? ` (${c.personaName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="space-y-1">
          <div className="flex gap-4 text-sm">
            <span className="text-[var(--muted)]">{filteredDeliverables.length} of {deliverables.length} deliverables</span>
            <span className="text-green-400">
              {deliverables.filter((d) => d.status === "approved").length} approved
            </span>
          </div>
          {uniquePersonas.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(personaStats).map(([persona, count]) => (
                <span
                  key={persona}
                  className="px-2 py-0.5 rounded-full bg-[var(--card)] text-[var(--muted)]"
                >
                  {persona}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredDeliverables.map((deliverable) => (
            <button
              key={deliverable.id}
              onClick={() => setSelectedDeliverable(deliverable.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedDeliverable === deliverable.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-[var(--foreground)]">
                  {deliverable.conceptName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--card)] text-[var(--muted)]">
                    {deliverable.format}
                  </span>
                  {deliverable.status === "approved" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                      ✓
                    </span>
                  )}
                </div>
              </div>
              {deliverable.personaName && (
                <p className="text-xs text-[var(--accent)] mb-1">
                  {deliverable.personaName}
                </p>
              )}
              <p className="text-xs text-[var(--muted)] line-clamp-2">
                {deliverable.copy.primaryText}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Detail View */}
      <div className="col-span-7">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[var(--foreground)]">
                  {selected.conceptName}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[var(--muted)]">{selected.format} ad</p>
                  {selected.personaName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                      {selected.personaName}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdate(selected.id, {
                    status: selected.status === "approved" ? "edited" : "approved",
                  })
                }
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selected.status === "approved"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                }`}
              >
                {selected.status === "approved" ? "✓ Approved" : "Mark Approved"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--muted)]">Primary Text</label>
                  <button
                    onClick={() => copyToClipboard(selected.copy.primaryText)}
                    className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={selected.copy.primaryText}
                  onChange={(e) =>
                    onUpdate(selected.id, {
                      copy: { ...selected.copy, primaryText: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--muted)]">Headline</label>
                  <button
                    onClick={() => copyToClipboard(selected.copy.headline)}
                    className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <input
                  type="text"
                  value={selected.copy.headline}
                  onChange={(e) =>
                    onUpdate(selected.id, {
                      copy: { ...selected.copy, headline: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {selected.copy.linkDescription && (
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Link Description</label>
                  <input
                    type="text"
                    value={selected.copy.linkDescription}
                    onChange={(e) =>
                      onUpdate(selected.id, {
                        copy: { ...selected.copy, linkDescription: e.target.value },
                      })
                    }
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}

              {selected.format === "static" && (
                <>
                  {selected.copy.creativeHeadline && (
                    <div>
                      <label className="text-xs text-[var(--muted)] mb-1 block">
                        Creative Headline (on image)
                      </label>
                      <input
                        type="text"
                        value={selected.copy.creativeHeadline}
                        onChange={(e) =>
                          onUpdate(selected.id, {
                            copy: { ...selected.copy, creativeHeadline: e.target.value },
                          })
                        }
                        className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  )}
                  {selected.copy.subhead && (
                    <div>
                      <label className="text-xs text-[var(--muted)] mb-1 block">Subhead</label>
                      <input
                        type="text"
                        value={selected.copy.subhead}
                        onChange={(e) =>
                          onUpdate(selected.id, {
                            copy: { ...selected.copy, subhead: e.target.value },
                          })
                        }
                        className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selected.copy.cta && (
                      <div>
                        <label className="text-xs text-[var(--muted)] mb-1 block">CTA</label>
                        <input
                          type="text"
                          value={selected.copy.cta}
                          onChange={(e) =>
                            onUpdate(selected.id, {
                              copy: { ...selected.copy, cta: e.target.value },
                            })
                          }
                          className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    )}
                    {selected.copy.badge && (
                      <div>
                        <label className="text-xs text-[var(--muted)] mb-1 block">Badge</label>
                        <input
                          type="text"
                          value={selected.copy.badge}
                          onChange={(e) =>
                            onUpdate(selected.id, {
                              copy: { ...selected.copy, badge: e.target.value },
                            })
                          }
                          className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {selected.format === "video" && selected.copy.hook && (
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Hook (first 3 seconds)</label>
                  <textarea
                    value={selected.copy.hook}
                    onChange={(e) =>
                      onUpdate(selected.id, {
                        copy: { ...selected.copy, hook: e.target.value },
                      })
                    }
                    rows={2}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Select a deliverable to view and edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EMAIL DELIVERABLES VIEW
// ============================================
function EmailDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: EmailDeliverable[];
  onUpdate: (id: string, updates: Partial<EmailDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(deliverables[0]?.id || null);
  const selectedEmail = deliverables.find((d) => d.id === selected);

  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No email deliverables generated yet.</p>;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4 space-y-2">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Email Sequence</h4>
        {deliverables.map((email) => (
          <button
            key={email.id}
            onClick={() => setSelected(email.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
              selected === email.id
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-[var(--foreground)]">{email.name}</span>
              {email.status === "approved" && (
                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">✓</span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">{email.type}</p>
          </button>
        ))}
      </div>

      <div className="col-span-8">
        {selectedEmail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[var(--foreground)]">{selectedEmail.name}</h3>
              <button
                onClick={() =>
                  onUpdate(selectedEmail.id, {
                    status: selectedEmail.status === "approved" ? "edited" : "approved",
                  })
                }
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selectedEmail.status === "approved"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                }`}
              >
                {selectedEmail.status === "approved" ? "✓ Approved" : "Mark Approved"}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--muted)]">Subject Lines</label>
                <button onClick={() => copyToClipboard(selectedEmail.copy.subjectLines?.join('\n') || '')} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
              </div>
              <textarea
                value={selectedEmail.copy.subjectLines?.join('\n') || ''}
                onChange={(e) => onUpdate(selectedEmail.id, { copy: { ...selectedEmail.copy, subjectLines: e.target.value.split('\n') } })}
                rows={3}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="One subject line per line"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Preheader</label>
              <input
                type="text"
                value={selectedEmail.copy.preheader}
                onChange={(e) => onUpdate(selectedEmail.id, { copy: { ...selectedEmail.copy, preheader: e.target.value } })}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Headline</label>
              <input
                type="text"
                value={selectedEmail.copy.headline}
                onChange={(e) => onUpdate(selectedEmail.id, { copy: { ...selectedEmail.copy, headline: e.target.value } })}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--muted)]">Body</label>
                <button onClick={() => copyToClipboard(selectedEmail.copy.body)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
              </div>
              <textarea
                value={selectedEmail.copy.body}
                onChange={(e) => onUpdate(selectedEmail.id, { copy: { ...selectedEmail.copy, body: e.target.value } })}
                rows={8}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">CTA Button</label>
              <input
                type="text"
                value={selectedEmail.copy.cta}
                onChange={(e) => onUpdate(selectedEmail.id, { copy: { ...selectedEmail.copy, cta: e.target.value } })}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Select an email to view and edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SMS DELIVERABLES VIEW
// ============================================
function SMSDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: SMSDeliverable[];
  onUpdate: (id: string, updates: Partial<SMSDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No SMS deliverables generated yet.</p>;
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-[var(--foreground)]">SMS Messages</h4>
      {deliverables.map((sms) => (
        <div key={sms.id} className="p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-medium text-sm text-[var(--foreground)]">{sms.name}</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-[var(--card)] text-[var(--muted)]">{sms.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => copyToClipboard(sms.copy.message)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
              <button
                onClick={() => onUpdate(sms.id, { status: sms.status === "approved" ? "edited" : "approved" })}
                className={`px-2 py-1 rounded text-xs cursor-pointer ${sms.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-[var(--card)] text-[var(--muted)]"}`}
              >
                {sms.status === "approved" ? "✓" : "Approve"}
              </button>
            </div>
          </div>
          <textarea
            value={sms.copy.message}
            onChange={(e) => onUpdate(sms.id, { copy: { ...sms.copy, message: e.target.value } })}
            rows={2}
            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{sms.copy.message.length} characters</span>
            {sms.copy.link && <span className="text-[var(--accent)]">{sms.copy.link}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// RETENTION DELIVERABLES VIEW (Combined Email + SMS)
// ============================================
function RetentionDeliverablesView({
  emailDeliverables,
  smsDeliverables,
  onUpdateEmail,
  onUpdateSMS,
  copyToClipboard,
}: {
  emailDeliverables: EmailDeliverable[];
  smsDeliverables: SMSDeliverable[];
  onUpdateEmail: (id: string, updates: Partial<EmailDeliverable>) => void;
  onUpdateSMS: (id: string, updates: Partial<SMSDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  const [activeSection, setActiveSection] = useState<'email' | 'sms'>('email');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(emailDeliverables[0]?.id || null);
  const selectedEmailData = emailDeliverables.find((d) => d.id === selectedEmail);

  const hasNoContent = !emailDeliverables.length && !smsDeliverables.length;
  if (hasNoContent) {
    return <p className="text-[var(--muted)] text-center py-8">No retention deliverables generated yet.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-[var(--card-border)] pb-2">
        <button
          onClick={() => setActiveSection('email')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeSection === 'email'
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Emails ({emailDeliverables.length})
        </button>
        <button
          onClick={() => setActiveSection('sms')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeSection === 'sms'
              ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          SMS ({smsDeliverables.length})
        </button>
      </div>

      {/* Email Section */}
      {activeSection === 'email' && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-2">
            <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Email Sequence</h4>
            {emailDeliverables.map((email) => {
              const emailType = EMAIL_TYPES.find(t => t.id === email.type);
              return (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedEmail === email.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-[var(--foreground)]">{email.name}</span>
                    {email.status === "approved" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{emailType?.name || email.type}</p>
                </button>
              );
            })}
          </div>

          <div className="col-span-8">
            {selectedEmailData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[var(--foreground)]">{selectedEmailData.name}</h3>
                  <button
                    onClick={() =>
                      onUpdateEmail(selectedEmailData.id, {
                        status: selectedEmailData.status === "approved" ? "edited" : "approved",
                      })
                    }
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                      selectedEmailData.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                    }`}
                  >
                    {selectedEmailData.status === "approved" ? "✓ Approved" : "Mark Approved"}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[var(--muted)]">Subject Lines</label>
                    <button onClick={() => copyToClipboard(selectedEmailData.copy.subjectLines?.join('\n') || '')} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
                  </div>
                  <textarea
                    value={selectedEmailData.copy.subjectLines?.join('\n') || ''}
                    onChange={(e) => onUpdateEmail(selectedEmailData.id, { copy: { ...selectedEmailData.copy, subjectLines: e.target.value.split('\n') } })}
                    rows={3}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                    placeholder="One subject line per line"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Preheader</label>
                  <input
                    type="text"
                    value={selectedEmailData.copy.preheader}
                    onChange={(e) => onUpdateEmail(selectedEmailData.id, { copy: { ...selectedEmailData.copy, preheader: e.target.value } })}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Headline</label>
                  <input
                    type="text"
                    value={selectedEmailData.copy.headline}
                    onChange={(e) => onUpdateEmail(selectedEmailData.id, { copy: { ...selectedEmailData.copy, headline: e.target.value } })}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[var(--muted)]">Body</label>
                    <button onClick={() => copyToClipboard(selectedEmailData.copy.body)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
                  </div>
                  <textarea
                    value={selectedEmailData.copy.body}
                    onChange={(e) => onUpdateEmail(selectedEmailData.id, { copy: { ...selectedEmailData.copy, body: e.target.value } })}
                    rows={10}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">CTA Button</label>
                  <input
                    type="text"
                    value={selectedEmailData.copy.cta}
                    onChange={(e) => onUpdateEmail(selectedEmailData.id, { copy: { ...selectedEmailData.copy, cta: e.target.value } })}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[var(--muted)]">Select an email to view and edit</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SMS Section */}
      {activeSection === 'sms' && (
        <div className="space-y-4">
          {smsDeliverables.length === 0 ? (
            <p className="text-[var(--muted)] text-center py-8">No SMS deliverables generated yet.</p>
          ) : (
            smsDeliverables.map((sms) => {
              const smsType = SMS_TYPES.find(t => t.id === sms.type);
              return (
                <div key={sms.id} className="p-5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-base text-[var(--foreground)]">{sms.name}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{smsType?.name || sms.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyToClipboard(sms.copy.message)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
                      <button
                        onClick={() => onUpdateSMS(sms.id, { status: sms.status === "approved" ? "edited" : "approved" })}
                        className={`px-3 py-1.5 rounded text-xs cursor-pointer ${sms.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-[var(--card)] text-[var(--muted)]"}`}
                      >
                        {sms.status === "approved" ? "✓ Approved" : "Approve"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={sms.copy.message}
                    onChange={(e) => onUpdateSMS(sms.id, { copy: { ...sms.copy, message: e.target.value } })}
                    rows={4}
                    className="w-full p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                  <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
                    <span className={sms.copy.message.length > 160 ? 'text-yellow-400' : ''}>{sms.copy.message.length} characters {sms.copy.message.length > 160 && '(multi-segment)'}</span>
                    {sms.copy.link && <span className="text-[var(--accent)]">{sms.copy.link}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// PAID MEDIA DELIVERABLES VIEW (Strategy Summary)
// ============================================
function PaidMediaDeliverablesView({
  strategy,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategy: any;
}) {
  if (!strategy) {
    return <p className="text-[var(--muted)] text-center py-8">No paid media strategy defined yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Strategic Summary</h4>
        <p className="text-base text-[var(--foreground)] p-4 bg-[var(--input-bg)] rounded-lg">{strategy.strategicSummary || 'No summary provided'}</p>
      </div>

      {strategy.channelAllocations?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--muted)] mb-3">Channel Allocations</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {strategy.channelAllocations.map((channel: { channel: string; allocation: string; enabled: boolean }, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${channel.enabled ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--card-border)] bg-[var(--input-bg)]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-[var(--foreground)]">{channel.channel}</span>
                  {channel.enabled && <span className="text-xs text-[var(--accent)]">Active</span>}
                </div>
                <span className="text-sm text-[var(--muted)]">{channel.allocation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {strategy.campaignStructure && (
        <div>
          <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Campaign Structure</h4>
          <p className="text-base text-[var(--foreground)] p-4 bg-[var(--input-bg)] rounded-lg">{strategy.campaignStructure}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// ORGANIC SOCIAL DELIVERABLES VIEW
// ============================================
function OrganicDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: OrganicDeliverable[];
  onUpdate: (id: string, updates: Partial<OrganicDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(deliverables[0]?.id || null);
  const selectedPost = deliverables.find((d) => d.id === selected);

  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No organic social deliverables generated yet.</p>;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4 space-y-2">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Posts</h4>
        {deliverables.map((post) => (
          <button
            key={post.id}
            onClick={() => setSelected(post.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
              selected === post.id
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-[var(--foreground)] capitalize">{post.platform}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--card)] text-[var(--muted)]">{post.format}</span>
            </div>
            <p className="text-xs text-[var(--muted)] line-clamp-2">{post.copy.caption}</p>
          </button>
        ))}
      </div>

      <div className="col-span-8">
        {selectedPost ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[var(--foreground)] capitalize">{selectedPost.platform}</h3>
                <p className="text-sm text-[var(--muted)]">{selectedPost.format}</p>
              </div>
              <button
                onClick={() => onUpdate(selectedPost.id, { status: selectedPost.status === "approved" ? "edited" : "approved" })}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selectedPost.status === "approved"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                }`}
              >
                {selectedPost.status === "approved" ? "✓ Approved" : "Mark Approved"}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--muted)]">Caption</label>
                <button onClick={() => copyToClipboard(selectedPost.copy.caption)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
              </div>
              <textarea
                value={selectedPost.copy.caption}
                onChange={(e) => onUpdate(selectedPost.id, { copy: { ...selectedPost.copy, caption: e.target.value } })}
                rows={6}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {selectedPost.copy.hook && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Hook (Video Opening)</label>
                <input
                  type="text"
                  value={selectedPost.copy.hook}
                  onChange={(e) => onUpdate(selectedPost.id, { copy: { ...selectedPost.copy, hook: e.target.value } })}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            {selectedPost.copy.hashtags && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Hashtags</label>
                <input
                  type="text"
                  value={selectedPost.copy.hashtags.join(" ")}
                  onChange={(e) => onUpdate(selectedPost.id, { copy: { ...selectedPost.copy, hashtags: e.target.value.split(" ").filter(Boolean) } })}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Select a post to view and edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// INFLUENCER DELIVERABLES VIEW
// ============================================
function InfluencerDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: InfluencerDeliverable[];
  onUpdate: (id: string, updates: Partial<InfluencerDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No influencer deliverables generated yet.</p>;
  }

  const brief = deliverables[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-[var(--foreground)]">{brief.name}</h4>
        <button
          onClick={() => onUpdate(brief.id, { status: brief.status === "approved" ? "edited" : "approved" })}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
            brief.status === "approved"
              ? "bg-green-500/20 text-green-400"
              : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
          }`}
        >
          {brief.status === "approved" ? "✓ Approved" : "Mark Approved"}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[var(--muted)]">Creator Brief Document</label>
          <button onClick={() => copyToClipboard(brief.copy.briefDocument)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
        </div>
        <textarea
          value={brief.copy.briefDocument}
          onChange={(e) => onUpdate(brief.id, { copy: { ...brief.copy, briefDocument: e.target.value } })}
          rows={12}
          className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono"
        />
      </div>

      <div>
        <label className="text-xs text-[var(--muted)] mb-1 block">Brief Document</label>
        <textarea
          value={brief.copy.briefDocument || ''}
          onChange={(e) => onUpdate(brief.id, { copy: { ...brief.copy, briefDocument: e.target.value } })}
          rows={4}
          className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-[var(--muted)] mb-2 block">Talking Points</label>
        <div className="space-y-2">
          {(brief.copy.talkingPoints || []).map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[var(--muted)] text-sm mt-2">{i + 1}.</span>
              <input
                type="text"
                value={point}
                onChange={(e) => {
                  const updated = [...(brief.copy.talkingPoints || [])];
                  updated[i] = e.target.value;
                  onUpdate(brief.id, { copy: { ...brief.copy, talkingPoints: updated } });
                }}
                className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// RETAIL DELIVERABLES VIEW
// ============================================
function RetailDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: RetailDeliverable[];
  onUpdate: (id: string, updates: Partial<RetailDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No retail deliverables generated yet.</p>;
  }

  return (
    <div className="space-y-6">
      <h4 className="text-sm font-medium text-[var(--foreground)]">Retail Assets</h4>
      <div className="grid grid-cols-3 gap-4">
        {deliverables.map((asset) => (
          <div key={asset.id} className="p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-[var(--foreground)] capitalize">{asset.type.replace("-", " ")}</span>
              <button
                onClick={() => onUpdate(asset.id, { status: asset.status === "approved" ? "edited" : "approved" })}
                className={`px-2 py-1 rounded text-xs cursor-pointer ${asset.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-[var(--card)] text-[var(--muted)]"}`}
              >
                {asset.status === "approved" ? "✓" : "Approve"}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Headline</label>
                <input
                  type="text"
                  value={asset.copy.headline}
                  onChange={(e) => onUpdate(asset.id, { copy: { ...asset.copy, headline: e.target.value } })}
                  className="w-full p-2 bg-[var(--card)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Body</label>
                <textarea
                  value={asset.copy.body}
                  onChange={(e) => onUpdate(asset.id, { copy: { ...asset.copy, body: e.target.value } })}
                  rows={3}
                  className="w-full p-2 bg-[var(--card)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
              {asset.copy.callout && (
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Callout</label>
                  <input
                    type="text"
                    value={asset.copy.callout}
                    onChange={(e) => onUpdate(asset.id, { copy: { ...asset.copy, callout: e.target.value } })}
                    className="w-full p-2 bg-[var(--card)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PR DELIVERABLES VIEW
// ============================================
function PRDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: PRAffiliateDeliverable[];
  onUpdate: (id: string, updates: Partial<PRAffiliateDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(deliverables[0]?.id || null);
  const selectedPR = deliverables.find((d) => d.id === selected);

  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No PR deliverables generated yet.</p>;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-3 space-y-2">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">PR Assets</h4>
        {deliverables.map((pr) => (
          <button
            key={pr.id}
            onClick={() => setSelected(pr.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
              selected === pr.id
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
            }`}
          >
            <span className="font-medium text-sm text-[var(--foreground)] capitalize">{pr.type.replace(/-/g, " ")}</span>
            {pr.status === "approved" && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">✓</span>
            )}
          </button>
        ))}
      </div>

      <div className="col-span-9">
        {selectedPR ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[var(--foreground)] capitalize">{selectedPR.type.replace(/-/g, " ")}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => copyToClipboard(`${selectedPR.copy.title}\n\n${selectedPR.copy.body}`)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy All</button>
                <button
                  onClick={() => onUpdate(selectedPR.id, { status: selectedPR.status === "approved" ? "edited" : "approved" })}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    selectedPR.status === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                  }`}
                >
                  {selectedPR.status === "approved" ? "✓ Approved" : "Mark Approved"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Title</label>
              <input
                type="text"
                value={selectedPR.copy.title}
                onChange={(e) => onUpdate(selectedPR.id, { copy: { ...selectedPR.copy, title: e.target.value } })}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Body</label>
              <textarea
                value={selectedPR.copy.body}
                onChange={(e) => onUpdate(selectedPR.id, { copy: { ...selectedPR.copy, body: e.target.value } })}
                rows={15}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono"
              />
            </div>

            {selectedPR.copy.boilerplate && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Boilerplate</label>
                <textarea
                  value={selectedPR.copy.boilerplate}
                  onChange={(e) => onUpdate(selectedPR.id, { copy: { ...selectedPR.copy, boilerplate: e.target.value } })}
                  rows={4}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Select a PR asset to view and edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// WEB DELIVERABLES VIEW
// ============================================
function WebDeliverablesView({
  deliverables,
  onUpdate,
  copyToClipboard,
}: {
  deliverables: EcomDeliverable[];
  onUpdate: (id: string, updates: Partial<EcomDeliverable>) => void;
  copyToClipboard: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(deliverables[0]?.id || null);
  const selectedWeb = deliverables.find((d) => d.id === selected);

  if (!deliverables.length) {
    return <p className="text-[var(--muted)] text-center py-8">No web deliverables generated yet.</p>;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-3 space-y-2">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Web Pages</h4>
        {deliverables.map((page) => (
          <button
            key={page.id}
            onClick={() => setSelected(page.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
              selected === page.id
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
            }`}
          >
            <span className="font-medium text-sm text-[var(--foreground)] uppercase">{page.type}</span>
            {page.status === "approved" && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">✓</span>
            )}
          </button>
        ))}
      </div>

      <div className="col-span-9">
        {selectedWeb ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[var(--foreground)] uppercase">{selectedWeb.type}</h3>
              <button
                onClick={() => onUpdate(selectedWeb.id, { status: selectedWeb.status === "approved" ? "edited" : "approved" })}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selectedWeb.status === "approved"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[var(--input-bg)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                }`}
              >
                {selectedWeb.status === "approved" ? "✓ Approved" : "Mark Approved"}
              </button>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Headline</label>
              <input
                type="text"
                value={selectedWeb.copy.headline}
                onChange={(e) => onUpdate(selectedWeb.id, { copy: { ...selectedWeb.copy, headline: e.target.value } })}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {selectedWeb.copy.subhead && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Subhead</label>
                <input
                  type="text"
                  value={selectedWeb.copy.subhead}
                  onChange={(e) => onUpdate(selectedWeb.id, { copy: { ...selectedWeb.copy, subhead: e.target.value } })}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--muted)]">Body</label>
                <button onClick={() => copyToClipboard(selectedWeb.copy.body)} className="text-xs text-[var(--accent)] hover:underline cursor-pointer">Copy</button>
              </div>
              <textarea
                value={selectedWeb.copy.body}
                onChange={(e) => onUpdate(selectedWeb.id, { copy: { ...selectedWeb.copy, body: e.target.value } })}
                rows={4}
                className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {selectedWeb.copy.bullets && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-2 block">Benefit Bullets</label>
                <div className="space-y-2">
                  {selectedWeb.copy.bullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[var(--accent)]">•</span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => {
                          const updated = [...(selectedWeb.copy.bullets || [])];
                          updated[i] = e.target.value;
                          onUpdate(selectedWeb.id, { copy: { ...selectedWeb.copy, bullets: updated } });
                        }}
                        className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedWeb.copy.cta && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">CTA</label>
                <input
                  type="text"
                  value={selectedWeb.copy.cta}
                  onChange={(e) => onUpdate(selectedWeb.id, { copy: { ...selectedWeb.copy, cta: e.target.value } })}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Select a page to view and edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
