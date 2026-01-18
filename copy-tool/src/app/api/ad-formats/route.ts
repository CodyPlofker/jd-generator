import { NextRequest, NextResponse } from "next/server";
import { put, list, head } from "@vercel/blob";
import { AdFormat } from "@/types/ad-format";

const FORMATS_BLOB_PATH = "ad-formats/ad-formats.json";

async function readFormats(): Promise<AdFormat[]> {
  try {
    // Check if blob exists
    const blobs = await list({ prefix: FORMATS_BLOB_PATH });
    if (blobs.blobs.length === 0) {
      // Try to load from bundled data as fallback
      try {
        const fs = await import("fs");
        const path = await import("path");
        const localPath = path.join(process.cwd(), "training-data/ad-formats/ad-formats.json");
        const data = fs.readFileSync(localPath, "utf-8");
        return JSON.parse(data);
      } catch {
        return [];
      }
    }

    // Fetch the blob content
    const blobInfo = blobs.blobs[0];
    const response = await fetch(blobInfo.url, { cache: "no-store" });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error reading formats from blob:", error);
    // Fallback to local file
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localPath = path.join(process.cwd(), "training-data/ad-formats/ad-formats.json");
      const data = fs.readFileSync(localPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}

async function writeFormats(formats: AdFormat[]): Promise<void> {
  const jsonContent = JSON.stringify(formats, null, 2);
  await put(FORMATS_BLOB_PATH, jsonContent, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET all formats
export async function GET() {
  const formats = await readFormats();
  return NextResponse.json(formats);
}

// POST new format
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, specs, thumbnail, sampleImages, category } = body;

    if (!name || !specs) {
      return NextResponse.json(
        { error: "Name and specs are required" },
        { status: 400 }
      );
    }

    const formats = await readFormats();

    const id = slugify(name) + "-" + Date.now().toString(36);

    const newFormat: AdFormat = {
      id,
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
      thumbnail: thumbnail || "",
      sampleImages: sampleImages || [],
      specs,
      category: category || "Other",
    };

    formats.push(newFormat);
    await writeFormats(formats);

    return NextResponse.json(newFormat, { status: 201 });
  } catch (error) {
    console.error("Error creating format:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create format: ${errorMessage}` },
      { status: 500 }
    );
  }
}
