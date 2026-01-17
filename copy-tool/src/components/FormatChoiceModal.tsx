"use client";

import { AdFormat } from "@/types/ad-format";

interface FormatChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewFormat: () => void;
  onExistingFormat: (formatId: string) => void;
  onSkip: () => void;
  formats: AdFormat[];
  imagePreview?: string;
}

export default function FormatChoiceModal({
  isOpen,
  onClose,
  onNewFormat,
  onExistingFormat,
  onSkip,
  formats,
  imagePreview,
}: FormatChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-medium">What would you like to do?</h2>
        </div>

        {/* Preview */}
        {imagePreview && (
          <div className="px-4 pt-4">
            <img
              src={imagePreview}
              alt="Uploaded creative"
              className="w-full h-40 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Options */}
        <div className="p-4 space-y-3">
          {/* New Format */}
          <button
            type="button"
            onClick={onNewFormat}
            className="w-full p-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-left hover:border-[var(--accent)] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-[var(--foreground)]">Create New Format</div>
                <div className="text-xs text-[var(--muted)]">Analyze this ad and save as a new reusable format</div>
              </div>
            </div>
          </button>

          {/* Add to Existing */}
          {formats.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted)] uppercase tracking-wide px-1">Or add to existing format:</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => onExistingFormat(format.id)}
                    className="w-full p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-left hover:border-[var(--muted-dim)] transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    {format.thumbnail ? (
                      <img
                        src={format.thumbnail}
                        alt={format.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[var(--card)] rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--foreground)]">{format.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {format.sampleImages.length} sample{format.sampleImages.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skip */}
          <button
            type="button"
            onClick={onSkip}
            className="w-full p-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            Just use for this generation (don&apos;t save)
          </button>
        </div>
      </div>
    </div>
  );
}
