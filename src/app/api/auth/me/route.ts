import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { jwtVerify } from "jose";
import { ObjectId } from "mongodb";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const USERS_COLL = process.env.COLLECTION_USERS ?? "ggads_users";

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const token = cookie.split("; ").find((c) => c.startsWith("ggads_token="))?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const db = await getDb();
    const user = await db.collection(USERS_COLL).findOne({ _id: new ObjectId(payload.sub) });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId || null,
        domain: user.domain || null,
        company: user.company || null,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
