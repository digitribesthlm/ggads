import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

const COLL = process.env.COLLECTION_CREATIVE_REQUESTS ?? "ggads_creative_requests";

export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request);
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const domainParam = searchParams.get("domain");

    const filter: Record<string, any> = {};

    // Clients see only their own requests
    if (authUser && authUser.role === "client" && authUser.clientId) {
      filter.clientId = authUser.clientId;
    }

    // Domain filter: client users are auto-scoped to their domain;
    // account managers can optionally filter by ?domain=
    if (domainParam) {
      filter.domain = domainParam;
    } else if (authUser && authUser.role === "client" && authUser.domain) {
      filter.domain = authUser.domain;
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

    // Log the submission
    const logColl = process.env.COLLECTION_CHANGE_LOG ?? "ggads_change_log";
    await db.collection(logColl).insertOne({
      requestId: result.insertedId.toString(),
      campaignId: doc.campaignId || "",
      campaignName: doc.campaignName || "",
      domain: doc.domain || "",
      clientId: doc.clientId || "",
      actor: doc.submittedBy || "client",
      actorEmail: doc.submittedBy || "",
      action: "submitted",
      timestamp: new Date().toISOString(),
      summary: `Submitted — Request #${result.insertedId}`,
    });

    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
