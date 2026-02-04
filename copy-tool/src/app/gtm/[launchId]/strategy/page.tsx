"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  GTMLaunch,
  ChannelId,
  ChannelStrategies,
  CHANNEL_CONFIG,
  RetentionStrategy,
  CreativeStrategy,
  PaidMediaStrategy,
  OrganicSocialStrategy,
  InfluencerStrategy,
  EcomStrategy,
  PRAffiliateStrategy,
  RetailStrategy,
  RetentionEmailItem,
  RetentionSMSItem,
  CreativeConcept,
  OrganicPostItem,
  EMAIL_TYPES,
  SMS_TYPES,
  HOOK_FORMULAS,
  CreativeResearch,
  PersonaInsight,
  PersonaId,
  PERSONA_CONFIG,
} from "@/types/gtm";

// Channel order for display
const CHANNEL_ORDER: ChannelId[] = [
  "retention",
  "creative",
  "paid-media",
  "organic-social",
  "influencer",
  "ecom",
  "pr-affiliate",
  "retail",
];

export default function StrategyPage() {
  const params = useParams();
  const router = useRouter();
  const launchId = params.launchId as string;

  const [launch, setLaunch] = useState<GTMLaunch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDeliverables, setIsGeneratingDeliverables] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Channel selection
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([
    "retention",
    "creative",
  ]);

  // Generated strategies
  const [strategies, setStrategies] = useState<ChannelStrategies>({});
  const [activeTab, setActiveTab] = useState<ChannelId>("retention");

  // Check if any strategy exists
  const hasAnyStrategy = Object.keys(strategies).length > 0;

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
        if (found.selectedChannels) {
          // Migrate old channel IDs to new ones
          const migratedChannels = migrateChannelIds(found.selectedChannels);
          setSelectedChannels(migratedChannels);
        }
        if (found.channelStrategies) {
          setStrategies(found.channelStrategies);
          // Set active tab to first channel with strategy
          const firstChannel = CHANNEL_ORDER.find(
            (ch) => found.channelStrategies[channelIdToKey(ch)]
          );
          if (firstChannel) setActiveTab(firstChannel);
        }
      }
    } catch (error) {
      console.error("Error fetching launch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert channel ID to strategy key
  const channelIdToKey = (channelId: ChannelId): keyof ChannelStrategies => {
    const map: Record<ChannelId, keyof ChannelStrategies> = {
      retention: "retention",
      creative: "creative",
      "paid-media": "paidMedia",
      "organic-social": "organicSocial",
      influencer: "influencer",
      ecom: "ecom",
      "pr-affiliate": "prAffiliate",
      retail: "retail",
    };
    return map[channelId];
  };

  const toggleChannel = (channelId: ChannelId) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const generateStrategies = async () => {
    if (selectedChannels.length === 0) {
      alert("Please select at least one channel");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/gtm/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId,
          channels: selectedChannels,
          pmc: launch?.pmc,
          creativeBrief: launch?.creativeBrief,
          tier: launch?.tier,
          productName: launch?.product || launch?.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate strategies");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const newStrategies = data.channelStrategies;
      setStrategies(newStrategies);

      // Set active tab to first generated channel
      const firstChannel = CHANNEL_ORDER.find(
        (ch) => newStrategies[channelIdToKey(ch)]
      );
      if (firstChannel) setActiveTab(firstChannel);

      // Save to launch
      await saveLaunch({
        selectedChannels,
        channelStrategies: newStrategies,
        status: "strategy-review",
      });
    } catch (error) {
      console.error("Error generating strategies:", error);
      alert("Failed to generate strategies. Please try again.");
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

  const approveAndContinue = async () => {
    if (!hasAnyStrategy) {
      alert("Please generate strategies first");
      return;
    }

    setIsGeneratingDeliverables(true);

    try {
      // Mark all strategies as approved
      const approvedStrategies = { ...strategies };
      Object.keys(approvedStrategies).forEach((key) => {
        const strategy = approvedStrategies[key as keyof ChannelStrategies];
        if (strategy) {
          (strategy as { status: string }).status = "approved";
        }
      });

      // Save the approved strategies first
      await saveLaunch({
        selectedChannels,
        channelStrategies: approvedStrategies,
        status: "generating",
      });

      // Generate deliverables immediately
      const deliverablesResponse = await fetch("/api/gtm/generate-deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId,
          tier: launch?.tier,
          pmc: launch?.pmc,
          creativeBrief: launch?.creativeBrief,
          channelStrategies: approvedStrategies,
          selectedChannels,
          productName: launch?.product || launch?.name,
        }),
      });

      if (!deliverablesResponse.ok) {
        throw new Error("Failed to generate deliverables");
      }

      const { channelDeliverables } = await deliverablesResponse.json();

      // Save the deliverables and mark as complete
      await saveLaunch({
        channelDeliverables,
        status: "complete",
      });

      // Navigate to deliverables page
      router.push(`/gtm/${launchId}/deliverables`);
    } catch (error) {
      console.error("Error generating deliverables:", error);
      alert("Error generating deliverables. Please try again.");
    } finally {
      setIsGeneratingDeliverables(false);
    }
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
          <Link
            href="/gtm"
            className="text-[var(--accent)] hover:underline mt-2 block cursor-pointer"
          >
            Back to launches
          </Link>
        </div>
      </div>
    );
  }

  if (!launch.pmc || !launch.creativeBrief) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl text-[var(--foreground)]">
            Brief not complete
          </h1>
          <p className="text-[var(--muted)] mt-2">
            Please complete the creative brief first.
          </p>
          <Link
            href={`/gtm/${launchId}/brief`}
            className="text-[var(--accent)] hover:underline mt-4 block cursor-pointer"
          >
            Go to Brief
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/gtm"
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                ← GTM Workflow
              </Link>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-[var(--foreground)] font-medium">
                {launch.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                {launch.tier.replace("tier-", "Tier ")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={`/gtm/${launchId}/brief`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs">
                  ✓
                </span>
                <span className="hidden sm:inline">Brief</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/strategy`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  2
                </span>
                <span className="hidden sm:inline">Strategy</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/deliverables`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  hasAnyStrategy
                    ? "bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)]"
                    : "bg-[var(--input-bg)] text-[var(--muted)] cursor-not-allowed opacity-50"
                }`}
                onClick={(e) => !hasAnyStrategy && e.preventDefault()}
              >
                <span className="w-5 h-5 rounded-full bg-[var(--card-border)] flex items-center justify-center text-xs">
                  3
                </span>
                <span className="hidden sm:inline">Deliverables</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
            Step 2: Integrated Marketing Plans
          </h1>
          <p className="text-[var(--muted)]">
            Select channels and generate strategic plans. Each channel gets a plan showing deliverables to be created. After approval, briefs will be generated.
          </p>
        </div>

        {/* Channel Selection */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Select Channels
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CHANNEL_ORDER.map((channelId) => {
              const config = CHANNEL_CONFIG[channelId];
              const isSelected = selectedChannels.includes(channelId);
              return (
                <button
                  key={channelId}
                  onClick={() => toggleChannel(channelId)}
                  className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-[var(--foreground)] text-sm">
                      {config.name}
                    </span>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected
                          ? "bg-[var(--accent)] border-[var(--accent)]"
                          : "border-[var(--card-border)]"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--muted)]">
              {selectedChannels.length} channel
              {selectedChannels.length !== 1 ? "s" : ""} selected
            </p>
            <button
              onClick={generateStrategies}
              disabled={isGenerating || selectedChannels.length === 0}
              className="btn-primary py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  {hasAnyStrategy ? "Regenerate Plans" : "Generate Plans"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Strategy Output */}
        {hasAnyStrategy && (
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg">
            {/* Tabs */}
            <div className="border-b border-[var(--card-border)] overflow-x-auto">
              <div className="flex">
                {CHANNEL_ORDER.filter(
                  (ch) => strategies[channelIdToKey(ch)]
                ).map((channelId) => {
                  const config = CHANNEL_CONFIG[channelId];
                  const isActive = activeTab === channelId;
                  return (
                    <button
                      key={channelId}
                      onClick={() => setActiveTab(channelId)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                        isActive
                          ? "border-[var(--accent)] text-[var(--accent)]"
                          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {config.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strategy Content */}
            <div className="p-6">
              {activeTab === "retention" && strategies.retention && (
                <RetentionStrategyView
                  strategy={strategies.retention}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, retention: updated })
                  }
                />
              )}
              {activeTab === "creative" && strategies.creative && (
                <CreativeStrategyView
                  strategy={strategies.creative}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, creative: updated })
                  }
                  launch={launch}
                />
              )}
              {activeTab === "paid-media" && strategies.paidMedia && (
                <PaidMediaStrategyView
                  strategy={strategies.paidMedia}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, paidMedia: updated })
                  }
                />
              )}
              {activeTab === "organic-social" && strategies.organicSocial && (
                <OrganicSocialStrategyView
                  strategy={strategies.organicSocial}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, organicSocial: updated })
                  }
                />
              )}
              {activeTab === "influencer" && strategies.influencer && (
                <InfluencerStrategyView
                  strategy={strategies.influencer}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, influencer: updated })
                  }
                />
              )}
              {activeTab === "ecom" && strategies.ecom && (
                <EcomStrategyView
                  strategy={strategies.ecom}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, ecom: updated })
                  }
                />
              )}
              {activeTab === "pr-affiliate" && strategies.prAffiliate && (
                <PRAffiliateStrategyView
                  strategy={strategies.prAffiliate}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, prAffiliate: updated })
                  }
                />
              )}
              {activeTab === "retail" && strategies.retail && (
                <RetailStrategyView
                  strategy={strategies.retail}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, retail: updated })
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        {hasAnyStrategy && (
          <div className="flex items-center justify-between mt-6">
            <Link
              href={`/gtm/${launchId}/brief`}
              className="py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer"
            >
              ← Back to Brief
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  saveLaunch({
                    selectedChannels,
                    channelStrategies: strategies,
                  })
                }
                disabled={isSaving}
                className="py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={approveAndContinue}
                disabled={isGeneratingDeliverables}
                className="btn-primary py-2.5 px-6 rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isGeneratingDeliverables ? (
                  <>
                    <span className="loading-shimmer w-4 h-4 rounded-full"></span>
                    Generating Copy Briefs...
                  </>
                ) : (
                  <>
                    Approve & Generate Copy
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// RETENTION STRATEGY VIEW (Calendar Timeline)
// ============================================
function RetentionStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: RetentionStrategy;
  onUpdate: (s: RetentionStrategy) => void;
}) {
  const addEmailItem = () => {
    const newItem: RetentionEmailItem = {
      id: `email-${Date.now()}`,
      type: "launch",
      name: "New Email",
      timing: "Launch Day",
      audience: "all",
      description: "",
    };
    onUpdate({ ...strategy, emailItems: [...strategy.emailItems, newItem] });
  };

  const addSmsItem = () => {
    const newItem: RetentionSMSItem = {
      id: `sms-${Date.now()}`,
      type: "launch",
      name: "New SMS",
      timing: "Launch Day",
      description: "",
    };
    onUpdate({ ...strategy, smsItems: [...strategy.smsItems, newItem] });
  };

  const updateEmailItem = (index: number, updates: Partial<RetentionEmailItem>) => {
    const newItems = [...strategy.emailItems];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ ...strategy, emailItems: newItems });
  };

  const updateSmsItem = (index: number, updates: Partial<RetentionSMSItem>) => {
    const newItems = [...strategy.smsItems];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ ...strategy, smsItems: newItems });
  };

  const deleteEmailItem = (index: number) => {
    const newItems = strategy.emailItems.filter((_, i) => i !== index);
    onUpdate({ ...strategy, emailItems: newItems });
  };

  const deleteSmsItem = (index: number) => {
    const newItems = strategy.smsItems.filter((_, i) => i !== index);
    onUpdate({ ...strategy, smsItems: newItems });
  };

  // Timing options for the calendar - more granular
  const timingOptions = [
    "D-14", "D-10", "D-7", "D-5", "D-3", "D-2", "D-1",
    "Launch Day",
    "D+1", "D+2", "D+3", "D+5", "D+7", "D+10", "D+14", "D+21"
  ];

  // Group items by timing for calendar view
  const timingOrder = timingOptions.reduce((acc, t, i) => ({ ...acc, [t]: i }), {} as Record<string, number>);
  const sortedEmails = [...strategy.emailItems].sort((a, b) =>
    (timingOrder[a.timing] ?? 99) - (timingOrder[b.timing] ?? 99)
  );
  const sortedSms = [...strategy.smsItems].sort((a, b) =>
    (timingOrder[a.timing] ?? 99) - (timingOrder[b.timing] ?? 99)
  );

  // Get email type info
  const getEmailTypeInfo = (typeId: string) => {
    return EMAIL_TYPES.find(t => t.id === typeId) || { id: typeId, name: typeId, description: '' };
  };

  return (
    <div className="space-y-8">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-semibold text-[var(--foreground)] mb-3">
          Retention Strategy Overview
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={4}
          placeholder="Describe the overall retention strategy approach, key messaging themes, and goals for this campaign..."
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical min-h-[120px]"
        />
      </div>

      {/* Email Calendar Timeline */}
      <div className="bg-[var(--input-bg)]/30 rounded-xl p-6 border border-[var(--card-border)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Email Schedule
            </h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              {strategy.emailItems.length} email{strategy.emailItems.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <button
            onClick={addEmailItem}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Email
          </button>
        </div>

        {/* Timeline View */}
        <div className="space-y-4">
          {sortedEmails.map((item, index) => {
            const typeInfo = getEmailTypeInfo(item.type);
            const originalIndex = strategy.emailItems.findIndex(e => e.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 hover:border-[var(--accent)]/50 transition-colors"
              >
                {/* Header row with timing badge and delete */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <select
                      value={item.timing}
                      onChange={(e) => updateEmailItem(originalIndex, { timing: e.target.value })}
                      className="px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-lg text-sm font-semibold cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      {timingOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={item.audience}
                      onChange={(e) => updateEmailItem(originalIndex, { audience: e.target.value as RetentionEmailItem["audience"] })}
                      className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="all">All Subscribers</option>
                      <option value="prospects">Prospects Only</option>
                      <option value="repeat">Repeat Customers</option>
                      <option value="vip">VIP / Roadies</option>
                    </select>
                  </div>
                  <button
                    onClick={() => deleteEmailItem(originalIndex)}
                    className="p-2 text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete email"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Name and Type */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                        Email Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateEmailItem(originalIndex, { name: e.target.value })}
                        placeholder="e.g., Launch Day Announcement"
                        className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                        Email Type
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => updateEmailItem(originalIndex, { type: e.target.value as RetentionEmailItem["type"] })}
                        className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                      >
                        {EMAIL_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-[var(--muted)] mt-2 italic">
                        {typeInfo.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Description */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                      Purpose / Notes
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateEmailItem(originalIndex, { description: e.target.value })}
                      placeholder="Describe the goal of this email, key messaging points, or special considerations..."
                      rows={5}
                      className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {strategy.emailItems.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No emails scheduled yet</p>
              <p className="text-xs mt-1">Click &quot;Add Email&quot; to start building your email calendar</p>
            </div>
          )}
        </div>
      </div>

      {/* SMS Calendar Timeline */}
      <div className="bg-[var(--input-bg)]/30 rounded-xl p-6 border border-[var(--card-border)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              SMS Schedule
            </h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              {strategy.smsItems.length} SMS message{strategy.smsItems.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <button
            onClick={addSmsItem}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add SMS
          </button>
        </div>

        <div className="space-y-4">
          {sortedSms.map((item, index) => {
            const originalIndex = strategy.smsItems.findIndex(s => s.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 hover:border-[var(--accent)]/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <select
                      value={item.timing}
                      onChange={(e) => updateSmsItem(originalIndex, { timing: e.target.value })}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg text-sm font-semibold cursor-pointer focus:outline-none focus:border-emerald-500"
                    >
                      {timingOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={item.type}
                      onChange={(e) => updateSmsItem(originalIndex, { type: e.target.value as RetentionSMSItem["type"] })}
                      className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      {SMS_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => deleteSmsItem(originalIndex)}
                    className="p-2 text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete SMS"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                      SMS Name
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateSmsItem(originalIndex, { name: e.target.value })}
                      placeholder="e.g., Launch Day SMS"
                      className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                      Purpose / Notes
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateSmsItem(originalIndex, { description: e.target.value })}
                      placeholder="Key message or hook for this SMS..."
                      className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {strategy.smsItems.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm">No SMS messages scheduled yet</p>
              <p className="text-xs mt-1">Click &quot;Add SMS&quot; to add text messages to your campaign</p>
            </div>
          )}
        </div>
      </div>

      {/* Other Retention Elements */}
      <div className="space-y-4">
        {/* Direct Mail - Full Width */}
        <div className={`p-6 border rounded-xl transition-all ${
          strategy.directMail?.enabled
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-[var(--card-border)] bg-[var(--card)]"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-lg font-semibold text-[var(--foreground)]">Direct Mail</span>
              <p className="text-sm text-[var(--muted)] mt-1">Physical mailer sent to customers</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.directMail?.enabled || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    directMail: { ...(strategy.directMail || { description: "" }), enabled: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
          {strategy.directMail?.enabled && (
            <textarea
              value={strategy.directMail.description}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  directMail: { ...(strategy.directMail || { enabled: true }), description: e.target.value },
                })
              }
              placeholder="Describe the direct mail piece - format, content, target audience, timing..."
              rows={4}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical min-h-[100px]"
            />
          )}
        </div>

        {/* Popup - Full Width */}
        <div className={`p-6 border rounded-xl transition-all ${
          strategy.popup?.enabled
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-[var(--card-border)] bg-[var(--card)]"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-lg font-semibold text-[var(--foreground)]">Pop-up</span>
              <p className="text-sm text-[var(--muted)] mt-1">Site popup for email/SMS capture or promo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.popup?.enabled || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    popup: { ...(strategy.popup || { description: "" }), enabled: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
          {strategy.popup?.enabled && (
            <textarea
              value={strategy.popup.description}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  popup: { ...(strategy.popup || { enabled: true }), description: e.target.value },
                })
              }
              placeholder="Describe the popup - offer, messaging, timing, targeting rules..."
              rows={4}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical min-h-[100px]"
            />
          )}
        </div>

        {/* Flows - Full Width */}
        <div className="p-6 border border-[var(--card-border)] rounded-xl bg-[var(--card)]">
          <div className="mb-4">
            <span className="text-lg font-semibold text-[var(--foreground)]">Email Flows</span>
            <p className="text-sm text-[var(--muted)] mt-1">Automated email sequences</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex items-start gap-4 cursor-pointer p-4 rounded-xl border transition-all ${
              strategy.flows?.dedicatedFlow
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
            }`}>
              <input
                type="checkbox"
                checked={strategy.flows?.dedicatedFlow || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    flows: { ...(strategy.flows || { universalFooter: false }), dedicatedFlow: e.target.checked },
                  })
                }
                className="w-6 h-6 mt-0.5 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-base font-medium text-[var(--foreground)]">Dedicated Flow</span>
                <p className="text-sm text-[var(--muted)] mt-1">Create a new automated flow specifically for this launch (welcome series, post-purchase, etc.)</p>
              </div>
            </label>
            <label className={`flex items-start gap-4 cursor-pointer p-4 rounded-xl border transition-all ${
              strategy.flows?.universalFooter
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
            }`}>
              <input
                type="checkbox"
                checked={strategy.flows?.universalFooter || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    flows: { ...(strategy.flows || { dedicatedFlow: false }), universalFooter: e.target.checked },
                  })
                }
                className="w-6 h-6 mt-0.5 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-base font-medium text-[var(--foreground)]">Universal Footer</span>
                <p className="text-sm text-[var(--muted)] mt-1">Add product mention to footer of all existing flows during campaign period</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATIVE STRATEGY VIEW (Concept List)
