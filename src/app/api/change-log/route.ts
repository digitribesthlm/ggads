import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

const COLL = process.env.COLLECTION_CHANGE_LOG ?? "ggads_change_log";

export async function GET(request: Request) {
  const authUser = await getUserFromRequest(request);
  if (!authUser || authUser.role !== "account_manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const entries = await db.collection(COLL).find().sort({ timestamp: -1 }).toArray();
    return NextResponse.json(entries);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
