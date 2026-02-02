import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { BriefBoard } from "@/types/brief";

const BOARDS_PREFIX = "boards/";

// GET single board by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}.json` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const response = await fetch(blobs[0].url, { cache: "no-store" });
    const board = await response.json();

    return NextResponse.json(board);
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}

// PUT update board
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates: Partial<BriefBoard> = await request.json();

    // Fetch existing board
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}.json` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const response = await fetch(blobs[0].url, { cache: "no-store" });
    const existingBoard: BriefBoard = await response.json();

    // Merge updates
    const updatedBoard: BriefBoard = {
      ...existingBoard,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    // Update unique designers list
    const designerSet = new Set<string>();
    updatedBoard.briefs.forEach((brief) => {
      if (brief.assignedTo) {
        designerSet.add(brief.assignedTo);
      }
    });
    updatedBoard.designers = Array.from(designerSet);

    // Save updated board
    const blob = await put(
      `${BOARDS_PREFIX}${id}.json`,
      JSON.stringify(updatedBoard),
      { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true }
    );

    return NextResponse.json({ ...updatedBoard, url: blob.url });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

// DELETE board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}.json` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    await del(blobs[0].url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}
