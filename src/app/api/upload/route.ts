import { put } from "@vercel/blob";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
      { status: 400 }
    );
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Max 5MB" },
      { status: 400 }
    );
  }

  try {
    // Try Vercel Blob first (production)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(file.name, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    // Fallback: local filesystem (development)
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
