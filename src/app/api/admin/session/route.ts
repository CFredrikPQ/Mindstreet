import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminSecret, passwordsMatch } from "@/lib/cms/admin-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = adminSecret();
  if (!secret) {
    return NextResponse.json({ error: "Adminlösenord är inte konfigurerat." }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const password =
    body && typeof body === "object" && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!passwordsMatch(password, secret)) {
    return NextResponse.json({ error: "Fel lösenord." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
