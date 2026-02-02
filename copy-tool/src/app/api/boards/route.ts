import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { BriefBoard } from "@/types/brief";

const BOARDS_PREFIX = "boards/";

// GET all boards (list)
export async function GET() {
  try {
    const { blobs } = await list({ prefix: BOARDS_PREFIX });

    // Group blobs by board base name (e.g. board-123.json) and pick the newest
    const latestBlobsMap = new Map<string, typeof blobs[0]>();
    
    blobs.forEach(blob => {
      // Extract base ID part (boards/board-timestamp.json)
      const parts = blob.pathname.split('-');
      // Case where it might not have a suffix yet or has multiple hyphens
      // We assume format "boards/board-ID-RANDOM.json" or "boards/board-ID.json"
      // More reliably: the board ID is usually board-timestamp-random
      // Let's use the first two parts of board-XXX-YYY-random.json
      const match = blob.pathname.match(/(boards\/board-[^\-]+-[^\.\-]+)/);
      const baseName = match ? match[1] : blob.pathname.split('.')[0];
      
      const current = latestBlobsMap.get(baseName);
      if (!current || blob.uploadedAt > current.uploadedAt) {
        latestBlobsMap.set(baseName, blob);
      }
    });

    const latestBlobs = Array.from(latestBlobsMap.values());
    const boards: BriefBoard[] = [];
    
    for (const blob of latestBlobs) {
      try {
        const response = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
        const board = await response.json();
        boards.push(board);
      } catch (e) {
        console.error("Error fetching board:", blob.pathname, e);
      }
    }

    // Sort by most recently updated
    boards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Error listing boards:", error);
    return NextResponse.json({ error: "Failed to list boards" }, { status: 500 });
  }
}

// POST create new board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure required fields
    if (!body.name || !body.briefs || !body.persona) {
      return NextResponse.json({ error: "Missing required fields: name, briefs, persona" }, { status: 400 });
    }

    // Generate ID if not provided
    const boardId = body.id || `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Build the board object
    const board: BriefBoard = {
      id: boardId,
      name: body.name,
      persona: body.persona,
      briefs: body.briefs.map((brief: { id: string; boardId?: string }) => ({
        ...brief,
        boardId: boardId,
      })),
      designers: body.designers || [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to blob storage with a random suffix for cache invalidation
    const blob = await put(
      `${BOARDS_PREFIX}${board.id}.json`,
      JSON.stringify(board),
      { access: "public", contentType: "application/json", addRandomSuffix: true }
    );

    return NextResponse.json({ ...board, url: blob.url });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}
