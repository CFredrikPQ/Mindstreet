import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);

export const dynamic = "force-dynamic";

export async function GET() {
  const directory = path.join(process.cwd(), "public", "images");

  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const images = entries
      .filter((entry) => entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => `/images/${entry.name}`)
      .sort((a, b) => a.localeCompare(b, "sv"));

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [], error: "Kunde inte läsa bildbiblioteket." }, { status: 500 });
  }
}
