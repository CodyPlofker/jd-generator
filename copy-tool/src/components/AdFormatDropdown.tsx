"use client";

import { useState, useRef, useEffect } from "react";
import { AdFormat } from "@/types/ad-format";

interface AdFormatDropdownProps {
  formats: AdFormat[];
  selected: string;
  onSelect: (formatId: string) => void;
  onNewFormat: () => void;
}

export default function AdFormatDropdown({
  formats,
  selected,
  onSelect,
  onNewFormat,
}: AdFormatDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredFormat, setHoveredFormat] = useState<AdFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedFormat = formats.find((f) => f.id === selected);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredFormat(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer text-left flex items-center gap-3"
      >
        {selectedFormat ? (
          <>
            {selectedFormat.thumbnail && (
              <img
                src={selectedFormat.thumbnail}
                alt={selectedFormat.name}
                className="w-10 h-10 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--foreground)] truncate">
                {selectedFormat.name}
              </div>
              {selectedFormat.description && (
                <div className="text-xs text-[var(--muted)] truncate">
                  {selectedFormat.description}
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="text-[var(--muted)]">Select ad format...</span>
        )}
        <svg
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 flex">
          {/* Main dropdown list */}
          <div className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {formats.length > 0 && (
              <>
                {formats.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => {
                      onSelect(format.id);
                      setIsOpen(false);
                      setHoveredFormat(null);
                    }}
                    onMouseEnter={() => setHoveredFormat(format)}
                    onMouseLeave={() => setHoveredFormat(null)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-[var(--input-bg)] transition-colors text-left cursor-pointer ${
                      selected === format.id ? "bg-[var(--input-bg)]" : ""
                    }`}
                  >
                    {format.thumbnail ? (
                      <img
                        src={format.thumbnail}
                        alt={format.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[var(--input-bg)] rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--foreground)] font-medium">{format.name}</div>
                      {format.description && (
                        <div className="text-xs text-[var(--muted)] truncate">
                          {format.description}
                        </div>
                      )}
                      <div className="text-xs text-[var(--muted-dim)] mt-0.5">
                        {format.specs.copyPlacements.length} copy zone{format.specs.copyPlacements.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {selected === format.id && (
                      <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
                <div className="border-t border-[var(--card-border)]" />
              </>
            )}

            <button
              type="button"
              onClick={() => {
                onNewFormat();
                setIsOpen(false);
                setHoveredFormat(null);
              }}
              className="w-full p-3 flex items-center gap-3 hover:bg-[var(--input-bg)] transition-colors text-left text-[var(--accent)] cursor-pointer"
            >
              <div className="w-12 h-12 border border-dashed border-[var(--accent)] rounded flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-sm font-medium">Add New Format</div>
            </button>
          </div>

          {/* Hover preview panel */}
          {hoveredFormat && hoveredFormat.thumbnail && (
            <div className="ml-2 w-48 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl p-3 hidden md:block">
              <img
                src={hoveredFormat.thumbnail}
                alt={hoveredFormat.name}
                className="w-full aspect-square object-cover rounded-lg mb-2"
              />
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{hoveredFormat.name}</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-[var(--muted)] font-medium">Copy Zones:</p>
                {hoveredFormat.specs.copyPlacements.slice(0, 3).map((p, i) => (
                  <p key={i} className="text-xs text-[var(--muted-dim)]">
                    • {p.zone} {p.required && <span className="text-[var(--accent)]">*</span>}
                  </p>
                ))}
                {hoveredFormat.specs.copyPlacements.length > 3 && (
                  <p className="text-xs text-[var(--muted-dim)]">
                    +{hoveredFormat.specs.copyPlacements.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
