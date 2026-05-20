import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const USERS_COLL = process.env.COLLECTION_USERS ?? "ggads_users";
const ATTEMPTS_COLL = "ggads_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const db = await getDb();
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: check failed attempts
    const attemptDoc = await db.collection(ATTEMPTS_COLL).findOne({ email: normalizedEmail });
    if (attemptDoc) {
      const lockoutUntil = attemptDoc.firstAttemptAt
        ? new Date(attemptDoc.firstAttemptAt).getTime() + LOCKOUT_MS
        : 0;
      if (attemptDoc.count >= MAX_ATTEMPTS && Date.now() < lockoutUntil) {
        const retryAfter = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${retryAfter} minute(s).` },
          { status: 429 }
        );
      }
      // Reset if lockout expired
      if (Date.now() >= lockoutUntil) {
        await db.collection(ATTEMPTS_COLL).deleteOne({ email: normalizedEmail });
      }
    }

    const user = await db.collection(USERS_COLL).findOne({ email: normalizedEmail });

    if (!user || !(await compare(password, user.passwordHash))) {
      // Track failed attempt
      await db.collection(ATTEMPTS_COLL).updateOne(
        { email: normalizedEmail },
        {
          $inc: { count: 1 },
          $setOnInsert: { firstAttemptAt: new Date().toISOString() },
          $set: { lastAttemptAt: new Date().toISOString() },
        },
        { upsert: true }
      );
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Clear failed attempts on success
    await db.collection(ATTEMPTS_COLL).deleteOne({ email: normalizedEmail });

    // Update last login
    await db.collection(USERS_COLL).updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date().toISOString() }, $inc: { loginCount: 1 } }
    );

    const token = await new SignJWT({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      clientId: user.clientId || null,
      domain: user.domain || null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
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

    response.cookies.set("ggads_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
