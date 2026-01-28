"use client";

import { useState, useRef, useEffect } from "react";
import { AdFormat, AdFormatSpecs } from "@/types/ad-format";
import AdFormatDropdown from "@/components/AdFormatDropdown";
import NewFormatModal from "@/components/NewFormatModal";
import FormatChoiceModal from "@/components/FormatChoiceModal";

const personas = [
  { id: "educator", name: "The Dedicated Educator", description: "Teachers, professors, school administrators" },
  { id: "matriarch", name: "The Ageless Matriarch", description: "Sophisticated 60+ woman who values grace and quality" },
  { id: "executive", name: "The High-Powered Executive", description: "VPs, C-Suite, Directors - time-poor, financially abundant" },
  { id: "healthcare", name: "The Wellness & Healthcare Practitioner", description: "Doctors, nurses, therapists who prioritize clean ingredients" },
  { id: "supermom", name: "The Busy Suburban Super-Mom", description: "Juggling family, career, and community involvement" },
  { id: "creative", name: "The Creative Entrepreneur", description: "Artists, designers, small business owners" },
];

const channels = [
  { id: "meta-ads", name: "Meta Ads" },
  { id: "email", name: "Email" },
  { id: "sms", name: "SMS" },
  { id: "product-page", name: "Product Page" },
  { id: "landing-page", name: "Landing Page" },
];

const awarenessLevels = [
  { id: "unaware", name: "Unaware", description: "Don't know they have a problem" },
  { id: "problem-aware", name: "Problem Aware", description: "Know the problem, not solutions" },
  { id: "solution-aware", name: "Solution Aware", description: "Know solutions exist, not YOUR product" },
  { id: "product-aware", name: "Product Aware", description: "Know your product, not convinced" },
  { id: "most-aware", name: "Most Aware", description: "Ready to buy, need a reason to act" },
];

const landingPageTypes = [
  { id: "listicle", name: "Listicle", description: "Numbered list format highlighting key benefits or reasons" },
];

const listicleBulletOptions = [
  { id: "5", name: "5 items" },
  { id: "6", name: "6 items" },
  { id: "7", name: "7 items" },
];

const smsTypes = [
  { id: "product-launch", name: "Product Launch", description: "Announce a brand-new product" },
  { id: "product-spotlight", name: "Product Spotlight", description: "Focus on one hero product with key benefits" },
  { id: "product-roundup", name: "Product Roundup", description: "Highlight products under a common theme" },
  { id: "category-push", name: "Category Push", description: "Drive traffic to a specific category" },
  { id: "social-proof", name: "Social Proof / Reviews", description: "Use customer quotes to validate products" },
  { id: "sale-promo", name: "Sale / Promotion", description: "Announce promotions, % off, or bundles" },
  { id: "reminder", name: "Reminder / Last Chance", description: "Close out offers with urgency" },
  { id: "educational", name: "Educational", description: "Share how-to content or problem-solution" },
  { id: "cross-sell", name: "Cross-Sell / Upsell", description: "Suggest complementary products" },
];

const metaAdTypes = [
  { id: "copy", name: "Ad Copy", description: "Primary Text, Headline, and Link Description for Meta ad placements" },
  { id: "static-creative", name: "Static Creative", description: "Copy for text overlays on static image ads - upload a reference to match layout" },
  { id: "revise", name: "Revise Copy", description: "Upload an existing ad to get better headline alternatives - AI analyzes and rewrites" },
];

