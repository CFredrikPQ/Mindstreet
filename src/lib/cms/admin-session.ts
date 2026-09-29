import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mindstreet_admin";

export function adminSecret(): string | null {
  const secret = process.env.CMS_ADMIN_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

export function passwordsMatch(input: string, secret: string): boolean {
  const left = Buffer.from(input);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function isAdmin(): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false;
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value ?? "";
  return passwordsMatch(value, secret);
}
