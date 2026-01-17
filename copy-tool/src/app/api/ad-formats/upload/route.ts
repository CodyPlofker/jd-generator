import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { image, formatId, filename } = await request.json();

    if (!image || !formatId) {
      return NextResponse.json(
        { error: "Image and formatId are required" },
        { status: 400 }
      );
    }

    // Extract base64 data and determine extension
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
    const imageData = matches[2];

    // Create format directory if it doesn't exist
    const formatDir = path.join(process.cwd(), "public/ad-formats", formatId);
    if (!fs.existsSync(formatDir)) {
      fs.mkdirSync(formatDir, { recursive: true });
    }

    // Generate filename
    const finalFilename = filename || `sample-${Date.now()}.${extension}`;
    const filePath = path.join(formatDir, finalFilename);

    // Write file
    const buffer = Buffer.from(imageData, "base64");
    fs.writeFileSync(filePath, buffer);

    // Return the public URL path
    const publicPath = `/ad-formats/${formatId}/${finalFilename}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      filename: finalFilename,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
