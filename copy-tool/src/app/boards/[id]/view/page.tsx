"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BriefBoard, SavedBrief } from "@/types/brief";

type GroupBy = "angle" | "product" | "format";

export default function BoardViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const designerFilter = searchParams.get("designer");

  const [board, setBoard] = useState<BriefBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<SavedBrief | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("angle");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBoard();
  }, [id]);

  // Expand all groups by default when board loads
  useEffect(() => {
    if (board) {
      const groups = getGroups();
      setExpandedGroups(new Set(groups.map(g => g.key)));
    }
  }, [board, groupBy]);

  const loadBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBoard(data);
      }
    } catch (error) {
      console.error("Error loading board:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBriefText = (brief: SavedBrief) => {
    let text = `BRIEF: ${brief.product.name} - ${brief.format.name}\n\nAngle: ${brief.angle}\n\n`;
    if (typeof brief.generatedCopy === "string") {
      text += brief.generatedCopy;
    } else {
      const copyObj = brief.generatedCopy as { [zone: string]: string };
      text += brief.format.specs.copyPlacements.map(zone =>
        `[${zone.zone.toUpperCase()}]\n${copyObj[zone.zone] || "[No copy]"}`
      ).join("\n\n");
    }
    navigator.clipboard.writeText(text);
    setCopiedId(brief.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroups = () => {
    if (!board) return [];

    const filteredBriefs = designerFilter
      ? board.briefs.filter((b) => b.assignedTo === designerFilter)
      : board.briefs;

    const groupMap = new Map<string, SavedBrief[]>();

    filteredBriefs.forEach((brief) => {
      let key: string;
      switch (groupBy) {
        case "angle":
          key = brief.angle;
          break;
        case "product":
          key = brief.product.name;
          break;
        case "format":
          key = brief.format.name;
          break;
        default:
          key = brief.angle;
      }
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(brief);
    });

    return Array.from(groupMap.entries()).map(([key, briefs]) => ({ key, briefs }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Board not found</h1>
          <p className="text-[var(--muted)]">This board may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const filteredBriefs = designerFilter
    ? board.briefs.filter((b) => b.assignedTo === designerFilter)
    : board.briefs;

  const groups = getGroups();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-2">
            <span>Jones Road Beauty</span>
            <span>•</span>
            <span>Creative Briefs</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{board.name}</h1>
          <p className="text-[var(--muted)] mt-1">
            {designerFilter ? (
              <>Assigned to <span className="text-[var(--accent)] font-medium">{designerFilter}</span> • </>
            ) : null}
            {filteredBriefs.length} brief{filteredBriefs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted)]">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-lg px-3 py-1.5"
            >
              <option value="angle">Angle</option>
              <option value="product">Product</option>
              <option value="format">Format</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Persona Info Card */}
        <div className="mb-6 bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Persona</span>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mt-1">{board.persona.name}</h2>
          {board.persona.demographics && (
            <p className="text-sm text-[var(--muted)] mt-1">
              {typeof board.persona.demographics === 'string'
                ? board.persona.demographics
                : board.persona.demographics.profession || ''}
            </p>
          )}
        </div>

        {/* Briefs Table */}
        {filteredBriefs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--muted)]">
              {designerFilter
                ? `No briefs assigned to ${designerFilter} yet.`
                : "No briefs in this board."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(({ key, briefs }) => (
              <div key={key} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(key)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-[var(--input-bg)] hover:bg-[var(--card-border)]/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 text-[var(--muted)] transition-transform ${expandedGroups.has(key) ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium text-[var(--foreground)]">{key}</span>
                    <span className="text-sm text-[var(--muted)]">({briefs.length})</span>
                  </div>
                </button>

                {/* Group Content - Table */}
                {expandedGroups.has(key) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)] text-left">
                          <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide w-12"></th>
                          <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Product</th>
                          <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Format</th>
                          {groupBy !== "angle" && (
                            <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Angle</th>
                          )}
                          <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Copy Preview</th>
                          <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                        {briefs.map((brief) => {
                          const primaryCopy = typeof brief.generatedCopy === "string"
                            ? brief.generatedCopy.slice(0, 150)
                            : Object.values(brief.generatedCopy)[0] || "";
                          return (
                            <tr key={brief.id} className="hover:bg-[var(--input-bg)]/50">
                              {/* Thumbnail */}
                              <td className="px-4 py-2">
                                <div className="w-10 h-10 bg-[var(--input-bg)] rounded overflow-hidden flex-shrink-0">
                                  {brief.format.thumbnail ? (
                                    <img
                                      src={brief.format.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-[var(--muted-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </td>
                              {/* Product */}
                              <td className="px-4 py-2">
                                <span className="font-medium text-[var(--foreground)]">{brief.product.name}</span>
                              </td>
                              {/* Format */}
                              <td className="px-4 py-2 text-[var(--muted)]">{brief.format.name}</td>
                              {/* Angle (if not grouped by angle) */}
                              {groupBy !== "angle" && (
                                <td className="px-4 py-2">
                                  <span className="text-[var(--muted)] text-xs line-clamp-2">{brief.angle}</span>
                                </td>
                              )}
                              {/* Copy Preview */}
                              <td className="px-4 py-2">
                                <span className="text-[var(--muted)] text-xs line-clamp-2">{primaryCopy || "No copy"}</span>
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedBrief(brief)}
                                    className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)] rounded transition-colors cursor-pointer"
                                    title="View details"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => copyBriefText(brief)}
                                    className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)] rounded transition-colors cursor-pointer"
                                    title="Copy to clipboard"
                                  >
                                    {copiedId === brief.id ? (
                                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Brief Detail Modal - Ultra Compact for Screenshots */}
      {selectedBrief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedBrief(null)} />
          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 className="text-base font-medium text-[var(--foreground)]">Brief Details</h2>
              <button
                onClick={() => setSelectedBrief(null)}
                className="p-1 hover:bg-[var(--input-bg)] rounded transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Brief Info Row */}
              <div className="flex gap-4 items-start">
                {/* Reference Thumbnail */}
                <div
                  className={`w-24 h-24 bg-[var(--input-bg)] rounded-lg overflow-hidden flex-shrink-0 ${selectedBrief.format.thumbnail ? 'cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all' : ''}`}
                  onClick={() => selectedBrief.format.thumbnail && setEnlargedImage(selectedBrief.format.thumbnail)}
                  title={selectedBrief.format.thumbnail ? "Click to enlarge" : ""}
                >
                  {selectedBrief.format.thumbnail ? (
                    <img src={selectedBrief.format.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[var(--muted-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-[var(--muted)]">PERSONA:</span> <span className="text-[var(--foreground)]">{selectedBrief.persona.name}</span></div>
                  <div><span className="text-[var(--muted)]">PRODUCT:</span> <span className="text-[var(--foreground)]">{selectedBrief.product.name}</span></div>
                  <div className="col-span-2"><span className="text-[var(--muted)]">ANGLE:</span> <span className="text-[var(--foreground)]">{selectedBrief.angle}</span></div>
                  <div className="col-span-2"><span className="text-[var(--muted)]">FORMAT:</span> <span className="text-[var(--foreground)]">{selectedBrief.format.name}</span></div>
                </div>
              </div>

              {/* Generated Copy */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Generated Copy</h3>
                <div className="bg-[var(--input-bg)] rounded-lg p-4">
                  {(() => {
                    const copyText = typeof selectedBrief.generatedCopy === "string"
                      ? selectedBrief.generatedCopy
                      : Object.entries(selectedBrief.generatedCopy).map(([zone, copy]) => `[${zone.toUpperCase()}]\n${copy}`).join("\n\n");

                    if (!copyText) {
                      return <span className="text-[var(--muted-dim)] italic">No copy generated</span>;
                    }

                    const cleanText = (text: string) => text
                      .replace(/\*\*(.+?)\*\*/g, '$1')
                      .replace(/\*(.+?)\*/g, '$1')
                      .replace(/^#+\s*/gm, '')
                      .replace(/\*\*Copy:\*\*\s*/gi, '')
                      .replace(/^-\s+/gm, '• ');

                    return (
                      <div className="space-y-4">
                        {copyText.split(/(?=^#{2,3}\s|\n(?=[A-Z][A-Z-]+\n))/m).map((section, index) => {
                          const trimmed = section.trim();
                          if (!trimmed) return null;

                          const h2Match = trimmed.match(/^##\s+(.+?)(?:\n|$)/);
                          const h3Match = trimmed.match(/^###\s+(.+?)(?:\n|$)/);
                          const zoneLabelMatch = trimmed.match(/^([A-Z][A-Z0-9-]+)\n([\s\S]*)$/);

                          if (h2Match) {
                            const title = cleanText(h2Match[1]);
                            const content = trimmed.slice(h2Match[0].length).trim();
                            return (
                              <div key={index} className="mb-4">
                                <h2 className="text-base font-semibold text-[var(--accent)] mb-2 pb-1 border-b border-[var(--card-border)]">
                                  {title}
                                </h2>
                                {content && (
                                  <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                    {cleanText(content)}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (h3Match) {
                            const title = cleanText(h3Match[1]);
                            const content = trimmed.slice(h3Match[0].length).trim();
                            return (
                              <div key={index} className="mb-3">
                                <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
                                  {title}
                                </h3>
                                {content && (
                                  <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                    {cleanText(content)}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (zoneLabelMatch) {
                            const label = zoneLabelMatch[1];
                            const content = zoneLabelMatch[2].trim();
                            return (
                              <div key={index} className="mb-3">
                                <h3 className="text-xs font-medium text-[var(--accent)] uppercase tracking-wide mb-1">
                                  {label}
                                </h3>
                                {content && (
                                  <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                    {cleanText(content)}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={index} className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                              {cleanText(trimmed)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--card-border)] flex justify-between">
              <button
                onClick={() => copyBriefText(selectedBrief)}
                className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--input-bg)] cursor-pointer flex items-center gap-2"
              >
                {copiedId === selectedBrief.id ? (
                  <><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copy Brief</>
                )}
              </button>
              <button onClick={() => setSelectedBrief(null)} className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={enlargedImage}
            alt="Reference image"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