// ============================================
// ============================================
// CREATIVE STRATEGY VIEW (3-Phase Workflow)
// ============================================
function CreativeStrategyView({
  strategy,
  onUpdate,
  launch,
}: {
  strategy: CreativeStrategy;
  onUpdate: (s: CreativeStrategy) => void;
  launch: GTMLaunch;
}) {
  const [activePhase, setActivePhase] = useState<'research' | 'strategy' | 'concepts'>(
    strategy.currentPhase || 'research'
  );
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [conceptViewMode, setConceptViewMode] = useState<'byPersona' | 'all'>('byPersona');
  const [conceptSearchQuery, setConceptSearchQuery] = useState('');
  const [conceptFilterHook, setConceptFilterHook] = useState<string>('all');
  const [conceptFilterFormat, setConceptFilterFormat] = useState<string>('all');

  // Research refinement state
  const [showRefinementInput, setShowRefinementInput] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');

  // Phase configuration
  const phases = [
    { id: 'research' as const, name: 'Research & Insights', number: 1 },
    { id: 'strategy' as const, name: 'Strategy Review', number: 2 },
    { id: 'concepts' as const, name: 'Concepts', number: 3 },
  ];

  const getPhaseStatus = (phaseId: 'research' | 'strategy' | 'concepts') => {
    if (phaseId === 'research') {
      return strategy.research?.status === 'approved' ? 'complete' :
             strategy.research ? 'current' : 'pending';
    }
    if (phaseId === 'strategy') {
      return strategy.research?.status === 'approved' ?
             (strategy.currentPhase === 'concepts' || strategy.concepts.length > 0 ? 'complete' : 'current') : 'locked';
    }
    if (phaseId === 'concepts') {
      return strategy.currentPhase === 'concepts' || strategy.concepts.length > 0 ?
             'current' : 'locked';
    }
    return 'pending';
  };

  // Generate Research (Phase 1) - supports optional refinement notes
  const handleGenerateResearch = async (refinementNotes?: string) => {
    setIsGeneratingResearch(true);
    setShowRefinementInput(false);
    try {
      const response = await fetch("/api/gtm/generate-creative-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: launch.tier,
          pmc: launch.pmc,
          creativeBrief: launch.creativeBrief,
          productName: launch.product || launch.name,
          refinementNotes, // Optional: guidance for regenerating research
        }),
      });

      if (!response.ok) throw new Error("Failed to generate research");

      const { research } = await response.json();
      onUpdate({
        ...strategy,
        research,
        currentPhase: 'research',
      });
      setRefinementPrompt('');
    } catch (error) {
      console.error("Error generating research:", error);
      alert("Failed to generate research. Please try again.");
    } finally {
      setIsGeneratingResearch(false);
    }
  };

  // Approve Research (Phase 1 -> Phase 2)
  const handleApproveResearch = () => {
    if (!strategy.research) return;
    onUpdate({
      ...strategy,
      research: { ...strategy.research, status: 'approved' },
      currentPhase: 'strategy',
    });
    setActivePhase('strategy');
  };

  // Approve Strategy & Generate Concepts (Phase 2 -> Phase 3)
  const handleApproveStrategyAndGenerateConcepts = async () => {
    if (!strategy.research || strategy.research.status !== 'approved') return;

    setIsGeneratingConcepts(true);
    try {
      const response = await fetch("/api/gtm/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId: launch.id,
          channels: ['creative'],
          tier: launch.tier,
          pmc: launch.pmc,
          creativeBrief: launch.creativeBrief,
          productName: launch.product || launch.name,
          creativeResearch: strategy.research,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate concepts");

      const { channelStrategies } = await response.json();
      if (channelStrategies?.creative) {
        onUpdate({
          ...channelStrategies.creative,
          research: strategy.research,
          currentPhase: 'concepts',
        });
        setActivePhase('concepts');
      }
    } catch (error) {
      console.error("Error generating concepts:", error);
      alert("Failed to generate concepts. Please try again.");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  // Update persona insight
  const updatePersonaInsight = (personaId: PersonaId, updates: Partial<PersonaInsight>) => {
    if (!strategy.research) return;
    const newInsights = strategy.research.personaInsights.map(i =>
      i.personaId === personaId ? { ...i, ...updates } : i
    );
    onUpdate({
      ...strategy,
      research: { ...strategy.research, personaInsights: newInsights }
    });
  };

  // Concept management
  const addConcept = () => {
    const newConcept: CreativeConcept = {
      id: `concept-${Date.now()}`,
      name: "New Concept",
      hookFormula: "direct-benefit",
      angle: "",
      targetPersona: "general",
      personaName: "General Audience",
      formats: ["static", "video"],
    };
    onUpdate({ ...strategy, concepts: [...strategy.concepts, newConcept] });
  };

  const updateConcept = (id: string, updates: Partial<CreativeConcept>) => {
    const newConcepts = strategy.concepts.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    // Recalculate format mix
    const formatMix = { static: 0, video: 0, carousel: 0 };
    for (const c of newConcepts) {
      for (const f of c.formats) {
        formatMix[f]++;
      }
    }
    onUpdate({ ...strategy, concepts: newConcepts, formatMix });
  };

  const deleteConcept = (id: string) => {
    const newConcepts = strategy.concepts.filter(c => c.id !== id);
    const formatMix = { static: 0, video: 0, carousel: 0 };
    for (const c of newConcepts) {
      for (const f of c.formats) {
        formatMix[f]++;
      }
    }
    onUpdate({ ...strategy, concepts: newConcepts, formatMix });
  };

  // Filter concepts based on search and filters
  const filteredConcepts = strategy.concepts.filter(concept => {
    if (conceptSearchQuery &&
        !concept.name.toLowerCase().includes(conceptSearchQuery.toLowerCase()) &&
        !concept.angle.toLowerCase().includes(conceptSearchQuery.toLowerCase())) {
      return false;
    }
    if (conceptFilterHook !== 'all' && concept.hookFormula !== conceptFilterHook) {
      return false;
    }
    if (conceptFilterFormat !== 'all' && !concept.formats.includes(conceptFilterFormat as 'static' | 'video' | 'carousel')) {
      return false;
    }
    return true;
  });

  // Group filtered concepts by persona
  const conceptsByPersona = filteredConcepts.reduce((acc, concept) => {
    const key = concept.targetPersona || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(concept);
    return acc;
  }, {} as Record<string, CreativeConcept[]>);

  // Calculate phase completion percentages
  const getPhaseProgress = (phaseId: 'research' | 'strategy' | 'concepts') => {
    if (phaseId === 'research') {
      if (!strategy.research) return 0;
      if (strategy.research.status === 'approved') return 100;
      return 50; // Draft
    }
    if (phaseId === 'strategy') {
      if (!strategy.research?.status) return 0;
      if (strategy.research.status === 'approved') return 100;
      return 50;
    }
    if (phaseId === 'concepts') {
      if (strategy.concepts.length === 0) return 0;
      const totalRecommended = strategy.research?.personaInsights.reduce(
        (sum, p) => sum + p.recommendedConceptCount, 0
      ) || 1;
      return Math.min(100, Math.round((strategy.concepts.length / totalRecommended) * 100));
    }
    return 0;
  };

  // Overall progress
  const overallProgress = Math.round(
    (getPhaseProgress('research') + getPhaseProgress('strategy') + getPhaseProgress('concepts')) / 3
  );

  return (
    <div className="space-y-6">
      {/* Phase Navigation with Progress Indicator */}
      <div className="bg-[var(--input-bg)]/50 rounded-xl p-4">
        {/* Overall Progress Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[var(--muted)]">Creative Strategy Progress</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-green-500 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">{overallProgress}%</span>
          </div>
        </div>

        {/* Phase Steps with Connecting Lines */}
        <div className="relative flex items-stretch">
          {/* Connecting line background */}
          <div className="absolute top-5 left-[16.66%] right-[16.66%] h-0.5 bg-[var(--card-border)]" />

          {/* Connecting line progress */}
          <div
            className="absolute top-5 left-[16.66%] h-0.5 bg-[var(--accent)] transition-all duration-500"
            style={{
              width: `${
                getPhaseStatus('research') === 'complete' && getPhaseStatus('strategy') === 'complete'
                  ? '66.66%'
                  : getPhaseStatus('research') === 'complete'
                    ? '33.33%'
                    : '0%'
              }`,
            }}
          />

          {phases.map((phase, index) => {
            const status = getPhaseStatus(phase.id);
            const isActive = activePhase === phase.id;
            const isLocked = status === 'locked';
            const progress = getPhaseProgress(phase.id);

            return (
              <button
                key={phase.id}
                onClick={() => !isLocked && setActivePhase(phase.id)}
                disabled={isLocked}
                className={`flex-1 flex flex-col items-center gap-2 py-2 px-2 rounded-lg transition-all cursor-pointer relative z-10 ${
                  isActive
                    ? 'bg-[var(--accent)]/10'
                    : isLocked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-[var(--card)]'
                }`}
              >
                {/* Step Circle with Animation */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  status === 'complete'
                    ? 'bg-green-500 text-white scale-100'
                    : isActive
                      ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent)]/20'
                      : 'bg-[var(--card)] text-[var(--muted)] border-2 border-[var(--card-border)]'
                }`}>
                  {status === 'complete' ? (
                    <svg className="w-5 h-5 animate-[checkmark_0.3s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    phase.number
                  )}
                </div>

                {/* Phase Name & Progress */}
                <div className="text-center">
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
                  }`}>
                    {phase.name}
                  </span>
                  {status !== 'locked' && (
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {progress}%
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase 1: Research */}
      {activePhase === 'research' && (
        <div className="space-y-6">
          {!strategy.research ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Generate Creative Strategy Research
              </h3>
              <p className="text-[var(--muted)] mb-6 max-w-lg mx-auto">
                AI will analyze how {launch.product || launch.name} maps to each customer persona,
                generating messaging angles, hook opportunities, and strategic insights.
              </p>
              {!isGeneratingResearch ? (
                <button
                  onClick={() => handleGenerateResearch()}
                  className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 mx-auto cursor-pointer"
                >
                  Generate Research
                </button>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-3 text-[var(--accent)]">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-medium">Analyzing 6 customer personas...</span>
                  </div>
                  {/* Skeleton loading cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="border border-[var(--card-border)] rounded-xl p-4 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-16 h-6 bg-[var(--card-border)] rounded-full" />
                          <div className="flex-1">
                            <div className="w-32 h-4 bg-[var(--card-border)] rounded mb-1" />
                            <div className="w-20 h-3 bg-[var(--card-border)]/50 rounded" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="w-full h-3 bg-[var(--card-border)]/50 rounded" />
                          <div className="w-3/4 h-3 bg-[var(--card-border)]/50 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-[var(--muted)]">
                    This may take 30-60 seconds while AI analyzes product-persona fit...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Product Summary */}
              <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-6">
                <h3 className="font-semibold text-[var(--foreground)] mb-4">Product Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--muted)] block mb-1">Key Differentiator</span>
                    <p className="text-[var(--foreground)]">{strategy.research.productSummary.keyDifferentiator}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block mb-1">Primary Benefit</span>
                    <p className="text-[var(--foreground)]">{strategy.research.productSummary.primaryBenefit}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block mb-1">Category Position</span>
                    <p className="text-[var(--foreground)]">{strategy.research.productSummary.categoryPosition}</p>
                  </div>
                </div>
              </div>

              {/* Persona Insights */}
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-4">
                  Persona Insights ({strategy.research.personaInsights.length} personas analyzed)
                </h3>
                <div className="space-y-4">
                  {strategy.research.personaInsights.map((insight) => {
                    // Count concepts for this persona
                    const conceptsForPersona = strategy.concepts.filter(
                      c => c.targetPersona === insight.personaId
                    ).length;
                    return (
                      <PersonaInsightCard
                        key={insight.personaId}
                        insight={insight}
                        onUpdate={(updates) => updatePersonaInsight(insight.personaId as PersonaId, updates)}
                        currentConceptCount={conceptsForPersona}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Research Iteration Section */}
              {strategy.research.status !== 'approved' && (
                <div className="border border-[var(--card-border)] rounded-xl p-4 bg-[var(--input-bg)]/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--foreground)]">Want to refine the research?</h4>
                      <p className="text-sm text-[var(--muted)]">Regenerate with specific guidance</p>
                    </div>
                    <button
                      onClick={() => setShowRefinementInput(!showRefinementInput)}
                      className="px-4 py-2 text-sm border border-[var(--card-border)] rounded-lg hover:bg-[var(--card)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refine Research
                    </button>
                  </div>
                  {showRefinementInput && (
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="e.g., 'Focus more on anti-aging benefits' or 'Add more contrarian hooks'"
                        className="flex-1 px-4 py-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        onClick={() => handleGenerateResearch(refinementPrompt)}
                        disabled={isGeneratingResearch}
                        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {isGeneratingResearch ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Regenerating...
                          </>
                        ) : 'Regenerate'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Next Steps: Create Concepts Section */}
              {strategy.research && (
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">Ready to Create Concepts?</h3>
                      <p className="text-sm text-[var(--muted)]">
                        Create concepts based on persona insights above
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[var(--foreground)]">
                        {strategy.concepts.length}
                      </span>
                      <span className="text-sm text-[var(--muted)]">
                        {' '}/ {strategy.research.personaInsights.reduce((sum, p) => sum + p.recommendedConceptCount, 0)} recommended
                      </span>
                    </div>
                  </div>

                  {/* Persona quick-create buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {strategy.research.personaInsights
                      .filter(p => p.productFit.relevanceScore !== 'low')
                      .map((insight) => {
                        const conceptsForPersona = strategy.concepts.filter(
                          c => c.targetPersona === insight.personaId
                        ).length;
                        const isComplete = conceptsForPersona >= insight.recommendedConceptCount && insight.recommendedConceptCount > 0;

                        return (
                          <button
                            key={insight.personaId}
                            onClick={() => {
                              // Create a new concept for this persona
                              const newConcept: CreativeConcept = {
                                id: `concept-${Date.now()}`,
                                name: `${insight.personaName} Concept ${conceptsForPersona + 1}`,
                                angle: insight.messagingAngles[0]?.angle || '',
                                hookFormula: (insight.messagingAngles[0]?.hookFormula as CreativeConcept['hookFormula']) || 'problem-first',
                                formats: ['static'],
                                targetPersona: insight.personaId as PersonaId,
                                personaName: insight.personaName,
                                primaryHook: insight.hookOpportunities[0]?.hook || '',
                              };
                              const newConcepts = [...strategy.concepts, newConcept];
                              const formatMix = { static: 0, video: 0, carousel: 0 };
                              newConcepts.forEach(c => c.formats.forEach(f => formatMix[f]++));
                              onUpdate({ ...strategy, concepts: newConcepts, formatMix });
                            }}
                            disabled={isComplete}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              isComplete
                                ? 'border-green-500/30 bg-green-500/5 cursor-default'
                                : 'border-[var(--card-border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[var(--foreground)]">
                                {insight.personaName.replace('The ', '')}
                              </span>
                              {isComplete ? (
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span className="text-xs text-[var(--muted)]">
                                  {conceptsForPersona}/{insight.recommendedConceptCount}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Approve Button */}
              {strategy.research.status !== 'approved' && (
                <div className="flex justify-end pt-4 border-t border-[var(--card-border)]">
                  <button
                    onClick={handleApproveResearch}
                    className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    Approve Research & Continue
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Phase 2: Strategy Review */}
      {activePhase === 'strategy' && (
        <div className="space-y-6">
          {!strategy.research || strategy.research.status !== 'approved' ? (
            <div className="text-center py-12 text-[var(--muted)]">
              Please complete and approve Research phase first.
            </div>
          ) : (
            <>
              {/* Strategic Summary */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Strategic Summary
                </label>
                <textarea
                  value={strategy.strategicSummary}
                  onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
                  rows={4}
                  placeholder="Summarize the overall creative strategy based on the research insights..."
                  className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-vertical"
                />
              </div>

              {/* Visual Direction */}
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Visual Direction
                </label>
                <textarea
                  value={strategy.visualDirection}
                  onChange={(e) => onUpdate({ ...strategy, visualDirection: e.target.value })}
                  rows={3}
                  className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-vertical"
                />
              </div>

              {/* Concept Distribution */}
              <div className="bg-[var(--input-bg)]/50 rounded-xl p-6">
                <h3 className="font-semibold text-[var(--foreground)] mb-4">Concept Distribution by Persona</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {strategy.research.personaInsights.map((insight) => (
                    <div key={insight.personaId} className="text-center p-3 bg-[var(--card)] rounded-lg">
                      <p className="text-2xl font-bold text-[var(--foreground)]">
                        {insight.recommendedConceptCount}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
                        {insight.personaName}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[var(--muted)] mt-4 text-center">
                  Total: {strategy.research.recommendedTotalConcepts} concepts planned
                </p>
              </div>

              {/* Approve & Generate Button or Loading State */}
              {isGeneratingConcepts ? (
                <div className="space-y-6 pt-4 border-t border-[var(--card-border)]">
                  <div className="flex items-center justify-center gap-3 text-[var(--accent)]">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-medium">Generating {strategy.research?.recommendedTotalConcepts || 10} creative concepts...</span>
                  </div>
                  {/* Skeleton concept cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 animate-pulse">
                        <div className="w-40 h-5 bg-[var(--card-border)] rounded mb-3" />
                        <div className="w-full h-16 bg-[var(--card-border)]/50 rounded mb-3" />
                        <div className="flex gap-2">
                          <div className="w-16 h-6 bg-[var(--card-border)]/50 rounded" />
                          <div className="w-16 h-6 bg-[var(--card-border)]/50 rounded" />
                          <div className="w-16 h-6 bg-[var(--card-border)]/50 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-[var(--muted)]">
                    Creating persona-specific concepts with hooks and messaging angles...
                  </p>
                </div>
              ) : (
                <div className="flex justify-end pt-4 border-t border-[var(--card-border)]">
                  <button
                    onClick={handleApproveStrategyAndGenerateConcepts}
                    className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    Approve Strategy & Generate Concepts
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Phase 3: Concepts */}
      {activePhase === 'concepts' && (
        <div className="space-y-6">
          {strategy.concepts.length === 0 && !strategy.research ? (
            <div className="text-center py-12 text-[var(--muted)]">
              Please complete Research and Strategy phases first.
            </div>
          ) : (
            <>
              {/* Format Mix Summary with Progress Bars (OUTPUT) */}
              {(() => {
                const total = strategy.formatMix.static + strategy.formatMix.video + strategy.formatMix.carousel;
                const staticPct = total > 0 ? Math.round((strategy.formatMix.static / total) * 100) : 0;
                const videoPct = total > 0 ? Math.round((strategy.formatMix.video / total) * 100) : 0;
                const carouselPct = total > 0 ? Math.round((strategy.formatMix.carousel / total) * 100) : 0;

                // Determine if mix is balanced (each format between 20-50%)
                const isBalanced = total >= 3 && staticPct >= 15 && videoPct >= 15 && carouselPct >= 15;
                const isHeavyOnOne = total >= 3 && (staticPct > 60 || videoPct > 60 || carouselPct > 60);

                return (
                  <div className="bg-[var(--input-bg)]/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Format Mix
                      </span>
                      <div className="flex items-center gap-2">
                        {isBalanced && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Balanced
                          </span>
                        )}
                        {isHeavyOnOne && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Heavy on one format
                          </span>
                        )}
                        <span className="text-xs text-[var(--muted)]">{total} deliverables</span>
                      </div>
                    </div>

                    {/* Progress bar visualization */}
                    {total > 0 ? (
                      <div className="space-y-2">
                        {/* Stacked bar */}
                        <div className="flex h-3 rounded-full overflow-hidden bg-[var(--card-border)]">
                          {strategy.formatMix.static > 0 && (
                            <div
                              className="bg-blue-500 transition-all duration-300"
                              style={{ width: `${staticPct}%` }}
                              title={`Static: ${strategy.formatMix.static} (${staticPct}%)`}
                            />
                          )}
                          {strategy.formatMix.video > 0 && (
                            <div
                              className="bg-purple-500 transition-all duration-300"
                              style={{ width: `${videoPct}%` }}
                              title={`Video: ${strategy.formatMix.video} (${videoPct}%)`}
                            />
                          )}
                          {strategy.formatMix.carousel > 0 && (
                            <div
                              className="bg-green-500 transition-all duration-300"
                              style={{ width: `${carouselPct}%` }}
                              title={`Carousel: ${strategy.formatMix.carousel} (${carouselPct}%)`}
                            />
                          )}
                        </div>

                        {/* Legend with counts and percentages */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-blue-400 font-medium">{strategy.formatMix.static}</span>
                              <span className="text-[var(--muted)]">Static ({staticPct}%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-purple-400 font-medium">{strategy.formatMix.video}</span>
                              <span className="text-[var(--muted)]">Video ({videoPct}%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-green-400 font-medium">{strategy.formatMix.carousel}</span>
                              <span className="text-[var(--muted)]">Carousel ({carouselPct}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--muted)] text-center py-2">
                        No formats selected yet. Add formats to your concepts.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Concepts Section */}
              <div>
                {/* Header with view toggle and add button */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      Creative Concepts ({strategy.concepts.length})
                    </h3>
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg bg-[var(--input-bg)] p-0.5">
                      <button
                        onClick={() => setConceptViewMode('byPersona')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                          conceptViewMode === 'byPersona'
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        By Persona
                      </button>
                      <button
                        onClick={() => setConceptViewMode('all')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                          conceptViewMode === 'all'
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        All Concepts
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={addConcept}
                    className="px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent)]/90 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Concept
                  </button>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <input
                    type="text"
                    value={conceptSearchQuery}
                    onChange={(e) => setConceptSearchQuery(e.target.value)}
                    placeholder="Search concepts..."
                    className="flex-1 min-w-[200px] px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <select
                    value={conceptFilterHook}
                    onChange={(e) => setConceptFilterHook(e.target.value)}
                    className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)]"
                  >
                    <option value="all">All Hook Formulas</option>
                    <option value="problem-first">Problem-First</option>
                    <option value="identity-first">Identity-First</option>
                    <option value="contrarian">Contrarian</option>
                    <option value="direct-benefit">Direct Benefit</option>
                  </select>
                  <select
                    value={conceptFilterFormat}
                    onChange={(e) => setConceptFilterFormat(e.target.value)}
                    className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)]"
                  >
                    <option value="all">All Formats</option>
                    <option value="static">Has Static</option>
                    <option value="video">Has Video</option>
                    <option value="carousel">Has Carousel</option>
                  </select>
                </div>

                {/* Filter results count */}
                {(conceptSearchQuery || conceptFilterHook !== 'all' || conceptFilterFormat !== 'all') && (
                  <div className="text-sm text-[var(--muted)] mb-4">
                    Showing {
                      strategy.concepts.filter(c => {
                        if (conceptSearchQuery && !c.name.toLowerCase().includes(conceptSearchQuery.toLowerCase()) && !c.angle.toLowerCase().includes(conceptSearchQuery.toLowerCase())) return false;
                        if (conceptFilterHook !== 'all' && c.hookFormula !== conceptFilterHook) return false;
                        if (conceptFilterFormat !== 'all' && !c.formats.includes(conceptFilterFormat as 'static' | 'video' | 'carousel')) return false;
                        return true;
                      }).length
                    } of {strategy.concepts.length} concepts
                    <button
                      onClick={() => {
                        setConceptSearchQuery('');
                        setConceptFilterHook('all');
                        setConceptFilterFormat('all');
                      }}
                      className="ml-2 text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {/* Concepts Display - By Persona View */}
                {conceptViewMode === 'byPersona' && Object.entries(conceptsByPersona).map(([personaId, concepts]) => {
                  const personaName = personaId === 'general'
                    ? 'General Audience'
                    : strategy.research?.personaInsights.find(p => p.personaId === personaId)?.personaName || personaId;

                  return (
                    <div key={personaId} className="mb-6">
                      <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3 flex items-center gap-2">
                        {personaName}
                        <span className="text-xs font-normal px-2 py-0.5 bg-[var(--card-border)] rounded-full">
                          {concepts.length}
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {concepts.map((concept) => (
                          <ConceptCard
                            key={concept.id}
                            concept={concept}
                            onUpdate={(updates) => updateConcept(concept.id, updates)}
                            onDelete={() => deleteConcept(concept.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Concepts Display - All Concepts View (Flat List) */}
                {conceptViewMode === 'all' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredConcepts.map((concept) => {
                      const personaName = concept.targetPersona === 'general'
                        ? 'General Audience'
                        : strategy.research?.personaInsights.find(p => p.personaId === concept.targetPersona)?.personaName || concept.targetPersona;
                      return (
                        <ConceptCard
                          key={concept.id}
                          concept={concept}
                          onUpdate={(updates) => updateConcept(concept.id, updates)}
                          onDelete={() => deleteConcept(concept.id)}
                          showPersonaBadge
                          personaName={personaName}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Empty state for filtered results */}
                {filteredConcepts.length === 0 && strategy.concepts.length > 0 && (
                  <div className="text-center py-8 text-[var(--muted)]">
                    No concepts match your filters.
                    <button
                      onClick={() => {
                        setConceptSearchQuery('');
                        setConceptFilterHook('all');
                        setConceptFilterFormat('all');
                      }}
                      className="ml-2 text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// PERSONA INSIGHT CARD (Enhanced with Animation, Progress)
// ============================================
function PersonaInsightCard({
  insight,
  onUpdate,
  currentConceptCount = 0,
}: {
  insight: PersonaInsight;
  onUpdate: (updates: Partial<PersonaInsight>) => void;
  currentConceptCount?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const relevanceColors = {
    high: 'bg-green-500/10 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    low: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  };

  const relevanceIcons = {
    high: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    medium: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    low: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  // Progress calculation
  const progressPct = insight.recommendedConceptCount > 0
    ? Math.min(100, Math.round((currentConceptCount / insight.recommendedConceptCount) * 100))
    : 0;
  const isComplete = currentConceptCount >= insight.recommendedConceptCount && insight.recommendedConceptCount > 0;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${
      isExpanded
        ? 'border-[var(--accent)]/50 shadow-lg shadow-[var(--accent)]/5'
        : 'border-[var(--card-border)]'
    }`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
          isExpanded ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--input-bg)]/50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${relevanceColors[insight.productFit.relevanceScore]}`}>
            {relevanceIcons[insight.productFit.relevanceScore]}
            {insight.productFit.relevanceScore.toUpperCase()}
          </span>
          <div>
            <h4 className="font-semibold text-[var(--foreground)]">{insight.personaName}</h4>
            <p className="text-sm text-[var(--muted)]">{insight.customerBasePercentage}% of customers</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Concept Progress */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-medium ${isComplete ? 'text-green-400' : 'text-[var(--foreground)]'}`}>
                  {currentConceptCount}/{insight.recommendedConceptCount}
                </span>
                {isComplete && (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {/* Mini progress bar */}
              <div className="w-20 h-1 bg-[var(--card-border)] rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete ? 'bg-green-500' : 'bg-[var(--accent)]'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-[var(--muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content with smooth animation */}
      <div
        className={`border-t border-[var(--card-border)] overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 space-y-4 bg-[var(--input-bg)]/30">
          {/* Progress Status */}
          {isComplete && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-400 font-medium">
                Target reached! {currentConceptCount} concept{currentConceptCount !== 1 ? 's' : ''} created
              </span>
            </div>
          )}

          {/* Jobs To Be Done */}
          <div>
            <h5 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
              Jobs This Product Solves
            </h5>
            <ul className="space-y-1">
              {insight.productFit.primaryJobsToBeDone.map((job, i) => (
                <li key={i} className="text-sm text-[var(--foreground)] flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span> {job}
                </li>
              ))}
            </ul>
          </div>

          {/* Messaging Angles */}
          <div>
            <h5 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
              Messaging Angles
            </h5>
            <div className="space-y-2">
              {insight.messagingAngles.map((angle, i) => {
                const hookFormulaColors: Record<string, string> = {
                  'problem-first': 'bg-red-500/10 text-red-400',
                  'identity-first': 'bg-blue-500/10 text-blue-400',
                  'contrarian': 'bg-purple-500/10 text-purple-400',
                  'direct-benefit': 'bg-green-500/10 text-green-400',
                };
                return (
                  <div key={i} className="p-3 bg-[var(--card)] rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-[var(--foreground)] font-medium">{angle.angle}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${hookFormulaColors[angle.hookFormula] || 'bg-[var(--input-bg)] text-[var(--muted)]'}`}>
                        {angle.hookFormula}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">{angle.whyItWorks}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hook Opportunities */}
          <div>
            <h5 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
              Hook Opportunities
            </h5>
            <div className="space-y-2">
              {insight.hookOpportunities.map((hook, i) => (
                <div key={i} className="p-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg">
                  <p className="text-sm text-[var(--foreground)] font-medium">"{hook.hook}"</p>
                  {hook.voiceOfCustomerSource && (
                    <p className="text-xs text-[var(--muted)] mt-1 italic">
                      Inspired by: {hook.voiceOfCustomerSource}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Objections */}
          {insight.objections.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                Objections to Address
              </h5>
              <ul className="space-y-1">
                {insight.objections.map((objection, i) => (
                  <li key={i} className="text-sm text-[var(--foreground)]">• {objection}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Concept Count Editor */}
          <div className="pt-3 border-t border-[var(--card-border)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Recommended concepts:</span>
              <input
                type="number"
                min={0}
                max={10}
                value={insight.recommendedConceptCount}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdate({ recommendedConceptCount: parseInt(e.target.value) || 0 });
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-16 p-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] text-center"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONCEPT CARD (Full Name, Clear Formats, Icons, Copy)
// ============================================
function ConceptCard({
  concept,
  onUpdate,
  onDelete,
  showPersonaBadge = false,
  personaName,
}: {
  concept: CreativeConcept;
  onUpdate: (updates: Partial<CreativeConcept>) => void;
  onDelete: () => void;
  showPersonaBadge?: boolean;
  personaName?: string;
}) {
  const [copied, setCopied] = useState(false);

  // Hook formula colors
  const hookFormulaColors: Record<string, string> = {
    'problem-first': 'bg-red-500/10 text-red-400 border-red-500/20',
    'identity-first': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'contrarian': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'direct-benefit': 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  // Format icons
  const formatIcons: Record<string, React.ReactNode> = {
    static: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    video: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    carousel: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  };

  // Copy concept brief to clipboard
  const copyToClipboard = async () => {
    const brief = `CONCEPT: ${concept.name}
${personaName ? `TARGET: ${personaName}` : ''}
HOOK FORMULA: ${HOOK_FORMULAS.find(h => h.id === concept.hookFormula)?.name || concept.hookFormula}
FORMATS: ${concept.formats.join(', ')}
${concept.primaryHook ? `\nHOOK: "${concept.primaryHook}"` : ''}
${concept.angle ? `\nANGLE: ${concept.angle}` : ''}`;

    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 hover:border-[var(--accent)]/50 transition-colors group">
      {/* Persona badge (shown in "All Concepts" view) */}
      {showPersonaBadge && personaName && (
        <div className="mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            {personaName}
          </span>
        </div>
      )}

      {/* Header with full name and action buttons */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <input
          type="text"
          value={concept.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none text-base w-full"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              copied
                ? 'text-green-400 bg-green-400/10'
                : 'text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 opacity-0 group-hover:opacity-100'
            }`}
            title="Copy concept brief"
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
          {/* Delete button */}
          <button
            onClick={onDelete}
            className="p-1.5 text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hook (if available) */}
      {concept.primaryHook && (
        <div className="mb-3 p-2 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg">
          <p className="text-sm text-[var(--foreground)] italic">"{concept.primaryHook}"</p>
        </div>
      )}

      {/* Hook Formula Badge */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${hookFormulaColors[concept.hookFormula] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
          {HOOK_FORMULAS.find(h => h.id === concept.hookFormula)?.name || concept.hookFormula}
        </span>

        {/* Format buttons with icons */}
        <div className="flex gap-1">
          {(['static', 'video', 'carousel'] as const).map((format) => (
            <button
              key={format}
              onClick={() => {
                const newFormats = concept.formats.includes(format)
                  ? concept.formats.filter(f => f !== format)
                  : [...concept.formats, format];
                onUpdate({ formats: newFormats });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                concept.formats.includes(format)
                  ? format === 'static' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    format === 'video' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[var(--input-bg)] text-[var(--muted)] border border-transparent hover:border-[var(--card-border)]'
              }`}
              title={format.charAt(0).toUpperCase() + format.slice(1)}
            >
              {formatIcons[format]}
              <span className="capitalize">{format}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Angle */}
      <textarea
        value={concept.angle}
        onChange={(e) => onUpdate({ angle: e.target.value })}
        placeholder="Describe the creative angle..."
        rows={2}
        className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] resize-vertical focus:outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}

// ============================================
// PAID MEDIA STRATEGY VIEW (Channel Cards)
// ============================================
function PaidMediaStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: PaidMediaStrategy;
  onUpdate: (s: PaidMediaStrategy) => void;
}) {
  const updateChannel = (index: number, updates: Partial<PaidMediaStrategy["channels"][0]>) => {
    const newChannels = [...strategy.channels];
    newChannels[index] = { ...newChannels[index], ...updates };
    onUpdate({ ...strategy, channels: newChannels });
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Campaign Type */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Campaign Type
        </label>
        <select
          value={strategy.campaignType}
          onChange={(e) => onUpdate({ ...strategy, campaignType: e.target.value as PaidMediaStrategy["campaignType"] })}
          className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)]"
        >
          <option value="net-new">Net New Purchase Campaign</option>
          <option value="bau-adsets">BAU Campaign Ad Sets</option>
          <option value="creative-testing">Creative Testing</option>
          <option value="none">No Paid Media</option>
        </select>
      </div>

      {/* Channel Cards */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          Channel Allocation
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {strategy.channels.map((channel, index) => (
            <div
              key={channel.id}
              className={`p-4 border rounded-lg transition-all ${
                channel.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)] opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--foreground)] capitalize">{channel.name}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={(e) => updateChannel(index, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                </label>
              </div>
              {channel.enabled && (
                <>
                  <div className="mb-2">
                    <label className="block text-xs text-[var(--muted)] mb-1">Budget %</label>
                    <input
                      type="number"
                      value={channel.budgetPercent || 0}
                      onChange={(e) => updateChannel(index, { budgetPercent: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Notes</label>
                    <input
                      type="text"
                      value={channel.notes || ""}
                      onChange={(e) => updateChannel(index, { notes: e.target.value })}
                      className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-xs text-[var(--foreground)]"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Key Metrics
        </label>
        <div className="flex flex-wrap gap-2">
          {strategy.keyMetrics.map((metric, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-[var(--input-bg)] rounded-full text-sm text-[var(--foreground)]"
            >
              {metric}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ORGANIC SOCIAL STRATEGY VIEW (Calendar)
// ============================================
function OrganicSocialStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: OrganicSocialStrategy;
  onUpdate: (s: OrganicSocialStrategy) => void;
}) {
  const timingOptions = ["D-7", "D-5", "D-3", "D-1", "Launch Day", "D+1", "D+3", "D+5", "D+7", "D+10", "D+14"];

  const addPost = (platform: "instagram" | "tiktok" | "youtube") => {
    const newPost: OrganicPostItem = {
      id: `${platform}-${Date.now()}`,
      format: platform === "youtube" ? "short" : "reel",
      timing: "Launch Day",
      concept: "",
    };
    const key = `${platform}Posts` as keyof OrganicSocialStrategy;
    const currentPosts = (strategy[key] as OrganicPostItem[]) || [];
    onUpdate({ ...strategy, [key]: [...currentPosts, newPost] });
  };

  const updatePost = (platform: "instagram" | "tiktok" | "youtube", index: number, updates: Partial<OrganicPostItem>) => {
    const key = `${platform}Posts` as keyof OrganicSocialStrategy;
    const currentPosts = [...((strategy[key] as OrganicPostItem[]) || [])];
    currentPosts[index] = { ...currentPosts[index], ...updates };
    onUpdate({ ...strategy, [key]: currentPosts });
  };

  const deletePost = (platform: "instagram" | "tiktok" | "youtube", index: number) => {
    const key = `${platform}Posts` as keyof OrganicSocialStrategy;
    const currentPosts = ((strategy[key] as OrganicPostItem[]) || []).filter((_, i) => i !== index);
    onUpdate({ ...strategy, [key]: currentPosts });
  };

  const renderPostSection = (platform: "instagram" | "tiktok" | "youtube", posts: OrganicPostItem[], formatOptions: string[]) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-[var(--foreground)] capitalize">
          {platform} ({posts.length} posts)
        </label>
        <button
          onClick={() => addPost(platform)}
          className="text-sm text-[var(--accent)] hover:underline cursor-pointer"
        >
          + Add Post
        </button>
      </div>
      <div className="space-y-2">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="p-3 border border-[var(--card-border)] rounded-lg bg-[var(--input-bg)]/50 flex gap-3 items-center"
          >
            <select
              value={post.timing}
              onChange={(e) => updatePost(platform, index, { timing: e.target.value })}
              className="p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] w-28"
            >
              {timingOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={post.format}
              onChange={(e) => updatePost(platform, index, { format: e.target.value as OrganicPostItem["format"] })}
              className="p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] w-24"
            >
              {formatOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              type="text"
              value={post.concept}
              onChange={(e) => updatePost(platform, index, { concept: e.target.value })}
              placeholder="Concept..."
              className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
            />
            <button
              onClick={() => deletePost(platform, index)}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Platform Posts */}
      {renderPostSection("instagram", strategy.instagramPosts || [], ["feed", "story", "reel"])}
      {renderPostSection("tiktok", strategy.tiktokPosts || [], ["reel"])}
      {renderPostSection("youtube", strategy.youtubePosts || [], ["short", "long-form"])}

      {/* Creator Content */}
      {strategy.creatorContent && (
        <div className="p-4 border border-[var(--card-border)] rounded-lg">
          <h4 className="font-medium text-[var(--foreground)] mb-3">Creator Content</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Outsourced Deliverables</label>
              <input
                type="number"
                value={strategy.creatorContent.deliverables}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    creatorContent: { ...strategy.creatorContent!, deliverables: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Collab Posts</label>
              <input
                type="number"
                value={strategy.creatorContent.collabPosts}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    creatorContent: { ...strategy.creatorContent!, collabPosts: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// INFLUENCER STRATEGY VIEW
// ============================================
function InfluencerStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: InfluencerStrategy;
  onUpdate: (s: InfluencerStrategy) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            ${(strategy.sponsoredBudget || 0).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--muted)]">Sponsored Budget</p>
        </div>
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            ${(strategy.paidContentBudget || 0).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--muted)]">Paid Content Budget</p>
        </div>
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {strategy.expectedAds || 0}
          </p>
          <p className="text-xs text-[var(--muted)]">Expected Ads</p>
        </div>
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {strategy.seedingCount.min}-{strategy.seedingCount.max}
          </p>
          <p className="text-xs text-[var(--muted)]">Seeding</p>
        </div>
      </div>

      {/* Creator Tiers */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Creator Tiers
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border border-[var(--card-border)] rounded-lg text-center">
            <input
              type="number"
              value={strategy.creatorTiers.micro}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  creatorTiers: { ...strategy.creatorTiers, micro: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full text-center text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[var(--muted)]">Micro</p>
          </div>
          <div className="p-4 border border-[var(--card-border)] rounded-lg text-center">
            <input
              type="number"
              value={strategy.creatorTiers.mid}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  creatorTiers: { ...strategy.creatorTiers, mid: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full text-center text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[var(--muted)]">Mid-Tier</p>
          </div>
          <div className="p-4 border border-[var(--card-border)] rounded-lg text-center">
            <input
              type="number"
              value={strategy.creatorTiers.macro}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  creatorTiers: { ...strategy.creatorTiers, macro: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full text-center text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[var(--muted)]">Macro</p>
          </div>
        </div>
      </div>

      {/* Content Types */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Content Types
        </label>
        <div className="flex flex-wrap gap-2">
          {strategy.contentTypes.map((type, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-sm"
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Brief Points */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Key Brief Points
        </label>
        <ul className="space-y-1">
          {strategy.briefPoints.map((point, i) => (
            <li key={i} className="text-sm text-[var(--foreground)]">
              • {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================
// ECOM STRATEGY VIEW (Checklist)
// ============================================
function EcomStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: EcomStrategy;
  onUpdate: (s: EcomStrategy) => void;
}) {
  const togglePlacement = (index: number) => {
    const newPlacements = [...strategy.placements];
    newPlacements[index] = { ...newPlacements[index], enabled: !newPlacements[index].enabled };
    onUpdate({ ...strategy, placements: newPlacements });
  };

  const updatePlacementNotes = (index: number, notes: string) => {
    const newPlacements = [...strategy.placements];
    newPlacements[index] = { ...newPlacements[index], notes };
    onUpdate({ ...strategy, placements: newPlacements });
  };

  const formatPlacementType = (type: string) => {
    return type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Placement Checklist */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          Site Placements
        </label>
        <div className="space-y-2">
          {strategy.placements.map((placement, index) => (
            <div
              key={placement.id}
              className={`p-3 border rounded-lg flex items-center gap-3 ${
                placement.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)]"
              }`}
            >
              <input
                type="checkbox"
                checked={placement.enabled}
                onChange={() => togglePlacement(index)}
                className="w-5 h-5 rounded border-[var(--card-border)] cursor-pointer"
              />
              <span className={`font-medium min-w-[180px] ${placement.enabled ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                {formatPlacementType(placement.type)}
              </span>
              {placement.enabled && (
                <input
                  type="text"
                  value={placement.notes || ""}
                  onChange={(e) => updatePlacementNotes(index, e.target.value)}
                  placeholder="Notes..."
                  className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Landing Pages */}
      {strategy.landingPages && (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
            Landing Pages
          </label>
          <div className="flex flex-wrap gap-3">
            {(["listicle", "trojanHorse", "custom"] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strategy.landingPages?.[type] || false}
                  onChange={(e) =>
                    onUpdate({
                      ...strategy,
                      landingPages: { ...strategy.landingPages!, [type]: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded border-[var(--card-border)]"
                />
                <span className="text-[var(--foreground)] capitalize">
                  {type === "trojanHorse" ? "Trojan Horse" : type}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PR & AFFILIATE STRATEGY VIEW
// ============================================
function PRAffiliateStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: PRAffiliateStrategy;
  onUpdate: (s: PRAffiliateStrategy) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* PR Section */}
      <div className="border-b border-[var(--card-border)] pb-6">
        <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">
          PR
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              PR Angle
            </label>
            <textarea
              value={strategy.prAngle}
              onChange={(e) => onUpdate({ ...strategy, prAngle: e.target.value })}
              rows={2}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Long Lead Features: {strategy.longLeadFeatures.count}
              </label>
              <div className="flex flex-wrap gap-2">
                {strategy.longLeadFeatures.targets.map((target, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[var(--input-bg)] rounded-full text-sm text-[var(--foreground)]"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Product Placements: {strategy.productPlacements.count}
              </label>
              <div className="flex flex-wrap gap-2">
                {strategy.productPlacements.targets.map((target, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[var(--input-bg)] rounded-full text-sm text-[var(--foreground)]"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.awards}
                onChange={(e) => onUpdate({ ...strategy, awards: e.target.checked })}
                className="rounded border-[var(--card-border)]"
              />
              <span className="text-sm text-[var(--foreground)]">Pursue Awards</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.earlyAccess}
                onChange={(e) => onUpdate({ ...strategy, earlyAccess: e.target.checked })}
                className="rounded border-[var(--card-border)]"
              />
              <span className="text-sm text-[var(--foreground)]">Early Access</span>
            </label>
          </div>
        </div>
      </div>

      {/* Affiliate Section */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">
          Affiliate
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Affiliate Approach
            </label>
            <textarea
              value={strategy.affiliateApproach}
              onChange={(e) => onUpdate({ ...strategy, affiliateApproach: e.target.value })}
              rows={2}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
            />
          </div>

          {strategy.commissionIncrease && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strategy.commissionIncrease.enabled}
                  onChange={(e) =>
                    onUpdate({
                      ...strategy,
                      commissionIncrease: { ...strategy.commissionIncrease!, enabled: e.target.checked },
                    })
                  }
                  className="rounded border-[var(--card-border)]"
                />
                <span className="text-sm text-[var(--foreground)]">Commission Increase</span>
              </label>
              {strategy.commissionIncrease.enabled && (
                <input
                  type="text"
                  value={strategy.commissionIncrease.duration || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...strategy,
                      commissionIncrease: { ...strategy.commissionIncrease!, duration: e.target.value },
                    })
                  }
                  placeholder="Duration (e.g., 2 weeks)"
                  className="p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// RETAIL STRATEGY VIEW (Checklist)
// ============================================
function RetailStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: RetailStrategy;
  onUpdate: (s: RetailStrategy) => void;
}) {
  const toggleActivation = (index: number) => {
    const newActivations = [...strategy.activations];
    newActivations[index] = { ...newActivations[index], enabled: !newActivations[index].enabled };
    onUpdate({ ...strategy, activations: newActivations });
  };

  const updateActivationNotes = (index: number, notes: string) => {
    const newActivations = [...strategy.activations];
    newActivations[index] = { ...newActivations[index], notes };
    onUpdate({ ...strategy, activations: newActivations });
  };

  const formatActivationType = (type: string) => {
    return type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Activation Checklist */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          Retail Activations
        </label>
        <div className="space-y-2">
          {strategy.activations.map((activation, index) => (
            <div
              key={activation.id}
              className={`p-3 border rounded-lg flex items-center gap-3 ${
                activation.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)]"
              }`}
            >
              <input
                type="checkbox"
                checked={activation.enabled}
                onChange={() => toggleActivation(index)}
                className="w-5 h-5 rounded border-[var(--card-border)] cursor-pointer"
              />
              <span className={`font-medium min-w-[180px] ${activation.enabled ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                {formatActivationType(activation.type)}
              </span>
              {activation.enabled && (
                <input
                  type="text"
                  value={activation.notes || ""}
                  onChange={(e) => updateActivationNotes(index, e.target.value)}
                  placeholder="Notes..."
                  className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
