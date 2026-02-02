"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { BriefBoard, SavedBrief } from "@/types/brief";

type GroupBy = "angle" | "product" | "format" | "designer";

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [board, setBoard] = useState<BriefBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<SavedBrief | null>(null);
  const [filterDesigner, setFilterDesigner] = useState<string>("all");
  const [newDesigner, setNewDesigner] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("angle");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingCopy, setIsEditingCopy] = useState(false);
  const [editedCopy, setEditedCopy] = useState<string>("");
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [briefToDelete, setBriefToDelete] = useState<SavedBrief | null>(null);

  // Revision state
  const [isRevisingCopy, setIsRevisingCopy] = useState(false);
  const [reviseImage, setReviseImage] = useState<string | null>(null);
  const [reviseImageName, setReviseImageName] = useState<string>("");
  const [revisionContext, setRevisionContext] = useState("");
  const [isGeneratingRevision, setIsGeneratingRevision] = useState(false);
  const [revisionVariations, setRevisionVariations] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const reviseFileInputRef = useRef<HTMLInputElement>(null);

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
      const response = await fetch(`/api/boards/${id}`, { cache: "no-store" });
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

  const saveBoard = async (updatedBoard: BriefBoard) => {
    setIsSaving(true);
    try {
      await fetch(`/api/boards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBoard),
      });
    } catch (error) {
      console.error("Error saving board:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const assignDesigner = async (briefId: string, designer: string) => {
    if (!board) return;

    const updatedBriefs = board.briefs.map((brief) =>
      brief.id === briefId ? { ...brief, assignedTo: designer || undefined } : brief
    );

    const updatedBoard = { ...board, briefs: updatedBriefs };
    setBoard(updatedBoard);
    await saveBoard(updatedBoard);

    if (selectedBrief?.id === briefId) {
      setSelectedBrief({ ...selectedBrief, assignedTo: designer || undefined });
    }
  };

  const addNewDesigner = () => {
    if (!board || !newDesigner.trim()) return;
    if (!board.designers.includes(newDesigner.trim())) {
      const updatedBoard = {
        ...board,
        designers: [...board.designers, newDesigner.trim()],
      };
      setBoard(updatedBoard);
      saveBoard(updatedBoard);
    }
    setNewDesigner("");
  };

  const startEditingCopy = () => {
    if (selectedBrief) {
      const copyText = typeof selectedBrief.generatedCopy === "string"
        ? selectedBrief.generatedCopy
        : Object.entries(selectedBrief.generatedCopy).map(([zone, copy]) => `[${zone.toUpperCase()}]\n${copy}`).join("\n\n");
      setEditedCopy(copyText);
      setIsEditingCopy(true);
    }
  };

  const cancelEditingCopy = () => {
    setIsEditingCopy(false);
    setEditedCopy("");
  };

  const saveEditedCopy = async () => {
    if (!board || !selectedBrief) return;

    const updatedBriefs = board.briefs.map((brief) =>
      brief.id === selectedBrief.id
        ? { ...brief, generatedCopy: editedCopy }
        : brief
    );

    const updatedBoard = { ...board, briefs: updatedBriefs };
    setBoard(updatedBoard);
    setSelectedBrief({ ...selectedBrief, generatedCopy: editedCopy });
    setIsEditingCopy(false);
    setEditedCopy("");
    await saveBoard(updatedBoard);
  };

  const copyShareLink = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/boards/${id}/view`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId("share");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateName = async () => {
    if (!board || !editedName.trim() || editedName === board.name) {
      setIsEditingName(false);
      return;
    }

    const updatedBoard = { ...board, name: editedName.trim() };
    setBoard(updatedBoard);
    setIsEditingName(false);
    await saveBoard(updatedBoard);
  };

  const handleDeleteBrief = async () => {
    if (!board || !briefToDelete) return;

    const updatedBriefs = board.briefs.filter((b) => b.id !== briefToDelete.id);
    const updatedBoard = { ...board, briefs: updatedBriefs };
    setBoard(updatedBoard);
    setBriefToDelete(null);
    await saveBoard(updatedBoard);
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

  // Revision handlers
  const handleReviseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReviseImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReviseImage = () => {
    setReviseImage(null);
    setReviseImageName("");
    if (reviseFileInputRef.current) {
      reviseFileInputRef.current.value = "";
    }
  };

  const resetRevisionState = () => {
    setIsRevisingCopy(false);
    setReviseImage(null);
    setReviseImageName("");
    setRevisionContext("");
    setRevisionVariations(null);
    setSelectedVariation(null);
    if (reviseFileInputRef.current) {
      reviseFileInputRef.current.value = "";
    }
  };

  const handleGenerateRevision = async () => {
    if (!selectedBrief || !reviseImage) return;

    setIsGeneratingRevision(true);
    setRevisionVariations(null);
    setSelectedVariation(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: selectedBrief.persona.id,
          channel: "meta-ads",
          metaAdType: "revise",
          adFormatId: selectedBrief.format.id,
          productInfo: `${selectedBrief.product.name} - ${selectedBrief.product.description}`,
          angle: selectedBrief.angle,
          referenceImage: reviseImage,
          revisionContext: revisionContext || undefined,
        }),
      });

      const data = await response.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setRevisionVariations(data.copy);
      }
    } catch (error) {
      console.error("Error generating revision:", error);
      alert("Error generating revision. Please try again.");
    } finally {
      setIsGeneratingRevision(false);
    }
  };

  const parseVariations = (text: string) => {
    // Split by variation headers and extract content
    const parts = text.split(/###\s*Variation\s*(\d+)/i);
    const variations: Array<{ index: number; content: string }> = [];

    for (let i = 1; i < parts.length; i += 2) {
      const index = parseInt(parts[i], 10);
      const content = parts[i + 1]?.trim() || "";
      if (content) {
        variations.push({ index, content });
      }
    }

    return variations;
  };

  const applyRevision = async (variationContent: string) => {
    if (!board || !selectedBrief) return;

    const updatedBriefs = board.briefs.map((brief) =>
      brief.id === selectedBrief.id
        ? {
          ...brief,
          generatedCopy: variationContent,
          designedAdImage: reviseImage || undefined,
          designedAdImageName: reviseImageName || undefined,
          lastRevisedAt: new Date().toISOString(),
        }
        : brief
    );

    const updatedBoard = { ...board, briefs: updatedBriefs };
    setBoard(updatedBoard);
    setSelectedBrief({
      ...selectedBrief,
      generatedCopy: variationContent,
      designedAdImage: reviseImage || undefined,
      designedAdImageName: reviseImageName || undefined,
      lastRevisedAt: new Date().toISOString(),
    });

    resetRevisionState();
    await saveBoard(updatedBoard);
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

    const filteredBriefs =
      filterDesigner === "all"
        ? board.briefs
        : filterDesigner === "unassigned"
          ? board.briefs.filter((b) => !b.assignedTo)
          : board.briefs.filter((b) => b.assignedTo === filterDesigner);

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
        case "designer":
          key = brief.assignedTo || "Unassigned";
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
          <Link href="/boards" className="text-[var(--accent)] hover:underline">
            Back to boards
          </Link>
        </div>
      </div>
    );
  }

  const allDesigners = [...new Set([...board.designers, ...board.briefs.map((b) => b.assignedTo).filter(Boolean)])];
  const groups = getGroups();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/boards"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                    onBlur={handleUpdateName}
                    className="text-xl font-semibold text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--accent)] rounded px-2 py-0.5 w-full max-w-md focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-xl font-semibold text-[var(--foreground)] truncate">
                    {board.name}
                  </h1>
                  <button
                    onClick={() => {
                      setEditedName(board.name);
                      setIsEditingName(true);
                    }}
                    className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-[var(--muted)]">{board.persona.name} • {board.briefs.length} briefs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-sm text-[var(--muted)] flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--accent)] border-t-transparent" />
                Saving...
              </span>
            )}
            <button
              onClick={copyShareLink}
              className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
            >
              {copiedId === "share" ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Board
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Group by */}
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
                <option value="designer">Designer</option>
              </select>
            </div>

            {/* Filter by designer */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">Filter:</span>
              <select
                value={filterDesigner}
                onChange={(e) => setFilterDesigner(e.target.value)}
                className="bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-lg px-3 py-1.5"
              >
                <option value="all">All ({board.briefs.length})</option>
                <option value="unassigned">
                  Unassigned ({board.briefs.filter((b) => !b.assignedTo).length})
                </option>
                {allDesigners.map((designer) => (
                  <option key={designer} value={designer}>
                    {designer} ({board.briefs.filter((b) => b.assignedTo === designer).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add designer */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add designer..."
              value={newDesigner}
              onChange={(e) => setNewDesigner(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNewDesigner()}
              className="bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-lg px-3 py-1.5 w-40"
            />
            <button
              onClick={addNewDesigner}
              disabled={!newDesigner.trim()}
              className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
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
                <div className="flex items-center gap-2">
                  {briefs.filter(b => b.assignedTo).length > 0 && (
                    <span className="text-xs text-[var(--muted)]">
                      {briefs.filter(b => b.assignedTo).length}/{briefs.length} assigned
                    </span>
                  )}
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
                        <th className="px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide w-40">Assigned To</th>
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
                            {/* Assigned To */}
                            <td className="px-4 py-2">
                              <select
                                value={brief.assignedTo || ""}
                                onChange={(e) => assignDesigner(brief.id, e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-xs rounded px-2 py-1"
                              >
                                <option value="">Unassigned</option>
                                {allDesigners.map((designer) => (
                                  <option key={designer} value={designer}>
                                    {designer}
                                  </option>
                                ))}
                              </select>
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
                                <button
                                  onClick={() => setBriefToDelete(brief)}
                                  className="p-1.5 text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                  title="Delete brief"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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

          {groups.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[var(--muted)]">No briefs found</p>
            </div>
          )}
        </div>
      </main>

      {/* Brief Detail Modal - Ultra Compact for Screenshots */}
      {selectedBrief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedBrief(null)} />
          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 className="text-base font-medium text-[var(--foreground)]">
                {isRevisingCopy ? "Revise Copy with AI" : "Brief Details"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditingCopy && !isRevisingCopy && (
                  <>
                    <button
                      onClick={() => setIsRevisingCopy(true)}
                      className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Revise with AI
                    </button>
                    <button
                      onClick={startEditingCopy}
                      className="text-sm text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </>
                )}
                {isRevisingCopy && (
                  <button
                    onClick={resetRevisionState}
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedBrief(null);
                    setIsEditingCopy(false);
                    setEditedCopy("");
                    resetRevisionState();
                  }}
                  className="p-1 hover:bg-[var(--input-bg)] rounded transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {isRevisingCopy ? (
              /* Revision Mode UI */
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Upload Ad Image */}
                <div>
                  <label className="text-sm font-medium text-[var(--muted)] mb-2 block">
                    Upload Designed Ad
                  </label>
                  {reviseImage ? (
                    <div className="bg-[var(--input-bg)] rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={reviseImage}
                          alt="Ad to revise"
                          className="w-24 h-24 object-cover rounded cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all"
                          onClick={() => setEnlargedImage(reviseImage)}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-[var(--foreground)]">{reviseImageName}</p>
                          <button
                            onClick={removeReviseImage}
                            className="mt-2 text-xs text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="block bg-[var(--input-bg)] border border-dashed border-[var(--card-border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--muted-dim)] transition-colors">
                      <input
                        ref={reviseFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReviseImageUpload}
                        className="hidden"
                      />
                      <svg className="w-8 h-8 text-[var(--muted-dim)] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-[var(--foreground)]">Click to upload the designed ad</p>
                      <p className="text-xs text-[var(--muted-dim)] mt-1">AI will analyze and generate better copy</p>
                    </label>
                  )}
                </div>

                {/* Optional Context */}
                <div>
                  <label className="text-sm font-medium text-[var(--muted)] mb-2 block">
                    What needs improvement? (Optional)
                  </label>
                  <textarea
                    value={revisionContext}
                    onChange={(e) => setRevisionContext(e.target.value)}
                    placeholder="E.g., headline is too generic, doesn't speak to the target persona, copy is too long..."
                    rows={2}
                    className="w-full text-sm text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>

                {/* Brief Context Summary */}
                <div className="bg-[var(--input-bg)] rounded-lg p-3 text-xs text-[var(--muted)]">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-[var(--muted-dim)]">Format:</span> {selectedBrief.format.name}</div>
                    <div><span className="text-[var(--muted-dim)]">Product:</span> {selectedBrief.product.name}</div>
                    <div className="col-span-2"><span className="text-[var(--muted-dim)]">Persona:</span> {selectedBrief.persona.name}</div>
                    <div className="col-span-2"><span className="text-[var(--muted-dim)]">Angle:</span> {selectedBrief.angle}</div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateRevision}
                  disabled={!reviseImage || isGeneratingRevision}
                  className="w-full py-3 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isGeneratingRevision ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generating Revisions...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Revised Copy
                    </>
                  )}
                </button>

                {/* Variations Display */}
                {revisionVariations && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-[var(--foreground)]">Select a Variation to Apply</h4>
                    {parseVariations(revisionVariations).map((variation) => (
                      <div
                        key={variation.index}
                        onClick={() => setSelectedVariation(variation.index)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedVariation === variation.index
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--card-border)] hover:border-[var(--muted)]"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            Variation {variation.index}
                          </span>
                          {selectedVariation === variation.index && (
                            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="text-sm text-[var(--muted)] whitespace-pre-wrap line-clamp-6">
                          {variation.content.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
                        </div>
                      </div>
                    ))}

                    {selectedVariation && (
                      <button
                        onClick={() => {
                          const selected = parseVariations(revisionVariations).find(v => v.index === selectedVariation);
                          if (selected) applyRevision(selected.content);
                        }}
                        className="w-full py-3 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Apply Variation {selectedVariation}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Normal Brief Details UI */
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
                  {isEditingCopy ? (
                    <textarea
                      value={editedCopy}
                      onChange={(e) => setEditedCopy(e.target.value)}
                      className="w-full text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono"
                      rows={16}
                    />
                  ) : (
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
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            {!isRevisingCopy && (
              <div className="px-5 py-3 border-t border-[var(--card-border)] flex justify-between">
                {isEditingCopy ? (
                  <>
                    <button onClick={cancelEditingCopy} className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--input-bg)] cursor-pointer">Cancel</button>
                    <button onClick={saveEditedCopy} className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 cursor-pointer">Save</button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
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

      {/* Delete Confirmation Modal */}
      {briefToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setBriefToDelete(null)} />
          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-md overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Delete Brief?</h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Are you sure you want to delete this brief? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBriefToDelete(null)}
                className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--input-bg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBrief}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
