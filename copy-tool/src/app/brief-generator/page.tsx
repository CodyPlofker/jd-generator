"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Persona, Product, Brief, BriefBoard } from "@/types/brief";
import { AdFormat } from "@/types/ad-format";

type Step = "persona" | "products" | "angles" | "formats" | "generate" | "results";

export default function BriefGeneratorPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("persona");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formats, setFormats] = useState<AdFormat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedAngles, setSelectedAngles] = useState<{ angle: string; notes: string }[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<AdFormat[]>([]);
  const [customAngles, setCustomAngles] = useState<string[]>([]);
  const [newCustomAngle, setNewCustomAngle] = useState("");

  // Generated briefs
  const [generatedBriefs, setGeneratedBriefs] = useState<Brief[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedCopy, setEditedCopy] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Save to board state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [existingBoards, setExistingBoards] = useState<BriefBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<"new" | "existing">("new");

  // Image lightbox state
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [personasRes, productsRes, formatsRes] = await Promise.all([
        fetch("/api/personas"),
        fetch("/api/products"),
        fetch("/api/ad-formats"),
      ]);

      const [personasData, productsData, formatsData] = await Promise.all([
        personasRes.json(),
        productsRes.json(),
        formatsRes.json(),
      ]);

      setPersonas(personasData);
      setProducts(productsData);
      setFormats(formatsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
    setSelectedAngles([]); // Reset angles when persona changes
    setCustomAngles([]); // Reset custom angles too
    setNewCustomAngle("");
  };

  const addCustomAngle = () => {
    const trimmed = newCustomAngle.trim();
    if (trimmed && !customAngles.includes(trimmed) && !selectedPersona?.keyMotivations.includes(trimmed)) {
      setCustomAngles([...customAngles, trimmed]);
      // Auto-select the custom angle when added
      setSelectedAngles([...selectedAngles, { angle: trimmed, notes: '' }]);
      setNewCustomAngle("");
    }
  };

  const removeCustomAngle = (angle: string) => {
    setCustomAngles(customAngles.filter(a => a !== angle));
    setSelectedAngles(selectedAngles.filter(a => a.angle !== angle));
  };

  const handleProductToggle = (product: Product) => {
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : prev.length < 4
        ? [...prev, product]
        : prev
    );
  };

  const handleAngleToggle = (angle: string) => {
    setSelectedAngles((prev) =>
      prev.some((a) => a.angle === angle)
        ? prev.filter((a) => a.angle !== angle)
        : [...prev, { angle, notes: '' }]
    );
  };

  const updateAngleNotes = (angle: string, notes: string) => {
    setSelectedAngles((prev) =>
      prev.map((a) => a.angle === angle ? { ...a, notes } : a)
    );
  };

  const handleFormatToggle = (format: AdFormat) => {
    setSelectedFormats((prev) =>
      prev.some((f) => f.id === format.id)
        ? prev.filter((f) => f.id !== format.id)
        : [...prev, format]
    );
  };

  const calculateTotalBriefs = () => {
    return selectedProducts.length * selectedAngles.length * selectedFormats.length;
  };

  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const generateCopyForBrief = async (brief: Brief): Promise<string> => {
    try {
      const response = await fetch("/api/generate-brief-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: brief.persona,
          product: brief.product,
          angle: brief.angle,
          angleNotes: brief.angleNotes,
          format: brief.format,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result.error || "Unknown error");
        return "";
      }

      console.log("Generated copy:", result.copy);
      return result.copy || "";
    } catch (error) {
      console.error("Error generating copy:", error);
    }
    return "";
  };

  const handleGenerate = async () => {
    if (!selectedPersona) return;

    setIsGenerating(true);
    const briefs: Brief[] = [];

    // Generate all combinations first
    for (const product of selectedProducts) {
      for (const angleObj of selectedAngles) {
        for (const format of selectedFormats) {
          const brief: Brief = {
            id: `${selectedPersona.id}-${product.id}-${angleObj.angle.slice(0, 10)}-${format.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            persona: selectedPersona,
            product: product,
            angle: angleObj.angle,
            angleNotes: angleObj.notes || undefined,
            format: {
              id: format.id,
              name: format.name,
              thumbnail: format.thumbnail,
              specs: {
                copyPlacements: format.specs.copyPlacements,
                styleNotes: format.specs.styleNotes,
              },
            },
            generatedCopy: {},
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          briefs.push(brief);
        }
      }
    }

    setGenerationProgress({ current: 0, total: briefs.length });

    // Generate copy for each brief
    for (let i = 0; i < briefs.length; i++) {
      setGenerationProgress({ current: i + 1, total: briefs.length });
      const copy = await generateCopyForBrief(briefs[i]);
      briefs[i].generatedCopy = copy;
      briefs[i].status = copy ? "generated" : "pending";
    }

    setGeneratedBriefs(briefs);
    setStep("results");
    setIsGenerating(false);
  };

  const getStepNumber = (s: Step) => {
    const steps: Step[] = ["persona", "products", "angles", "formats", "generate", "results"];
    return steps.indexOf(s) + 1;
  };

  const canProceed = () => {
    switch (step) {
      case "persona":
        return selectedPersona !== null;
      case "products":
        return selectedProducts.length > 0;
      case "angles":
        return selectedAngles.length > 0;
      case "formats":
        return selectedFormats.length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ["persona", "products", "angles", "formats", "generate"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ["persona", "products", "angles", "formats", "generate"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Start editing a brief
  const startEditing = () => {
    if (selectedBrief) {
      const copyText = typeof selectedBrief.generatedCopy === "string"
        ? selectedBrief.generatedCopy
        : Object.entries(selectedBrief.generatedCopy).map(([zone, copy]) => `[${zone.toUpperCase()}]\n${copy}`).join("\n\n");
      setEditedCopy(copyText);
      setIsEditing(true);
    }
  };

  // Save edited copy
  const saveEdits = () => {
    if (selectedBrief) {
      const updatedBriefs = generatedBriefs.map((brief) =>
        brief.id === selectedBrief.id
          ? { ...brief, generatedCopy: editedCopy, status: "edited" as const }
          : brief
      );
      setGeneratedBriefs(updatedBriefs);
      setSelectedBrief({ ...selectedBrief, generatedCopy: editedCopy, status: "edited" });
      setIsEditing(false);
      setEditedCopy("");
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedCopy("");
  };

  // Copy single brief to clipboard
  const copyBriefToClipboard = async (brief: Brief) => {
    const copyText = formatBriefForCopy(brief);
    await navigator.clipboard.writeText(copyText);
    setCopySuccess(brief.id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Format a single brief for copying
  const formatBriefForCopy = (brief: Brief) => {
    let text = `=== CREATIVE BRIEF ===\n\n`;
    text += `PERSONA: ${brief.persona.name}\n`;
    text += `PRODUCT: ${brief.product.name} (${brief.product.price})\n`;
    text += `ANGLE: ${brief.angle}\n`;
    text += `FORMAT: ${brief.format.name}\n\n`;
    text += `--- COPY ---\n\n`;
    if (typeof brief.generatedCopy === "string") {
      text += brief.generatedCopy;
    } else {
      const copyObj = brief.generatedCopy as { [zone: string]: string };
      brief.format.specs.copyPlacements.forEach((zone) => {
        const copy = copyObj[zone.zone] || "[No copy]";
        text += `\n[${zone.zone.toUpperCase()}]\n${copy}\n`;
      });
    }
    return text;
  };

  // Export all briefs as text
  const exportAllBriefs = async () => {
    let fullExport = `JONES ROAD BEAUTY - CREATIVE BRIEFS\n`;
    fullExport += `Generated: ${new Date().toLocaleDateString()}\n`;
    fullExport += `Persona: ${selectedPersona?.name}\n`;
    fullExport += `Total Briefs: ${generatedBriefs.length}\n`;
    fullExport += `\n${"=".repeat(50)}\n\n`;

    generatedBriefs.forEach((brief, index) => {
      fullExport += `[${index + 1}/${generatedBriefs.length}] `;
      fullExport += formatBriefForCopy(brief);
      fullExport += `\n${"=".repeat(50)}\n\n`;
    });

    await navigator.clipboard.writeText(fullExport);
    setCopySuccess("all");
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Download briefs as JSON for backup/import
  const downloadBriefsAsJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      persona: selectedPersona,
      briefs: generatedBriefs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `briefs-${selectedPersona?.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load existing boards when modal opens
  const loadExistingBoards = async () => {
    try {
      const response = await fetch("/api/boards");
      if (response.ok) {
        const boards = await response.json();
        setExistingBoards(boards);
      }
    } catch (error) {
      console.error("Error loading boards:", error);
    }
  };

  // Open save modal and load boards
  const openSaveModal = () => {
    setShowSaveModal(true);
    setSaveMode("new");
    setSelectedBoardId(null);
    setBoardName("");
    loadExistingBoards();
  };

  // Save briefs to a board
  const saveToBoard = async () => {
    if (!selectedPersona) return;

    // Validate based on mode
    if (saveMode === "new" && !boardName.trim()) return;
    if (saveMode === "existing" && !selectedBoardId) return;

    setIsSaving(true);
    try {
      // Convert briefs to SavedBrief format
      const savedBriefs = generatedBriefs.map((brief) => ({
        ...brief,
        boardId: "", // Will be set by the API
        savedAt: new Date().toISOString(),
      }));

      if (saveMode === "new") {
        // Create new board
        const response = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: boardName.trim(),
            persona: selectedPersona,
            briefs: savedBriefs,
          }),
        });

        if (response.ok) {
          const board = await response.json();
          router.push(`/boards/${board.id}`);
        } else {
          console.error("Failed to save board");
        }
      } else {
        // Add to existing board
        const response = await fetch(`/api/boards/${selectedBoardId}/briefs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            briefs: savedBriefs,
          }),
        });

        if (response.ok) {
          router.push(`/boards/${selectedBoardId}`);
        } else {
          console.error("Failed to add briefs to board");
        }
      }
    } catch (error) {
      console.error("Error saving board:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Brief Generator</h1>
          </div>
          {step !== "results" && (
            <div className="text-sm text-[var(--muted)]">
              Step {getStepNumber(step)} of 5
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {step !== "results" && (
        <div className="border-b border-[var(--card-border)] bg-[var(--card)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex">
              {(["persona", "products", "angles", "formats", "generate"] as Step[]).map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    const steps: Step[] = ["persona", "products", "angles", "formats", "generate"];
                    if (steps.indexOf(s) <= steps.indexOf(step)) {
                      setStep(s);
                    }
                  }}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    step === s
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : getStepNumber(s) < getStepNumber(step)
                      ? "border-green-500 text-green-500"
                      : "border-transparent text-[var(--muted)]"
                  }`}
                >
                  {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 pb-24">
        {/* Step 1: Persona Selection */}
        {step === "persona" && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Select a Persona</h2>
            <p className="text-[var(--muted)] mb-6">Choose the target persona for your briefs</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaSelect(persona)}
                  className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPersona?.id === persona.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted-dim)]"
                  }`}
                >
                  <h3 className="font-semibold text-[var(--foreground)] mb-1">{persona.name}</h3>
                  <p className="text-sm text-[var(--muted)] line-clamp-2">{persona.overview}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {persona.keyMotivations.slice(0, 2).map((m, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[var(--input-bg)] text-[var(--muted)] px-2 py-0.5 rounded"
                      >
                        {m.length > 20 ? m.slice(0, 20) + "..." : m}
                      </span>
                    ))}
                    {persona.keyMotivations.length > 2 && (
                      <span className="text-xs text-[var(--muted-dim)]">
                        +{persona.keyMotivations.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* No Persona Option */}
            <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
              <button
                onClick={() => handlePersonaSelect({
                  id: "no-persona",
                  name: "General Audience",
                  overview: "General product announcement without targeting a specific persona",
                  demographics: {
                    profession: "General audience",
                    socioeconomicStatus: "",
                    familyStatus: "",
                    geography: "",
                  },
                  keyMotivations: [],
                  whyBrandAppeals: "",
                })}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedPersona?.id === "no-persona"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted-dim)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[var(--foreground)]">General Audience</h3>
                    <p className="text-xs text-[var(--muted)]">For broad product launches without persona targeting</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Product Selection */}
        {step === "products" && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Select Products</h2>
            <p className="text-[var(--muted)] mb-6">
              Choose up to 4 products ({selectedProducts.length}/4 selected)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductToggle(product)}
                  disabled={selectedProducts.length >= 4 && !selectedProducts.some((p) => p.id === product.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedProducts.some((p) => p.id === product.id)
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : selectedProducts.length >= 4
                      ? "border-[var(--card-border)] bg-[var(--card)] opacity-50"
                      : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted-dim)]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-[var(--foreground)]">{product.name}</h3>
                    <span className="text-sm text-[var(--muted)]">{product.price}</span>
                  </div>
                  <p className="text-xs text-[var(--accent)] mt-1">{product.category}</p>
                  <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">{product.description}</p>
                </button>
              ))}

              {/* Brand Value Props Option */}
              <button
                onClick={() => handleProductToggle({
                  id: 'brand-value-props',
                  name: 'Brand Value Props',
                  category: 'Brand',
                  price: '',
                  description: 'General Jones Road Beauty brand messaging - clean beauty philosophy, Bobbi Brown heritage, real skin approach',
                  keyBenefits: ['Clean beauty', 'Easy application', 'Natural ingredients', 'Real skin philosophy'],
                  shades: '',
                  bestFor: 'All skin types'
                })}
                disabled={selectedProducts.length >= 4 && !selectedProducts.some((p) => p.id === 'brand-value-props')}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedProducts.some((p) => p.id === 'brand-value-props')
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : selectedProducts.length >= 4
                    ? "border-[var(--card-border)] bg-[var(--card)] opacity-50"
                    : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted-dim)]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-[var(--foreground)]">Brand Value Props</h3>
                  <span className="text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">General</span>
                </div>
                <p className="text-xs text-[var(--accent)] mt-1">Brand</p>
                <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">General Jones Road Beauty brand messaging - no specific product focus</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Angle Selection */}
        {step === "angles" && selectedPersona && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Select Angles to Test</h2>
            <p className="text-[var(--muted)] mb-6">
              {selectedPersona.id === "no-persona"
                ? `Add custom angles for your briefs (${selectedAngles.length} selected)`
                : `Select angles for ${selectedPersona.name} (${selectedAngles.length} selected)`
              }
            </p>

            {/* Preset Angles - only show if persona has motivations */}
            {selectedPersona.keyMotivations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedPersona.keyMotivations.map((angle, index) => {
                const isSelected = selectedAngles.some((a) => a.angle === angle);
                const angleData = selectedAngles.find((a) => a.angle === angle);
                return (
                  <div key={index} className={`rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted-dim)]"
                  }`}>
                    <button
                      onClick={() => handleAngleToggle(angle)}
                      className="w-full text-left p-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : "border-[var(--muted-dim)]"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-[var(--foreground)]">{angle}</span>
                      </div>
                    </button>
                    {isSelected && (
                      <div className="px-4 pb-4">
                        <textarea
                          value={angleData?.notes || ''}
                          onChange={(e) => updateAngleNotes(angle, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Add notes for this angle (optional)..."
                          className="w-full text-sm bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {/* Custom Angles Section */}
            <div className={selectedPersona.keyMotivations.length > 0 ? "mt-8" : ""}>
              {selectedPersona.keyMotivations.length > 0 && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-[var(--card-border)]" />
                  <span className="text-sm text-[var(--muted)]">Or add custom angle</span>
                  <div className="flex-1 h-px bg-[var(--card-border)]" />
                </div>
              )}

              {/* Add Custom Angle Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCustomAngle}
                  onChange={(e) => setNewCustomAngle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomAngle()}
                  placeholder="Enter custom angle..."
                  className="flex-1 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <button
                  onClick={addCustomAngle}
                  disabled={!newCustomAngle.trim()}
                  className="px-4 py-3 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>

              {/* Custom Angles List */}
              {customAngles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customAngles.map((angle, index) => {
                    const isSelected = selectedAngles.some((a) => a.angle === angle);
                    const angleData = selectedAngles.find((a) => a.angle === angle);
                    return (
                      <div
                        key={`custom-${index}`}
                        className={`rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--card-border)] bg-[var(--card)]"
                        }`}
                      >
                        <div className="flex items-center justify-between p-4">
                          <button
                            onClick={() => handleAngleToggle(angle)}
                            className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                          >
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? "border-[var(--accent)] bg-[var(--accent)]"
                                  : "border-[var(--muted-dim)]"
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="font-medium text-[var(--foreground)]">{angle}</span>
                            <span className="text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">Custom</span>
                          </button>
                          <button
                            onClick={() => removeCustomAngle(angle)}
                            className="p-1 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove custom angle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {isSelected && (
                          <div className="px-4 pb-4">
                            <textarea
                              value={angleData?.notes || ''}
                              onChange={(e) => updateAngleNotes(angle, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add notes for this angle (optional)..."
                              className="w-full text-sm bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Format Selection */}
        {step === "formats" && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Select Ad Formats</h2>
            <p className="text-[var(--muted)] mb-6">
              Choose the ad formats to generate briefs for ({selectedFormats.length} selected)
            </p>

            {formats.length === 0 ? (
              <div className="text-center py-12 bg-[var(--card)] rounded-xl border border-[var(--card-border)]">
                <p className="text-[var(--muted)] mb-4">No ad formats available</p>
                <Link
                  href="/ad-formats"
                  className="text-[var(--accent)] hover:underline"
                >
                  Create ad formats first
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => handleFormatToggle(format)}
                    className={`text-left rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                      selectedFormats.some((f) => f.id === format.id)
                        ? "border-[var(--accent)]"
                        : "border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                    }`}
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
                          <svg className="w-8 h-8 text-[var(--muted-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {selectedFormats.some((f) => f.id === format.id) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--accent)] rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-[var(--card)]">
                      <h3 className="font-medium text-[var(--foreground)] text-sm truncate">{format.name}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        {format.specs.copyPlacements.length} zone{format.specs.copyPlacements.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Generate */}
        {step === "generate" && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Review & Generate</h2>
            <p className="text-[var(--muted)] mb-6">
              Review your selections before generating {calculateTotalBriefs()} briefs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Persona Summary */}
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">Persona</h3>
                {selectedPersona && (
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{selectedPersona.name}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">{selectedPersona.demographics.profession}</p>
                  </div>
                )}
              </div>

              {/* Products Summary */}
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                  Products ({selectedProducts.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((p) => (
                    <span key={p.id} className="text-sm bg-[var(--input-bg)] text-[var(--foreground)] px-2 py-1 rounded">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Angles Summary */}
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                  Angles ({selectedAngles.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAngles.map((a, i) => (
                    <span key={i} className="text-sm bg-[var(--input-bg)] text-[var(--foreground)] px-2 py-1 rounded">
                      {a.angle.length > 30 ? a.angle.slice(0, 30) + "..." : a.angle}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formats Summary */}
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                  Formats ({selectedFormats.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedFormats.map((f) => (
                    <span key={f.id} className="text-sm bg-[var(--input-bg)] text-[var(--foreground)] px-2 py-1 rounded">
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Preview */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Brief Matrix</h3>
              <p className="text-[var(--muted)]">
                {selectedProducts.length} products × {selectedAngles.length} angles × {selectedFormats.length} formats ={" "}
                <span className="font-semibold text-[var(--accent)]">{calculateTotalBriefs()} briefs</span>
              </p>
              <p className="text-sm text-[var(--muted-dim)] mt-2">
                Click the Generate button below to create AI copy for all briefs
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {step === "results" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Generated Briefs</h2>
                <p className="text-[var(--muted)]">{generatedBriefs.length} briefs for {selectedPersona?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openSaveModal}
                  className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Save to Board
                </button>
                <button
                  onClick={exportAllBriefs}
                  className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--card)] transition-colors cursor-pointer flex items-center gap-2"
                >
                  {copySuccess === "all" ? (
                    <>
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy All
                    </>
                  )}
                </button>
                <button
                  onClick={downloadBriefsAsJSON}
                  className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--card)] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => {
                    setStep("persona");
                    setSelectedPersona(null);
                    setSelectedProducts([]);
                    setSelectedAngles([]);
                    setSelectedFormats([]);
                    setGeneratedBriefs([]);
                  }}
                  className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--card)] transition-colors cursor-pointer"
                >
                  New Matrix
                </button>
              </div>
            </div>

            {/* Organized by Angle */}
            <div className="space-y-8">
              {selectedAngles.map((angleObj) => {
                const angleBriefs = generatedBriefs.filter((b) => b.angle === angleObj.angle);
                return (
                  <div key={angleObj.angle} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                    {/* Angle Header */}
                    <div className="px-4 py-3 bg-[var(--input-bg)] border-b border-[var(--card-border)]">
                      <h3 className="font-semibold text-[var(--foreground)]">{angleObj.angle}</h3>
                      <p className="text-xs text-[var(--muted)]">{angleBriefs.length} briefs</p>
                    </div>

                    {/* Brief List */}
                    <div className="divide-y divide-[var(--card-border)]">
                      {angleBriefs.map((brief) => {
                        const primaryCopy = typeof brief.generatedCopy === "string"
                          ? brief.generatedCopy.slice(0, 150)
                          : Object.values(brief.generatedCopy)[0] || "";
                        return (
                          <button
                            key={brief.id}
                            onClick={() => setSelectedBrief(brief)}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--input-bg)] transition-colors cursor-pointer flex items-start gap-4"
                          >
                            {/* Thumbnail */}
                            <div className="w-16 h-16 flex-shrink-0 bg-[var(--input-bg)] rounded-lg overflow-hidden">
                              {brief.format.thumbnail ? (
                                <img
                                  src={brief.format.thumbnail}
                                  alt={brief.format.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-[var(--muted-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-[var(--foreground)]">{brief.product.name}</span>
                                <span className="text-xs text-[var(--muted)]">•</span>
                                <span className="text-sm text-[var(--muted)]">{brief.format.name}</span>
                                <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                                  brief.status === "generated" ? "bg-green-500/20 text-green-400" :
                                  brief.status === "edited" ? "bg-blue-500/20 text-blue-400" :
                                  "bg-yellow-500/20 text-yellow-400"
                                }`}>
                                  {brief.status}
                                </span>
                              </div>
                              {primaryCopy && (
                                <p className="text-sm text-[var(--muted)] line-clamp-2">{primaryCopy}</p>
                              )}
                            </div>

                            {/* Arrow */}
                            <svg className="w-5 h-5 text-[var(--muted-dim)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Sticky Navigation Footer */}
      {step !== "results" && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--card-border)] z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={step === "persona"}
              className="px-6 py-2.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Back
            </button>
            <div className="text-sm text-[var(--muted)]">
              {step === "persona" && selectedPersona && `Selected: ${selectedPersona.name}`}
              {step === "products" && selectedProducts.length > 0 && `${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} selected`}
              {step === "angles" && selectedAngles.length > 0 && `${selectedAngles.length} angle${selectedAngles.length !== 1 ? 's' : ''} selected`}
              {step === "formats" && selectedFormats.length > 0 && `${selectedFormats.length} format${selectedFormats.length !== 1 ? 's' : ''} selected`}
              {step === "generate" && `${calculateTotalBriefs()} briefs to generate`}
            </div>
            {step !== "generate" ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer font-medium"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || calculateTotalBriefs() === 0}
                className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer font-medium"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Generating {generationProgress.current}/{generationProgress.total}...
                  </span>
                ) : (
                  `Generate ${calculateTotalBriefs()} Briefs`
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Brief Detail Modal - Ultra Compact for Screenshots */}
      {selectedBrief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedBrief(null)} />
          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 className="text-base font-medium text-[var(--foreground)]">Brief Details</h2>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button onClick={startEditing} className="text-sm text-[var(--accent)] hover:underline cursor-pointer">Edit</button>
                )}
                <button
                  onClick={() => { setSelectedBrief(null); setIsEditing(false); }}
                  className="p-1 hover:bg-[var(--input-bg)] rounded transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Brief Info Row */}
              <div className="flex gap-4 items-start">
                {/* Reference Thumbnail */}
                <button
                  onClick={() => selectedBrief.format.thumbnail && setEnlargedImage(selectedBrief.format.thumbnail)}
                  className={`w-24 h-24 bg-[var(--input-bg)] rounded-lg overflow-hidden flex-shrink-0 ${selectedBrief.format.thumbnail ? 'cursor-zoom-in hover:ring-2 hover:ring-[var(--accent)]' : ''}`}
                  disabled={!selectedBrief.format.thumbnail}
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
                </button>
                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-[var(--muted)]">PERSONA:</span> <span className="text-[var(--foreground)]">{selectedBrief.persona.name}</span></div>
                  <div><span className="text-[var(--muted)]">PRODUCT:</span> <span className="text-[var(--foreground)]">{selectedBrief.product.name}</span></div>
                  <div className="col-span-2"><span className="text-[var(--muted)]">ANGLE:</span> <span className="text-[var(--foreground)]">{selectedBrief.angle}</span></div>
                  {selectedBrief.angleNotes && (
                    <div className="col-span-2"><span className="text-[var(--muted)]">ANGLE NOTES:</span> <span className="text-[var(--foreground)] italic">{selectedBrief.angleNotes}</span></div>
                  )}
                  <div className="col-span-2"><span className="text-[var(--muted)]">FORMAT:</span> <span className="text-[var(--foreground)]">{selectedBrief.format.name}</span></div>
                </div>
              </div>

              {/* Generated Copy */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Generated Copy</h3>
                {isEditing ? (
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

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--card-border)] flex justify-between">
              <button
                onClick={() => copyBriefToClipboard(selectedBrief)}
                className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--input-bg)] cursor-pointer flex items-center gap-2"
              >
                {copySuccess === selectedBrief.id ? (
                  <><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copy Brief</>
                )}
              </button>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={cancelEditing} className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">Cancel</button>
                    <button onClick={saveEdits} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:opacity-90 cursor-pointer">Save</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setSelectedBrief(null); setIsEditing(false); }} className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">Close</button>
                    <button onClick={startEditing} className="px-4 py-2 text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--input-bg)] cursor-pointer">Edit</button>
                    <button className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 cursor-pointer">Regenerate Copy</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save to Board Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--card-border)]">
              <h2 className="text-lg font-medium text-[var(--foreground)]">Save to Board</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                {generatedBriefs.length} briefs will be saved
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSaveMode("new")}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors cursor-pointer ${
                    saveMode === "new"
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  New Board
                </button>
                <button
                  onClick={() => setSaveMode("existing")}
                  disabled={existingBoards.length === 0}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                    saveMode === "existing"
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Existing Board {existingBoards.length > 0 && `(${existingBoards.length})`}
                </button>
              </div>

              {saveMode === "new" ? (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Board Name
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder={`${selectedPersona?.name || "Briefs"} - ${new Date().toLocaleDateString()}`}
                    className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Select Board
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {existingBoards.map((board) => (
                      <button
                        key={board.id}
                        onClick={() => setSelectedBoardId(board.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedBoardId === board.id
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--muted-dim)]"
                        }`}
                      >
                        <div className="font-medium text-[var(--foreground)]">{board.name}</div>
                        <div className="text-xs text-[var(--muted)] mt-0.5">
                          {board.briefs.length} briefs • {board.persona.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--card-border)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setBoardName("");
                  setSelectedBoardId(null);
                }}
                className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (saveMode === "new" && !boardName.trim()) {
                    setBoardName(`${selectedPersona?.name || "Briefs"} - ${new Date().toLocaleDateString()}`);
                  }
                  saveToBoard();
                }}
                disabled={isSaving || (saveMode === "existing" && !selectedBoardId)}
                className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : saveMode === "new" ? (
                  "Create Board"
                ) : (
                  "Add to Board"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={enlargedImage}
            alt="Reference image"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
