import { NextResponse } from "next/server";
import { parseGoogleAdsCsv } from "@/lib/csv-import";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const authUser = await getUserFromRequest(request);
  if (!authUser || authUser.role !== "account_manager") {
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

  if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
    return NextResponse.json(
      { error: "File must be a CSV" },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    let text: string;

    // Detect and decode UTF-16 LE (Google Ads Editor default)
    if (buffer.byteLength >= 2) {
      const view = new Uint8Array(buffer);
      // UTF-16 LE BOM: FF FE
      if (view[0] === 0xff && view[1] === 0xfe) {
        text = new TextDecoder("utf-16le").decode(buffer);
      } else {
        text = new TextDecoder("utf-8").decode(buffer);
      }
    } else {
      text = new TextDecoder("utf-8").decode(buffer);
    }

    const campaigns = parseGoogleAdsCsv(text);

    const counts = {
      campaigns: campaigns.length,
      adGroups: campaigns.reduce((sum, c) => sum + c.adGroups.length, 0),
      assetGroups: campaigns.reduce(
        (sum, c) =>
          sum + c.adGroups.reduce((s, ag) => s + ag.assetGroups.length, 0),
        0
      ),
    };

    return NextResponse.json({ campaigns, counts });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      {
        error: "Failed to parse CSV",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 422 }
    );
  }
}
