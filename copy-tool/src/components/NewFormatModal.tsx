"use client";

import { useState, useRef } from "react";
import { AdFormatSpecs, CopyPlacement } from "@/types/ad-format";

interface NewFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    specs: AdFormatSpecs;
    image: string;
  }) => void;
  initialImage?: string;
}

type Step = "upload" | "analyzing" | "edit" | "saving";

export default function NewFormatModal({
  isOpen,
  onClose,
  onSave,
  initialImage,
}: NewFormatModalProps) {
  const [step, setStep] = useState<Step>(initialImage ? "analyzing" : "upload");
  const [image, setImage] = useState<string>(initialImage || "");
  const [formatName, setFormatName] = useState("");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState<AdFormatSpecs>({
    copyPlacements: [],
    styleNotes: "",
    bestFor: [],
  });
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze image when it changes
  const analyzeImage = async (imageData: string) => {
    setStep("analyzing");
    setError("");

    try {
      const response = await fetch("/api/ad-formats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const analysis = await response.json();

      if (!response.ok || analysis.error) {
        throw new Error(analysis.error || `Analysis failed with status ${response.status}`);
      }

      setFormatName(analysis.formatSuggestion || "");
      setSpecs({
        copyPlacements: analysis.copyPlacements || [],
        styleNotes: analysis.styleNotes || "",
        bestFor: analysis.bestFor || [],
      });
      setStep("edit");
    } catch (err) {
      console.error("Analysis error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to analyze image: ${errorMsg}. Please try again.`);
      setStep("upload");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        analyzeImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formatName.trim()) {
      setError("Please enter a format name");
      return;
    }

    setStep("saving");
    onSave({
      name: formatName,
      description,
      specs,
      image,
    });
  };

  const updatePlacement = (index: number, updates: Partial<CopyPlacement>) => {
    const newPlacements = [...specs.copyPlacements];
    newPlacements[index] = { ...newPlacements[index], ...updates };
    setSpecs({ ...specs, copyPlacements: newPlacements });
  };

  const removePlacement = (index: number) => {
    const newPlacements = specs.copyPlacements.filter((_, i) => i !== index);
    setSpecs({ ...specs, copyPlacements: newPlacements });
  };

  const addPlacement = () => {
    setSpecs({
      ...specs,
      copyPlacements: [
        ...specs.copyPlacements,
        {
          zone: "new-zone",
          position: "center",
          style: "normal",
          maxChars: 50,
          required: false,
        },
      ],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {step === "upload" && "Upload Ad Creative"}
            {step === "analyzing" && "Analyzing..."}
            {step === "edit" && "Edit Format Specs"}
            {step === "saving" && "Saving..."}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--input-bg)] rounded transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Upload Step */}
          {step === "upload" && (
            <label className="block border-2 border-dashed border-[var(--card-border)] rounded-xl p-12 text-center cursor-pointer hover:border-[var(--muted-dim)] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <svg className="w-12 h-12 mx-auto text-[var(--muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[var(--muted)] mb-2">Click to upload an ad creative</p>
              <p className="text-xs text-[var(--muted-dim)]">PNG, JPG, or WebP</p>
            </label>
          )}

          {/* Analyzing Step */}
          {step === "analyzing" && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent)] border-t-transparent mb-4" />
              <p className="text-[var(--muted)]">Analyzing ad format...</p>
              <p className="text-xs text-[var(--muted-dim)] mt-1">Identifying copy zones and specs</p>
            </div>
          )}

          {/* Edit Step */}
          {step === "edit" && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="flex gap-4">
                {image && (
                  <img
                    src={image}
                    alt="Ad preview"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Format Name *</label>
                    <input
                      type="text"
                      value={formatName}
                      onChange={(e) => setFormatName(e.target.value)}
                      placeholder="e.g., Before/After - 2 Panel"
                      className="input-dark w-full p-2 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Description</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this format"
                      className="input-dark w-full p-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Copy Placements */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-[var(--muted)] uppercase tracking-wide">
                    Copy Zones ({specs.copyPlacements.length})
                  </label>
                  <button
                    type="button"
                    onClick={addPlacement}
                    className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    + Add Zone
                  </button>
                </div>

                <div className="space-y-2">
                  {specs.copyPlacements.map((placement, index) => (
                    <div
                      key={index}
                      className="bg-[var(--input-bg)] rounded-lg p-3 border border-[var(--input-border)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-[var(--muted-dim)] mb-1">Zone</label>
                            <input
                              type="text"
                              value={placement.zone}
                              onChange={(e) => updatePlacement(index, { zone: e.target.value })}
                              className="input-dark w-full p-1.5 rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted-dim)] mb-1">Position</label>
                            <input
                              type="text"
                              value={placement.position}
                              onChange={(e) => updatePlacement(index, { position: e.target.value })}
                              className="input-dark w-full p-1.5 rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted-dim)] mb-1">Style</label>
                            <input
                              type="text"
                              value={placement.style}
                              onChange={(e) => updatePlacement(index, { style: e.target.value })}
                              className="input-dark w-full p-1.5 rounded text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
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
                            type="button"
                            onClick={() => removePlacement(index)}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Style Notes */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Style Notes</label>
                <textarea
                  value={specs.styleNotes}
                  onChange={(e) => setSpecs({ ...specs, styleNotes: e.target.value })}
                  placeholder="Overall style guidance for copy in this format"
                  rows={2}
                  className="input-dark w-full p-2 rounded-lg text-sm resize-none"
                />
              </div>

              {/* Best For */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Best For (comma-separated)</label>
                <input
                  type="text"
                  value={specs.bestFor.join(", ")}
                  onChange={(e) => setSpecs({ ...specs, bestFor: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g., skincare results, product demos"
                  className="input-dark w-full p-2 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Saving Step */}
          {step === "saving" && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent)] border-t-transparent mb-4" />
              <p className="text-[var(--muted)]">Saving format...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "edit" && (
          <div className="p-4 border-t border-[var(--card-border)] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save Format
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
