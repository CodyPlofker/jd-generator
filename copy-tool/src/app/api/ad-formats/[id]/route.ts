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

// GET single format
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formats = readFormats();
  const format = formats.find((f) => f.id === id);

  if (!format) {
    return NextResponse.json({ error: "Format not found" }, { status: 404 });
  }

  return NextResponse.json(format);
}

// PUT update format
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const formats = readFormats();
    const index = formats.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Format not found" }, { status: 404 });
    }

    // Merge updates
    formats[index] = {
      ...formats[index],
      ...body,
      id: formats[index].id, // Don't allow ID change
      createdAt: formats[index].createdAt, // Preserve creation date
    };

    writeFormats(formats);
    return NextResponse.json(formats[index]);
  } catch (error) {
    console.error("Error updating format:", error);
    return NextResponse.json(
      { error: "Failed to update format" },
      { status: 500 }
    );
  }
}

// DELETE format
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formats = readFormats();
    const index = formats.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Format not found" }, { status: 404 });
    }

    // Optionally delete associated images
    const format = formats[index];
    const imagesDir = path.join(process.cwd(), "public/ad-formats", id);
    if (fs.existsSync(imagesDir)) {
      fs.rmSync(imagesDir, { recursive: true });
    }

    formats.splice(index, 1);
    writeFormats(formats);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting format:", error);
    return NextResponse.json(
      { error: "Failed to delete format" },
      { status: 500 }
    );
  }
}
