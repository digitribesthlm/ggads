import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface AuthUser {
  sub: string;
  email: string;
  role: "client" | "account_manager";
  clientId?: string | null;
  domain?: string | null;
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  try {
    const cookie = request.headers.get("cookie") || "";
    const token = cookie.split("; ").find((c) => c.startsWith("ggads_token="))?.split("=")[1];
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) return null;
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}
