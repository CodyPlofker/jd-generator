"use client";

import { useState, useEffect } from "react";

// Force dark mode on mount
const useDarkMode = () => {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);
};

interface TrainingFile {
  name: string;
  path: string;
  category: string;
}

interface FileContent {
  path: string;
  content: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  keyBenefits: string[];
  shades: string;
  bestFor: string;
  // New fields from creative brief
  launchDate?: string;
  launchTier?: string;
  tagline?: string;
  whyWeLoveIt?: string;
  howItsDifferent?: string;
  howToUse?: string;
  whoItsFor?: string;
  keyIngredients?: string;
  finish?: string;
  formula?: string;
  application?: string;
  claims?: string[];
  weight?: string;
  availability?: string[];
}

const categories = [
  { id: "brand", name: "Brand", description: "Core brand voice and style guide" },
  { id: "brand-voice", name: "Brand Voice", description: "Tone guidelines and example copy" },
  { id: "personas", name: "Personas", description: "Customer avatar profiles" },
  { id: "frameworks", name: "Frameworks", description: "Breakthrough Advertising concepts" },
  { id: "channels", name: "Channels", description: "Channel-specific writing guidelines" },
  { id: "products", name: "Products", description: "Product catalog and details" },
  { id: "reviews", name: "Reviews", description: "Customer reviews and testimonials" },
  { id: "performance", name: "Performance", description: "Winning ads and metrics" },
  { id: "compliance", name: "Compliance", description: "Regulatory claims and callouts" },
  { id: "hooks", name: "Hooks", description: "Video hook frameworks and examples" },
];

const emptyProduct: Product = {
  id: "",
  name: "",
  category: "Face",
  price: "",
  description: "",
  keyBenefits: [""],
  shades: "",
  bestFor: "",
  launchDate: "",
  launchTier: "",
  tagline: "",
  whyWeLoveIt: "",
  howItsDifferent: "",
  howToUse: "",
  whoItsFor: "",
  keyIngredients: "",
  finish: "",
  formula: "",
  application: "",
  claims: [""],
  weight: "",
  availability: [""],
};

