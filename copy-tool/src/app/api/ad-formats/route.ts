import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AdFormat } from "@/types/ad-format";

const AD_FORMATS_PATH = path.join(process.cwd(), "training-data/ad-formats/ad-formats.json");

function readFormats(): AdFormat[] {
  try {
    const data = fs.readFileSync(AD_FORMATS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeFormats(formats: AdFormat[]): void {
  fs.writeFileSync(AD_FORMATS_PATH, JSON.stringify(formats, null, 2));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET all formats
export async function GET() {
  const formats = readFormats();
  return NextResponse.json(formats);
}

// POST new format
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, specs, thumbnail, sampleImages } = body;

    if (!name || !specs) {
      return NextResponse.json(
        { error: "Name and specs are required" },
        { status: 400 }
      );
    }

    const formats = readFormats();

    const id = slugify(name) + "-" + Date.now().toString(36);

    const newFormat: AdFormat = {
      id,
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
      thumbnail: thumbnail || "",
      sampleImages: sampleImages || [],
      specs,
    };

    formats.push(newFormat);
    writeFormats(formats);

    return NextResponse.json(newFormat, { status: 201 });
  } catch (error) {
    console.error("Error creating format:", error);
    return NextResponse.json(
      { error: "Failed to create format" },
      { status: 500 }
    );
  }
}
