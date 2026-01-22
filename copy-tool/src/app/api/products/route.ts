import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

const PRODUCTS_PATH = path.join(process.cwd(), "training-data/products/products.json");

function loadProducts(): Product[] {
  const productsContent = fs.readFileSync(PRODUCTS_PATH, "utf-8");
  return JSON.parse(productsContent);
}

function saveProducts(products: Product[]): void {
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
}

export async function GET() {
  try {
    const products = loadProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error loading products:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newProduct: Product = await request.json();

    // Generate ID from name if not provided
    if (!newProduct.id) {
      newProduct.id = newProduct.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }

    const products = loadProducts();

    // Check if product with same ID already exists
    const existingIndex = products.findIndex(p => p.id === newProduct.id);
    if (existingIndex >= 0) {
      // Update existing product
      products[existingIndex] = newProduct;
    } else {
      // Add new product
      products.push(newProduct);
    }

    saveProducts(products);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Error saving product:", error);
    return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const products = loadProducts();
    const filteredProducts = products.filter(p => p.id !== id);

    if (filteredProducts.length === products.length) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    saveProducts(filteredProducts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
