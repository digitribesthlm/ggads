import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

const COLL = process.env.COLLECTION_CREATIVE_REQUESTS ?? "ggads_creative_requests";

export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request);
    const db = await getDb();

    // Clients see only their own requests; account managers see all
    const filter: Record<string, any> = {};
    if (authUser && authUser.role === "client" && authUser.clientId) {
      filter.clientId = authUser.clientId;
    }

    const requests = await db.collection(COLL).find(filter).sort({ submittedAt: -1 }).toArray();
    return NextResponse.json(requests);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const doc = {
      ...body,
      status: "pending_review",
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection(COLL).insertOne(doc);
    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
