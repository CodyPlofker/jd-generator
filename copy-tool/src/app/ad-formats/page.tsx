"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AdFormat, AdFormatSpecs, CopyPlacement } from "@/types/ad-format";
import NewFormatModal from "@/components/NewFormatModal";

const FORMAT_CATEGORIES = [
  { id: "all", name: "All" },
  { id: "before-after", name: "Before/After" },
  { id: "testimonial", name: "Testimonial" },
  { id: "product-shot", name: "Product Shot" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "ugc", name: "UGC" },
  { id: "comparison", name: "Comparison" },
  { id: "other", name: "Other" },
];

export default function AdFormatsPage() {
  const [formats, setFormats] = useState<AdFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<AdFormat | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFormat, setEditedFormat] = useState<AdFormat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewFormatModal, setShowNewFormatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFormats();
  }, []);

  const loadFormats = async () => {
    try {
      const response = await fetch("/api/ad-formats");
      const data = await response.json();
      setFormats(data);
    } catch (error) {
      console.error("Error loading formats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter formats by search and category
  const filteredFormats = formats.filter((format) => {
    const matchesSearch = searchQuery === "" ||
      format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      format.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || format.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFormatClick = (format: AdFormat) => {
    setSelectedFormat(format);
    setEditedFormat({ ...format, specs: { ...format.specs, copyPlacements: [...format.specs.copyPlacements] } });
    setIsEditing(false);
  };

  const handleCloseDetail = () => {
    setSelectedFormat(null);
    setEditedFormat(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedFormat) {
      setEditedFormat({ ...selectedFormat, specs: { ...selectedFormat.specs, copyPlacements: [...selectedFormat.specs.copyPlacements] } });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedFormat) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/ad-formats/${editedFormat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedFormat.name,
          description: editedFormat.description,
          specs: editedFormat.specs,
          category: editedFormat.category,
        }),
      });

      if (response.ok) {
        await loadFormats();
        setSelectedFormat(editedFormat);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving format:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFormat) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/ad-formats/${selectedFormat.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadFormats();
        handleCloseDetail();
      }
    } catch (error) {
      console.error("Error deleting format:", error);
      alert("Failed to delete format");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePlacement = (index: number, updates: Partial<CopyPlacement>) => {
    if (!editedFormat) return;
    const newPlacements = [...editedFormat.specs.copyPlacements];
    newPlacements[index] = { ...newPlacements[index], ...updates };
    setEditedFormat({
      ...editedFormat,
      specs: { ...editedFormat.specs, copyPlacements: newPlacements },
    });
  };

  const removePlacement = (index: number) => {
    if (!editedFormat) return;
    const newPlacements = editedFormat.specs.copyPlacements.filter((_, i) => i !== index);
    setEditedFormat({
      ...editedFormat,
      specs: { ...editedFormat.specs, copyPlacements: newPlacements },
    });
  };

  const addPlacement = () => {
    if (!editedFormat) return;
    setEditedFormat({
      ...editedFormat,
      specs: {
        ...editedFormat.specs,
        copyPlacements: [
          ...editedFormat.specs.copyPlacements,
          { zone: "new-zone", position: "center", style: "normal", maxChars: 50, required: false },
        ],
      },
    });
  };

  const handleAddSampleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFormat) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;

      try {
        const uploadResponse = await fetch("/api/ad-formats/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageData,
            formatId: selectedFormat.id,
            filename: `sample-${selectedFormat.sampleImages.length + 1}.jpg`,
          }),
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          await fetch(`/api/ad-formats/${selectedFormat.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sampleImages: [...selectedFormat.sampleImages, uploadResult.path],
            }),
          });
          await loadFormats();
          // Refresh selected format
          const updatedFormats = await fetch("/api/ad-formats").then(r => r.json());
          const updated = updatedFormats.find((f: AdFormat) => f.id === selectedFormat.id);
          if (updated) {
            setSelectedFormat(updated);
            setEditedFormat({ ...updated, specs: { ...updated.specs, copyPlacements: [...updated.specs.copyPlacements] } });
          }
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image");
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleNewFormatSave = async (data: {
    name: string;
    description: string;
    specs: AdFormatSpecs;
    image: string;
  }) => {
    try {
      // Create the format
      const response = await fetch("/api/ad-formats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          specs: data.specs,
        }),
      });

      if (!response.ok) throw new Error("Failed to create format");

      const newFormat = await response.json();

      // Upload the image as first sample
      if (data.image) {
        const uploadResponse = await fetch("/api/ad-formats/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: data.image,
            formatId: newFormat.id,
            filename: "sample-1.jpg",
          }),
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          // Update format with thumbnail and sample
          await fetch(`/api/ad-formats/${newFormat.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              thumbnail: uploadResult.path,
              sampleImages: [uploadResult.path],
            }),
          });
        }
      }

      // Refresh formats list
      await loadFormats();
      setShowNewFormatModal(false);
    } catch (error) {
      console.error("Error saving format:", error);
      alert("Failed to save format. Please try again.");
    }
  };

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
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Ad Format Library</h1>
          </div>
          <button
            onClick={() => setShowNewFormatModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Format
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search formats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              />
            </div>
            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {FORMAT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--input-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-[var(--card)] rounded-xl loading-shimmer" />
            ))}
          </div>
        ) : filteredFormats.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--muted-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">
              {formats.length === 0 ? "No formats yet" : "No matching formats"}
            </h2>
            <p className="text-[var(--muted)] mb-6">
              {formats.length === 0
                ? "Create your first ad format to get started"
                : "Try adjusting your search or category filter"}
            </p>
            {formats.length === 0 && (
              <button
                onClick={() => setShowNewFormatModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Format
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleFormatClick(format)}
                className="group text-left bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:border-[var(--muted-dim)] transition-colors cursor-pointer"
              >
                <div className="aspect-square bg-[var(--input-bg)] relative">
                  {format.thumbnail ? (
                    <img
                      src={format.thumbnail}
                      alt={format.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-[var(--muted-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  {format.category && (
                    <span className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
                      {FORMAT_CATEGORIES.find(c => c.id === format.category)?.name || format.category}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-[var(--foreground)] truncate">{format.name}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {format.specs.copyPlacements.length} zone{format.specs.copyPlacements.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedFormat && editedFormat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={handleCloseDetail} />

          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 className="text-lg font-medium text-[var(--foreground)]">
                {isEditing ? "Edit Format" : selectedFormat.name}
              </h2>
              <div className="flex items-center gap-2">
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="px-3 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseDetail}
                  className="p-1.5 hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="p-4 bg-red-500/10 border-b border-red-500/20">
                <p className="text-red-400 mb-3">Are you sure you want to delete this format? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Images */}
                <div>
                  <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                    Sample Images ({selectedFormat.sampleImages.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFormat.sampleImages.map((img, i) => (
                      <div key={i} className="aspect-square bg-[var(--input-bg)] rounded-lg overflow-hidden">
                        <img src={img} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <label className="aspect-square bg-[var(--input-bg)] rounded-lg border-2 border-dashed border-[var(--card-border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--muted-dim)] transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAddSampleImage}
                        className="hidden"
                      />
                      <svg className="w-8 h-8 text-[var(--muted-dim)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-[var(--muted-dim)]">Add image</span>
                    </label>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFormat.name}
                        onChange={(e) => setEditedFormat({ ...editedFormat, name: e.target.value })}
                        className="input-dark w-full p-2 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-[var(--foreground)]">{selectedFormat.name}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">Category</label>
                    {isEditing ? (
                      <select
                        value={editedFormat.category || ""}
                        onChange={(e) => setEditedFormat({ ...editedFormat, category: e.target.value || undefined })}
                        className="input-dark w-full p-2 rounded-lg text-sm cursor-pointer"
                      >
                        <option value="">No category</option>
                        {FORMAT_CATEGORIES.filter(c => c.id !== "all").map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[var(--foreground)]">
                        {selectedFormat.category
                          ? FORMAT_CATEGORIES.find(c => c.id === selectedFormat.category)?.name || selectedFormat.category
                          : "—"}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">Description</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFormat.description}
                        onChange={(e) => setEditedFormat({ ...editedFormat, description: e.target.value })}
                        className="input-dark w-full p-2 rounded-lg text-sm"
                        placeholder="Brief description"
                      />
                    ) : (
                      <p className="text-[var(--foreground)]">{selectedFormat.description || "—"}</p>
                    )}
                  </div>

                  {/* Copy Zones */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--muted)]">Copy Zones</label>
                      {isEditing && (
                        <button
                          onClick={addPlacement}
                          className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          + Add Zone
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(isEditing ? editedFormat : selectedFormat).specs.copyPlacements.map((placement, index) => (
                        <div
                          key={index}
                          className="bg-[var(--input-bg)] rounded-lg p-3 border border-[var(--input-border)]"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={placement.zone}
                                  onChange={(e) => updatePlacement(index, { zone: e.target.value })}
                                  placeholder="Zone name"
                                  className="input-dark flex-1 p-1.5 rounded text-xs"
                                />
                                <input
                                  type="text"
                                  value={placement.position}
                                  onChange={(e) => updatePlacement(index, { position: e.target.value })}
                                  placeholder="Position"
                                  className="input-dark flex-1 p-1.5 rounded text-xs"
                                />
                              </div>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={placement.style}
                                  onChange={(e) => updatePlacement(index, { style: e.target.value })}
                                  placeholder="Style"
                                  className="input-dark flex-1 p-1.5 rounded text-xs"
                                />
                                <label className="flex items-center gap-1 text-xs text-[var(--muted-dim)]">
                                  <input
                                    type="checkbox"
                                    checked={placement.required}
                                    onChange={(e) => updatePlacement(index, { required: e.target.checked })}
                                    className="rounded"
                                  />
                                  Req
                                </label>
                                <button
                                  onClick={() => removePlacement(index)}
                                  className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-[var(--foreground)]">{placement.zone}</p>
                                <p className="text-xs text-[var(--muted)]">{placement.position} • {placement.style}</p>
                              </div>
                              {placement.required && (
                                <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Style Notes */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">Style Notes</label>
                    {isEditing ? (
                      <textarea
                        value={editedFormat.specs.styleNotes}
                        onChange={(e) => setEditedFormat({
                          ...editedFormat,
                          specs: { ...editedFormat.specs, styleNotes: e.target.value }
                        })}
                        rows={2}
                        className="input-dark w-full p-2 rounded-lg text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm text-[var(--foreground)]">{selectedFormat.specs.styleNotes || "—"}</p>
                    )}
                  </div>

                  {/* Best For */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">Best For</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedFormat.specs.bestFor.join(", ")}
                        onChange={(e) => setEditedFormat({
                          ...editedFormat,
                          specs: { ...editedFormat.specs, bestFor: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }
                        })}
                        placeholder="e.g., skincare, product demos"
                        className="input-dark w-full p-2 rounded-lg text-sm"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedFormat.specs.bestFor.length > 0 ? (
                          selectedFormat.specs.bestFor.map((tag, i) => (
                            <span key={i} className="text-xs bg-[var(--input-bg)] text-[var(--muted)] px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[var(--muted)]">—</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Edit Mode) */}
            {isEditing && (
              <div className="p-4 border-t border-[var(--card-border)] flex justify-end gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Format Modal */}
      <NewFormatModal
        isOpen={showNewFormatModal}
        onClose={() => setShowNewFormatModal(false)}
        onSave={handleNewFormatSave}
      />
    </div>
  );
}