export default function TrainingPage() {
  useDarkMode();
  const [files, setFiles] = useState<TrainingFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("brand");
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Product management state
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product>(emptyProduct);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (selectedCategory === "products") {
      fetchProducts();
    }
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/training");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFileContent = async (path: string) => {
    try {
      const response = await fetch(`/api/training?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      setSelectedFile({ path, content: data.content });
      setEditContent(data.content);
      setIsEditing(false);
    } catch (error) {
      console.error("Error fetching file content:", error);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFile.path,
          content: editContent,
        }),
      });

      if (response.ok) {
        setSelectedFile({ ...selectedFile, content: editContent });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving file:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFiles = files.filter((f) => f.category === selectedCategory);

  const saveProduct = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchProducts();
        setIsAddingProduct(false);
        setSelectedProduct(data.product); // Use the product from API response which has the ID
        setEditingProduct(emptyProduct);
      }
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchProducts();
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const addBenefit = () => {
    setEditingProduct({
      ...editingProduct,
      keyBenefits: [...editingProduct.keyBenefits, ""],
    });
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...editingProduct.keyBenefits];
    newBenefits[index] = value;
    setEditingProduct({ ...editingProduct, keyBenefits: newBenefits });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = editingProduct.keyBenefits.filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, keyBenefits: newBenefits });
  };

  const addClaim = () => {
    setEditingProduct({
      ...editingProduct,
      claims: [...(editingProduct.claims || []), ""],
    });
  };

  const updateClaim = (index: number, value: string) => {
    const newClaims = [...(editingProduct.claims || [])];
    newClaims[index] = value;
    setEditingProduct({ ...editingProduct, claims: newClaims });
  };

  const removeClaim = (index: number) => {
    const newClaims = (editingProduct.claims || []).filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, claims: newClaims });
  };

  const addAvailability = () => {
    setEditingProduct({
      ...editingProduct,
      availability: [...(editingProduct.availability || []), ""],
    });
  };

  const updateAvailability = (index: number, value: string) => {
    const newAvail = [...(editingProduct.availability || [])];
    newAvail[index] = value;
    setEditingProduct({ ...editingProduct, availability: newAvail });
  };

  const removeAvailability = (index: number) => {
    const newAvail = (editingProduct.availability || []).filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, availability: newAvail });
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded border border-[var(--card-border)] flex items-center justify-center">
                <span className="text-[var(--foreground)] text-xs font-semibold">JR</span>
              </div>
              <span className="font-medium text-[var(--foreground)]">Copy Studio</span>
            </a>
            <span className="text-[var(--card-border)] mx-2">/</span>
            <span className="text-[var(--muted)]">Training Data</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Back to Generator
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-light text-[var(--foreground)] mb-2">
            <span className="font-semibold">Training</span> Data
          </h1>
          <p className="text-[var(--muted)] mt-3 max-w-lg mx-auto">
            View and edit the data that trains the AI. Changes take effect immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Categories */}
          <div className="lg:col-span-2 space-y-2">
            <label className="floating-label mb-3 block">Categories</label>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedFile(null);
                  setSelectedProduct(null);
                  setIsAddingProduct(false);
                }}
                className={`w-full p-3 text-left rounded-lg cursor-pointer transition-all ${
                  selectedCategory === category.id
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted-dim)]"
                }`}
              >
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Middle - File List / Product List */}
          <div className="lg:col-span-3 space-y-2">
            <div className="flex justify-between items-center mb-3">
              <label className="floating-label">{selectedCategory === "products" ? "Products" : "Files"}</label>
              {selectedCategory === "products" && (
                <button
                  onClick={() => {
                    setIsAddingProduct(true);
                    setSelectedProduct(null);
                    setEditingProduct(emptyProduct);
                  }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="loading-shimmer h-14 rounded-lg"></div>
                ))}
              </div>
            ) : selectedCategory === "products" ? (
              products.length === 0 ? (
                <div className="text-[var(--muted-dim)] text-sm p-4 text-center">No products yet</div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsAddingProduct(false);
                      setSelectedFile(null);
                    }}
                    className={`w-full p-3 text-left rounded-lg cursor-pointer transition-all ${
                      selectedProduct?.id === product.id
                        ? "bg-[var(--card)] border border-[var(--muted-dim)]"
                        : "bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                    }`}
                  >
                    <div className="text-sm text-[var(--foreground)]">{product.name}</div>
                    <div className="text-xs text-[var(--muted-dim)] mt-0.5">{product.category} · {product.price}</div>
                  </button>
                ))
              )
            ) : filteredFiles.length === 0 ? (
              <div className="text-[var(--muted-dim)] text-sm p-4 text-center">No files in this category</div>
            ) : (
              filteredFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => fetchFileContent(file.path)}
                  className={`w-full p-3 text-left rounded-lg cursor-pointer transition-all ${
                    selectedFile?.path === file.path
                      ? "bg-[var(--card)] border border-[var(--muted-dim)]"
                      : "bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                  }`}
                >
                  <div className="text-sm text-[var(--foreground)] capitalize">
                    {file.name.replace(".md", "").replace(/-/g, " ")}
                  </div>
                  <div className="text-xs text-[var(--muted-dim)] mt-0.5 truncate">
                    {file.name}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right - Content Viewer/Editor */}
          <div className="lg:col-span-7">
            <div className="flex justify-between items-center mb-3">
              <label className="floating-label">
                {selectedCategory === "products"
                  ? isAddingProduct
                    ? "New Product"
                    : selectedProduct
                    ? "Product Details"
                    : "Select a product"
                  : selectedFile
                  ? isEditing
                    ? "Editing"
                    : "Preview"
                  : "Select a file"}
              </label>
              {selectedCategory === "products" && selectedProduct && !isAddingProduct && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsAddingProduct(true);
                      setEditingProduct(selectedProduct);
                    }}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(selectedProduct.id)}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
              {selectedCategory === "products" && isAddingProduct && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsAddingProduct(false);
                      setEditingProduct(emptyProduct);
                    }}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProduct}
                    disabled={isSaving || !editingProduct.name}
                    className="btn-primary text-xs px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save Product"}
                  </button>
                </div>
              )}
              {selectedCategory !== "products" && selectedFile && (
                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditContent(selectedFile.content);
                        }}
                        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveFile}
                        disabled={isSaving}
                        className="btn-primary text-xs px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="output-area rounded-lg min-h-[600px]">
              {selectedCategory === "products" ? (
                isAddingProduct ? (
                  <div className="p-6 space-y-4 overflow-auto max-h-[600px]">
                    {/* Section: Basic Info */}
                    <div className="border-b border-[var(--card-border)] pb-4 mb-4">
                      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Basic Info</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Product Name *</label>
                          <input
                            type="text"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            placeholder="e.g., The Eyeshadow Stick"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
                            <select
                              value={editingProduct.category}
                              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            >
                              <option value="Face">Face</option>
                              <option value="Eyes">Eyes</option>
                              <option value="Lips">Lips</option>
                              <option value="Cheeks">Cheeks</option>
                              <option value="Skincare">Skincare</option>
                              <option value="Body">Body</option>
                              <option value="Kits">Kits</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Launch Tier</label>
                            <select
                              value={editingProduct.launchTier || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, launchTier: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            >
                              <option value="">Select...</option>
                              <option value="1">Tier 1</option>
                              <option value="2">Tier 2</option>
                              <option value="3">Tier 3</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Launch Date</label>
                            <input
                              type="text"
                              value={editingProduct.launchDate || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, launchDate: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                              placeholder="e.g., February 10, 2026"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Price (USD)</label>
                            <input
                              type="text"
                              value={editingProduct.price}
                              onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                              placeholder="e.g., $32"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Weight / Size</label>
                            <input
                              type="text"
                              value={editingProduct.weight || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                              placeholder="e.g., 1.5g / 0.05oz"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Tagline</label>
                          <input
                            type="text"
                            value={editingProduct.tagline || ""}
                            onChange={(e) => setEditingProduct({ ...editingProduct, tagline: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            placeholder="e.g., Not-So-Basic Basics"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Messaging & Copy */}
                    <div className="border-b border-[var(--card-border)] pb-4 mb-4">
                      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Messaging & Copy</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">What It Is (Product Description)</label>
                          <textarea
                            value={editingProduct.description}
                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)] resize-none"
                            rows={3}
                            placeholder="The Eyeshadow Stick is a creamy, highly pigmented shadow that transforms without trying..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Why We Love It</label>
                          <textarea
                            value={editingProduct.whyWeLoveIt || ""}
                            onChange={(e) => setEditingProduct({ ...editingProduct, whyWeLoveIt: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)] resize-none"
                            rows={2}
                            placeholder="One stick, unlimited looks..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">How It&apos;s Different</label>
                          <textarea
                            value={editingProduct.howItsDifferent || ""}
                            onChange={(e) => setEditingProduct({ ...editingProduct, howItsDifferent: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)] resize-none"
                            rows={2}
                            placeholder="The secret is its formula..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Who It&apos;s For</label>
                          <textarea
                            value={editingProduct.whoItsFor || ""}
                            onChange={(e) => setEditingProduct({ ...editingProduct, whoItsFor: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)] resize-none"
                            rows={2}
                            placeholder="Even if you're someone who doesn't typically wear eyeshadow..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Best For (short)</label>
                          <input
                            type="text"
                            value={editingProduct.bestFor}
                            onChange={(e) => setEditingProduct({ ...editingProduct, bestFor: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            placeholder="e.g., Quick, effortless eye color"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Product Details */}
                    <div className="border-b border-[var(--card-border)] pb-4 mb-4">
                      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Product Details</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Finish</label>
                            <input
                              type="text"
                              value={editingProduct.finish || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, finish: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                              placeholder="e.g., Creamy, smooth, long-lasting"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--muted)] mb-1">Formula</label>
                            <input
                              type="text"
                              value={editingProduct.formula || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, formula: e.target.value })}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                              placeholder="e.g., Creamy matte stick formula"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Key Ingredients</label>
                          <input
                            type="text"
                            value={editingProduct.keyIngredients || ""}
                            onChange={(e) => setEditingProduct({ ...editingProduct, keyIngredients: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            placeholder="e.g., Vitamin E, Soybean Oil"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">How To Use / Application</label>
                          <textarea
                            value={editingProduct.howToUse || ""}
                            onChange={(e) => setEditingProduct({ ...editingProduct, howToUse: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)] resize-none"
                            rows={2}
                            placeholder="Apply directly to eyelids and blend using your fingertip..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Shades / Variants</label>
                          <input
                            type="text"
                            value={editingProduct.shades}
                            onChange={(e) => setEditingProduct({ ...editingProduct, shades: e.target.value })}
                            className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                            placeholder="e.g., Cream, Sand, Taupe, Toffee, Smokey Grey, Brown"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Claims & Benefits */}
                    <div className="border-b border-[var(--card-border)] pb-4 mb-4">
                      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Claims & Benefits</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Key Benefits</label>
                          {editingProduct.keyBenefits.map((benefit, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={benefit}
                                onChange={(e) => updateBenefit(index, e.target.value)}
                                className="flex-1 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                                placeholder="e.g., Buildable coverage"
                              />
                              {editingProduct.keyBenefits.length > 1 && (
                                <button
                                  onClick={() => removeBenefit(index)}
                                  className="p-3 text-[var(--muted-dim)] hover:text-red-400 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={addBenefit}
                            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors flex items-center gap-1 mt-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Benefit
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">Product Claims</label>
                          {(editingProduct.claims || [""]).map((claim, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={claim}
                                onChange={(e) => updateClaim(index, e.target.value)}
                                className="flex-1 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                                placeholder="e.g., Dermatologist tested"
                              />
                              {(editingProduct.claims || []).length > 1 && (
                                <button
                                  onClick={() => removeClaim(index)}
                                  className="p-3 text-[var(--muted-dim)] hover:text-red-400 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={addClaim}
                            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors flex items-center gap-1 mt-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Claim
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section: Availability */}
                    <div>
                      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Availability</h3>
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-1">Available At</label>
                        {(editingProduct.availability || [""]).map((loc, index) => (
                          <div key={index} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={loc}
                              onChange={(e) => updateAvailability(index, e.target.value)}
                              className="flex-1 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--muted-dim)]"
                              placeholder="e.g., JRB.com, All JRB Stores"
                            />
                            {(editingProduct.availability || []).length > 1 && (
                              <button
                                onClick={() => removeAvailability(index)}
                                className="p-3 text-[var(--muted-dim)] hover:text-red-400 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={addAvailability}
                          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors flex items-center gap-1 mt-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Location
                        </button>
                      </div>
                    </div>
                  </div>
                ) : selectedProduct ? (
                  <div className="p-6 overflow-auto max-h-[600px]">
                    <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">{selectedProduct.name}</h2>
                    <p className="text-sm text-[var(--muted)] mb-1">{selectedProduct.category} · {selectedProduct.price}</p>
                    {selectedProduct.tagline && (
                      <p className="text-sm italic text-[var(--muted-dim)] mb-4">&ldquo;{selectedProduct.tagline}&rdquo;</p>
                    )}
                    {(selectedProduct.launchTier || selectedProduct.launchDate) && (
                      <p className="text-xs text-[var(--muted-dim)] mb-6">
                        {selectedProduct.launchTier && `Tier ${selectedProduct.launchTier}`}
                        {selectedProduct.launchTier && selectedProduct.launchDate && " · "}
                        {selectedProduct.launchDate && `Launch: ${selectedProduct.launchDate}`}
                      </p>
                    )}

                    <div className="space-y-4">
                      {selectedProduct.description && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">What It Is</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.description}</p>
                        </div>
                      )}

                      {selectedProduct.whyWeLoveIt && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Why We Love It</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.whyWeLoveIt}</p>
                        </div>
                      )}

                      {selectedProduct.howItsDifferent && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">How It&apos;s Different</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.howItsDifferent}</p>
                        </div>
                      )}

                      {selectedProduct.whoItsFor && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Who It&apos;s For</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.whoItsFor}</p>
                        </div>
                      )}

                      {selectedProduct.keyBenefits && selectedProduct.keyBenefits.filter(b => b).length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Key Benefits</h3>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedProduct.keyBenefits.filter(b => b).map((benefit, index) => (
                              <li key={index} className="text-sm text-[var(--foreground)]">{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedProduct.claims && selectedProduct.claims.filter(c => c).length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Product Claims</h3>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedProduct.claims.filter(c => c).map((claim, index) => (
                              <li key={index} className="text-sm text-[var(--foreground)]">{claim}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {selectedProduct.finish && (
                          <div>
                            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Finish</h3>
                            <p className="text-sm text-[var(--foreground)]">{selectedProduct.finish}</p>
                          </div>
                        )}
                        {selectedProduct.formula && (
                          <div>
                            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Formula</h3>
                            <p className="text-sm text-[var(--foreground)]">{selectedProduct.formula}</p>
                          </div>
                        )}
                      </div>

                      {selectedProduct.keyIngredients && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Key Ingredients</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.keyIngredients}</p>
                        </div>
                      )}

                      {selectedProduct.howToUse && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">How To Use</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.howToUse}</p>
                        </div>
                      )}

                      {selectedProduct.shades && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Shades</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.shades}</p>
                        </div>
                      )}

                      {selectedProduct.bestFor && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Best For</h3>
                          <p className="text-sm text-[var(--foreground)]">{selectedProduct.bestFor}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {selectedProduct.weight && (
                          <div>
                            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Weight / Size</h3>
                            <p className="text-sm text-[var(--foreground)]">{selectedProduct.weight}</p>
                          </div>
                        )}
                      </div>

                      {selectedProduct.availability && selectedProduct.availability.filter(a => a).length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Available At</h3>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedProduct.availability.filter(a => a).map((loc, index) => (
                              <li key={index} className="text-sm text-[var(--foreground)]">{loc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[600px] text-center">
                    <div className="w-12 h-12 rounded-lg bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--muted-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-[var(--foreground)] font-medium">Select a product</p>
                    <p className="text-sm text-[var(--muted-dim)] mt-1">
                      Choose a product to view details or add a new one.
                    </p>
                  </div>
                )
              ) : selectedFile ? (
                isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[600px] p-6 font-mono text-sm text-[var(--foreground)] resize-none focus:outline-none rounded-lg bg-transparent"
                  />
                ) : (
                  <div className="p-6 overflow-auto max-h-[600px]">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--foreground)] leading-relaxed">
                      {selectedFile.content}
                    </pre>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-center">
                  <div className="w-12 h-12 rounded-lg bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--muted-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-[var(--foreground)] font-medium">Select a file</p>
                  <p className="text-sm text-[var(--muted-dim)] mt-1">
                    Choose a category and file to view or edit.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