const emailTypes = [
  { id: "gtl", name: "GTL (Get the Look)", description: "Showcase a look and guide readers through recreating it step by step" },
  { id: "plain-text", name: "Plain Text / Letter-Style", description: "Intimate, personal note from a friend or founder" },
  { id: "product-spotlight", name: "Product Spotlight", description: "Deep dive into ONE product - benefits, why it works, who it's for" },
  { id: "product-roundup", name: "Product Roundup", description: "Curate products around a theme (season, occasion, vibe)" },
  { id: "back-in-stock", name: "Back in Stock", description: "Create urgency around a previously sold-out item returning" },
  { id: "product-launch", name: "Product Launch", description: "Announce a brand-new product with excitement" },
  { id: "teaser", name: "Teaser (Pre-Launch)", description: "Build anticipation before a launch with curiosity" },
  { id: "retail-event", name: "Retail Event / Pop-Up", description: "Drive attendance to an in-person event or experience" },
  { id: "promotional", name: "Promotional (GWP, Sale)", description: "Announce a promotion, sale, or gift-with-purchase" },
  { id: "set-kit", name: "Set or Kit Email", description: "Promote a bundled set emphasizing value and convenience" },
  { id: "how-to-problem", name: "How-To (Problem/Solution)", description: "Address a problem and position the product as the solution" },
  { id: "duos", name: "Duos / Product Combinations", description: "Show how two products work better together" },
  { id: "shade-roundup", name: "Shade Roundup", description: "Showcase shade range or highlight specific shades" },
  { id: "how-to-tutorial", name: "How to Use It (Tutorial)", description: "Educate on how to apply or use a specific product" },
  { id: "social-proof", name: "Social Proof (Reviews/Press)", description: "Build credibility through customer reviews or press quotes" },
];

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  keyBenefits: string[];
  shades: string;
  bestFor: string;
}

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedAwareness, setSelectedAwareness] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [angle, setAngle] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedLandingPageType, setSelectedLandingPageType] = useState("");
  const [selectedBulletCount, setSelectedBulletCount] = useState("5");
  const [selectedSmsType, setSelectedSmsType] = useState("");
  const [selectedEmailType, setSelectedEmailType] = useState("");
  const [selectedMetaAdType, setSelectedMetaAdType] = useState("");
  const [adFormats, setAdFormats] = useState<AdFormat[]>([]);
  const [selectedAdFormat, setSelectedAdFormat] = useState("");
  const [showNewFormatModal, setShowNewFormatModal] = useState(false);
  const [showFormatChoiceModal, setShowFormatChoiceModal] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [revisionContext, setRevisionContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }

    // Load products
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(console.error);

    // Load ad formats
    fetch("/api/ad-formats")
      .then((res) => res.json())
      .then((data) => setAdFormats(data))
      .catch(console.error);
  }, []);

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    if (productId) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        const info = `${product.name} - ${product.description} ${product.shades}. ${product.price}.`;
        setProductInfo(info);
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setReferenceImage(imageData);
        // If no format selected, show choice modal
        if (!selectedAdFormat) {
          setPendingImage(imageData);
          setShowFormatChoiceModal(true);
        }
      };
      reader.readAsDataURL(file);
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
      const formatsResponse = await fetch("/api/ad-formats");
      const formats = await formatsResponse.json();
      setAdFormats(formats);

      // Select the new format
      setSelectedAdFormat(newFormat.id);
      setShowNewFormatModal(false);
      setPendingImage(null);
    } catch (error) {
      console.error("Error saving format:", error);
      alert("Failed to save format. Please try again.");
    }
  };

  const handleAddToExistingFormat = async (formatId: string) => {
    if (!pendingImage) return;

    try {
      const format = adFormats.find((f) => f.id === formatId);
      if (!format) return;

      // Upload the image
      const uploadResponse = await fetch("/api/ad-formats/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: pendingImage,
          formatId: formatId,
          filename: `sample-${format.sampleImages.length + 1}.jpg`,
        }),
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        // Update format with new sample
        await fetch(`/api/ad-formats/${formatId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sampleImages: [...format.sampleImages, uploadResult.path],
          }),
        });

        // Refresh formats list
        const formatsResponse = await fetch("/api/ad-formats");
        const formats = await formatsResponse.json();
        setAdFormats(formats);
      }

      // Select this format
      setSelectedAdFormat(formatId);
      setShowFormatChoiceModal(false);
      setPendingImage(null);
    } catch (error) {
      console.error("Error adding to format:", error);
      alert("Failed to add image to format. Please try again.");
    }
  };

  const removeImage = () => {
    setReferenceImage(null);
    setReferenceImageName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!selectedChannel || !productInfo) {
      alert("Please select a channel and enter product information");
      return;
    }

    if (selectedChannel === "landing-page" && !selectedLandingPageType) {
      alert("Please select a landing page type");
      return;
    }

    if (selectedChannel === "sms" && !selectedSmsType) {
      alert("Please select an SMS type");
      return;
    }

    if (selectedChannel === "email" && !selectedEmailType) {
      alert("Please select an email type");
      return;
    }

    if (selectedChannel === "meta-ads" && !selectedMetaAdType) {
      alert("Please select a Meta ad type");
      return;
    }

    setIsLoading(true);
    setGeneratedCopy("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: selectedPersona,
          channel: selectedChannel,
          landingPageType: selectedLandingPageType,
          bulletCount: selectedBulletCount,
          smsType: selectedSmsType,
          emailType: selectedEmailType,
          metaAdType: selectedMetaAdType,
          adFormatId: selectedChannel === "meta-ads" && (selectedMetaAdType === "static-creative" || selectedMetaAdType === "revise") ? selectedAdFormat : null,
          awareness: selectedAwareness,
          productInfo,
          angle,
          referenceImage: selectedChannel === "meta-ads" && (selectedMetaAdType === "static-creative" || selectedMetaAdType === "revise") ? referenceImage : null,
          revisionContext: selectedChannel === "meta-ads" && selectedMetaAdType === "revise" ? revisionContext : null,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setGeneratedCopy(`Error: ${data.error}`);
      } else {
        setGeneratedCopy(data.copy);
      }
    } catch {
      setGeneratedCopy("Error generating copy. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-[var(--card-border)] flex items-center justify-center">
              <span className="text-[var(--foreground)] text-xs font-semibold">JR</span>
            </div>
            <span className="font-medium text-[var(--foreground)]">Copy Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/brief-generator"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Brief Generator
            </a>
            <a
              href="/gtm"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              GTM Workflow
            </a>
            <a
              href="/hooks"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Hooks
            </a>
            <a
              href="/boards"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Boards
            </a>
            <a
              href="/training"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Training Data
            </a>
            <a
              href="/ad-formats"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Ad Formats
            </a>
            <a
              href="/personas"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Personas
            </a>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Jones Road Beauty</p>
          <h1 className="text-4xl font-light text-[var(--foreground)] mb-2">
            Generate <span className="font-semibold">On-Brand</span> Copy
          </h1>
          <p className="text-[var(--muted)] mt-4 max-w-lg mx-auto">
            Create copy that sounds authentically Jones Road using trained brand voice, personas, and proven frameworks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Channel Selection */}
            <div>
              <label className="floating-label mb-3 block">Channel *</label>
              <div className="grid grid-cols-3 gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannel(channel.id);
                      if (channel.id !== "landing-page") {
                        setSelectedLandingPageType("");
                      }
                      if (channel.id !== "sms") {
                        setSelectedSmsType("");
                      }
                      if (channel.id !== "email") {
                        setSelectedEmailType("");
                      }
                      if (channel.id !== "meta-ads") {
                        setSelectedMetaAdType("");
                        setReferenceImage(null);
                        setReferenceImageName("");
                      }
                    }}
                    className={`channel-card py-3 px-4 text-center rounded-lg cursor-pointer ${
                      selectedChannel === channel.id ? "selected" : ""
                    }`}
                  >
                    <span className="text-sm font-medium">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meta Ad Type Selection - Only shows when Meta Ads channel is selected */}
            {selectedChannel === "meta-ads" && (
              <div>
                <label className="floating-label mb-3 block">Ad Type *</label>
                <select
                  value={selectedMetaAdType}
                  onChange={(e) => {
                    setSelectedMetaAdType(e.target.value);
                    // Clear reference image when switching away from static creative
                    if (e.target.value !== "static-creative") {
                      setReferenceImage(null);
                      setReferenceImageName("");
                    }
                  }}
                  className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
                >
                  <option value="">Select ad type</option>
                  {metaAdTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {selectedMetaAdType && (
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {metaAdTypes.find((t) => t.id === selectedMetaAdType)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Ad Format Selection - Only shows for Static Creative */}
            {selectedChannel === "meta-ads" && selectedMetaAdType === "static-creative" && (
              <div>
                <label className="floating-label mb-3 block">Ad Format</label>
                <AdFormatDropdown
                  formats={adFormats}
                  selected={selectedAdFormat}
                  onSelect={setSelectedAdFormat}
                  onNewFormat={() => setShowNewFormatModal(true)}
                />
                {selectedAdFormat && (
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {adFormats.find((f) => f.id === selectedAdFormat)?.specs.copyPlacements.length} copy zones defined
                  </p>
                )}
              </div>
            )}

            {/* Landing Page Type Selection - Only shows when Landing Page channel is selected */}
            {selectedChannel === "landing-page" && (
              <div>
                <label className="floating-label mb-3 block">Landing Page Type *</label>
                <select
                  value={selectedLandingPageType}
                  onChange={(e) => setSelectedLandingPageType(e.target.value)}
                  className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
                >
                  <option value="">Select type</option>
                  {landingPageTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {selectedLandingPageType && (
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {landingPageTypes.find((t) => t.id === selectedLandingPageType)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Number of List Items - Only shows for Listicle landing pages */}
            {selectedChannel === "landing-page" && selectedLandingPageType === "listicle" && (
              <div>
                <label className="floating-label mb-3 block">Number of List Items</label>
                <select
                  value={selectedBulletCount}
                  onChange={(e) => setSelectedBulletCount(e.target.value)}
                  className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
                >
                  {listicleBulletOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* SMS Type Selection - Only shows when SMS channel is selected */}
            {selectedChannel === "sms" && (
              <div>
                <label className="floating-label mb-3 block">SMS Type *</label>
                <select
                  value={selectedSmsType}
                  onChange={(e) => setSelectedSmsType(e.target.value)}
                  className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
                >
                  <option value="">Select SMS type</option>
                  {smsTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {selectedSmsType && (
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {smsTypes.find((t) => t.id === selectedSmsType)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Email Type Selection - Only shows when Email channel is selected */}
            {selectedChannel === "email" && (
              <div>
                <label className="floating-label mb-3 block">Email Type *</label>
                <select
                  value={selectedEmailType}
                  onChange={(e) => setSelectedEmailType(e.target.value)}
                  className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
                >
                  <option value="">Select email type</option>
                  {emailTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {selectedEmailType && (
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {emailTypes.find((t) => t.id === selectedEmailType)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Persona Selection */}
            <div>
              <label className="floating-label mb-3 block">Target Persona</label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
              >
                <option value="">General audience</option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
              {selectedPersona && (
                <p className="text-xs text-[var(--muted)] mt-2">
                  {personas.find((p) => p.id === selectedPersona)?.description}
                </p>
              )}
            </div>

            {/* Awareness Level */}
            <div>
              <label className="floating-label mb-3 block">Awareness Level</label>
              <select
                value={selectedAwareness}
                onChange={(e) => setSelectedAwareness(e.target.value)}
                className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
              >
                <option value="">Auto-detect</option>
                {awarenessLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Selection */}
            <div>
              <label className="floating-label mb-3 block">Product *</label>
              <select
                value={selectedProduct}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="input-dark w-full p-3 pr-10 rounded-lg cursor-pointer"
              >
                <option value="">Select a product or enter custom</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.price}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Info / Custom */}
            <div>
              <label className="floating-label mb-3 block">Product Details *</label>
              <textarea
                value={productInfo}
                onChange={(e) => {
                  setProductInfo(e.target.value);
                  if (selectedProduct) setSelectedProduct("");
                }}
                placeholder="Select a product above to auto-fill, or enter custom product/offer details here"
                rows={3}
                className="input-dark w-full p-3 rounded-lg resize-none"
              />
            </div>

            {/* Angle / Hook */}
            <div>
              <label className="floating-label mb-3 block">Angle / Hook</label>
              <textarea
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="E.g., Focus on the 'tired mom' problem, or the 5-minute routine angle"
                rows={2}
                className="input-dark w-full p-3 rounded-lg resize-none"
              />
            </div>

            {/* Reference Ad Upload - Only for Static Creative Meta Ads */}
            {selectedChannel === "meta-ads" && selectedMetaAdType === "static-creative" && (
              <div>
                <label className="floating-label mb-3 block">Reference Creative</label>
                {referenceImage ? (
                  <div className="input-dark rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={referenceImage}
                        alt="Reference ad"
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--foreground)] truncate">{referenceImageName}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">Reference uploaded</p>
                        <button
                          onClick={removeImage}
                          className="mt-2 text-xs text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="block input-dark rounded-lg p-6 text-center cursor-pointer hover:border-[var(--muted-dim)] transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--card)] flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-[var(--foreground)]">Upload a reference creative</p>
                    <p className="text-xs text-[var(--muted-dim)] mt-1">AI will analyze text zones and write copy for each</p>
                  </label>
                )}
              </div>
            )}

            {/* Revise Copy - Upload ad for headline alternatives */}
            {selectedChannel === "meta-ads" && selectedMetaAdType === "revise" && (
              <>
                {/* Format Selection - Required for Revise */}
                <div>
                  <label className="floating-label mb-3 block">Ad Format *</label>
                  <AdFormatDropdown
                    formats={adFormats}
                    selected={selectedAdFormat}
                    onSelect={setSelectedAdFormat}
                    hideNewFormat={true}
                  />
                  {selectedAdFormat && (
                    <p className="text-xs text-[var(--muted)] mt-2">
                      {adFormats.find((f) => f.id === selectedAdFormat)?.specs.copyPlacements.length} copy zones defined
                    </p>
                  )}
                  {!selectedAdFormat && (
                    <p className="text-xs text-[var(--muted-dim)] mt-2">
                      Select the format this ad uses to apply trained copy patterns
                    </p>
                  )}
                </div>

                <div>
                  <label className="floating-label mb-3 block">Upload Ad to Revise</label>
                  {referenceImage ? (
                    <div className="input-dark rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={referenceImage}
                          alt="Ad to revise"
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--foreground)] truncate">{referenceImageName}</p>
                          <p className="text-xs text-[var(--muted)] mt-0.5">AI will analyze this ad and suggest better headlines</p>
                          <button
                            onClick={removeImage}
                            className="mt-2 text-xs text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="block input-dark rounded-lg p-6 text-center cursor-pointer hover:border-[var(--muted-dim)] transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--card)] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-[var(--foreground)]">Upload the ad you want to revise</p>
                      <p className="text-xs text-[var(--muted-dim)] mt-1">AI will detect the headline and generate better alternatives</p>
                    </label>
                  )}
                </div>

                <div>
                  <label className="floating-label mb-3 block">What&apos;s wrong with it? (Optional)</label>
                  <textarea
                    value={revisionContext}
                    onChange={(e) => setRevisionContext(e.target.value)}
                    placeholder="E.g., Too generic, not compelling, doesn't speak to the target audience, too long..."
                    rows={2}
                    className="input-dark w-full p-3 rounded-lg resize-none"
                  />
                </div>
              </>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !selectedChannel || !productInfo || (selectedChannel === "meta-ads" && selectedMetaAdType === "revise" && !selectedAdFormat)}
              className="btn-primary w-full py-3.5 px-6 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate Copy"
              )}
            </button>
          </div>

          {/* Right Column - Output */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="floating-label">Generated Copy</label>
              {generatedCopy && (
                <button
                  onClick={handleCopy}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
            <div className="output-area rounded-lg p-6 min-h-[600px]">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="loading-shimmer h-4 rounded w-3/4"></div>
                  <div className="loading-shimmer h-4 rounded w-full"></div>
                  <div className="loading-shimmer h-4 rounded w-5/6"></div>
                  <div className="loading-shimmer h-4 rounded w-2/3"></div>
                  <div className="h-4"></div>
                  <div className="loading-shimmer h-4 rounded w-full"></div>
                  <div className="loading-shimmer h-4 rounded w-4/5"></div>
                </div>
              ) : generatedCopy ? (
                <div className="space-y-4">
                  {(() => {
                    // Track variation numbers per section
                    const variationCounters: Record<string, number> = {};

                    // Helper to clean text - remove markdown formatting
                    const cleanText = (text: string) => text
                      .replace(/\*\*(.+?)\*\*/g, '$1')
                      .replace(/\*(.+?)\*/g, '$1')
                      .replace(/^#+\s*/gm, '')
                      .replace(/\*\*Copy:\*\*\s*/gi, '')
                      .replace(/^-\s+/gm, '• ');

                    return generatedCopy.split(/(?=^#{2,3}\s)/m).map((section, index) => {
                      const trimmed = section.trim();
                      if (!trimmed) return null;

                      // Check if it's a heading (## or ###)
                      const h2Match = trimmed.match(/^##\s+(.+?)(?:\n|$)/);
                      const h3Match = trimmed.match(/^###\s+(.+?)(?:\n|$)/);

                      if (h2Match) {
                        const title = cleanText(h2Match[1]);
                        const content = trimmed.slice(h2Match[0].length).trim();
                        return (
                          <div key={index} className="mb-6">
                            <h2 className="text-lg font-semibold text-[var(--accent)] mb-3 pb-2 border-b border-[var(--card-border)]">
                              {title}
                            </h2>
                            {content && (
                              <div className="text-[var(--foreground)] text-[15px] leading-relaxed whitespace-pre-wrap">
                                {cleanText(content)}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (h3Match) {
                        const rawTitle = cleanText(h3Match[1]);
                        const content = trimmed.slice(h3Match[0].length).trim();

                        // Check if this is a variation (contains "variation" or "option" or "alt")
                        const isVariation = /variation|option|alt|v\d|version/i.test(rawTitle);

                        // Get base name without variation indicators
                        const baseName = rawTitle.replace(/\s*(variation|option|v?\d+|version|alt)\s*\d*/gi, '').trim().toLowerCase();

                        if (!variationCounters[baseName]) {
                          variationCounters[baseName] = 1;
                        } else {
                          variationCounters[baseName]++;
                        }

                        // Add V1, V2, etc. if there are multiple of the same type
                        const cleanTitle = rawTitle.replace(/\s*(variation|option|v?\d+|version|alt)\s*\d*/gi, '').trim();
                        const displayTitle = variationCounters[baseName] > 1 || isVariation
                          ? `${cleanTitle} — V${variationCounters[baseName]}`
                          : cleanTitle;

                        return (
                          <div key={index} className="mb-4 pl-0">
                            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                              {displayTitle}
                            </h3>
                            <div className="text-[var(--foreground)] text-[15px] leading-relaxed whitespace-pre-wrap bg-[var(--input-bg)] rounded-lg p-3">
                              {cleanText(content)}
                            </div>
                          </div>
                        );
                      }

                      // Plain text without heading - still clean it
                      return (
                        <div key={index} className="text-[var(--foreground)] text-[15px] leading-relaxed whitespace-pre-wrap">
                          {cleanText(trimmed)}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[550px] text-center">
                  <div className="w-12 h-12 rounded-lg bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--muted-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-[var(--foreground)] font-medium">Ready to generate</p>
                  <p className="text-sm text-[var(--muted-dim)] mt-1 max-w-xs">
                    Select a channel, add product details, and click generate.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <NewFormatModal
        isOpen={showNewFormatModal}
        onClose={() => {
          setShowNewFormatModal(false);
          setPendingImage(null);
        }}
        onSave={handleNewFormatSave}
        initialImage={pendingImage || undefined}
      />

      <FormatChoiceModal
        isOpen={showFormatChoiceModal}
        onClose={() => {
          setShowFormatChoiceModal(false);
          setPendingImage(null);
        }}
        onNewFormat={() => {
          setShowFormatChoiceModal(false);
          setShowNewFormatModal(true);
        }}
        onExistingFormat={handleAddToExistingFormat}
        onSkip={() => {
          setShowFormatChoiceModal(false);
          setPendingImage(null);
        }}
        formats={adFormats}
        imagePreview={pendingImage || undefined}
      />
    </div>
  );
}
