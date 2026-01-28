import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TRAINING_DATA_DIR = path.join(process.cwd(), "training-data");

function getFilesRecursively(dir: string, category: string): { name: string; path: string; category: string }[] {
  const files: { name: string; path: string; category: string }[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile() && (item.endsWith(".md") || item.endsWith(".json"))) {
      files.push({
        name: item,
        path: fullPath.replace(process.cwd() + "/", ""),
        category,
      });
    }
  }

  return files;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get("path");

  // If a specific file is requested, return its content
  if (filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");
      return NextResponse.json({ content });
    } catch (error) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // Otherwise, return list of all files
  const categories = ["brand-voice", "brand", "personas", "frameworks", "channels", "performance", "reviews", "products", "compliance", "hooks"];
  const allFiles: { name: string; path: string; category: string }[] = [];

  for (const category of categories) {
    const categoryDir = path.join(TRAINING_DATA_DIR, category);
    const files = getFilesRecursively(categoryDir, category);
    allFiles.push(...files);
  }

  return NextResponse.json({ files: allFiles });
}

export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content } = await request.json();

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), filePath);

    // Security check: ensure the path is within training-data
    if (!fullPath.startsWith(TRAINING_DATA_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    fs.writeFileSync(fullPath, content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
