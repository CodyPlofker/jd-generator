import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { AdFormat } from "@/types/ad-format";

const FORMATS_BLOB_PATH = "ad-formats/ad-formats.json";

async function readFormats(): Promise<AdFormat[]> {
  try {
    const blobs = await list({ prefix: FORMATS_BLOB_PATH });
    if (blobs.blobs.length === 0) {
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

    const blobInfo = blobs.blobs[0];
    const response = await fetch(blobInfo.url, { cache: "no-store" });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error reading formats:", error);
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

// GET single format
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formats = await readFormats();
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
    const formats = await readFormats();
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

    await writeFormats(formats);
    return NextResponse.json(formats[index]);
  } catch (error) {
    console.error("Error updating format:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update format: ${errorMessage}` },
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
    const formats = await readFormats();
    const index = formats.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Format not found" }, { status: 404 });
    }

    // Delete associated images from blob storage
    const format = formats[index];
    const imagesToDelete: string[] = [];

    if (format.thumbnail && format.thumbnail.includes("blob.vercel-storage.com")) {
      imagesToDelete.push(format.thumbnail);
    }

    for (const img of format.sampleImages) {
      if (img.includes("blob.vercel-storage.com")) {
        imagesToDelete.push(img);
      }
    }

    // Delete blobs
    for (const url of imagesToDelete) {
      try {
        await del(url);
      } catch (e) {
        console.error("Error deleting blob:", e);
      }
    }

    formats.splice(index, 1);
    await writeFormats(formats);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting format:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete format: ${errorMessage}` },
      { status: 500 }
    );
  }
}
