import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

const USERS_COLL = process.env.COLLECTION_USERS ?? "ggads_users";

export async function GET(request: Request) {
  const auth = await getUserFromRequest(request);
  if (!auth || auth.role !== "account_manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const users = await db.collection(USERS_COLL)
    .find({}, { projection: { passwordHash: 0 } })
    .toArray();

  return NextResponse.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      clientId: u.clientId || null,
      domain: u.domain || null,
      company: u.company || null,
      inviteSentAt: u.inviteSentAt || null,
      lastLoginAt: u.lastLoginAt || null,
      loginCount: u.loginCount || 0,
      createdAt: u.createdAt || null,
    })),
  });
}
