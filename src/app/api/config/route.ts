import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const config = await db.collection("ggads_config").findOne(
      { _id: "campaign_types" as any },
      { projection: { _id: 0 } }
    );
    return NextResponse.json(config || { types: {}, domains: [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
