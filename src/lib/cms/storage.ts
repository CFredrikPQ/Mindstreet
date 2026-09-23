import type { CmsPage } from "@/lib/cms/types";

const STORAGE_KEY = "mindstreet-cms-pages";
const RESERVED = new Set(["admin"]);

export function loadPages(): CmsPage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCmsPage);
  } catch {
    return [];
  }
}

export function writePages(pages: CmsPage[]): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    return null;
  } catch {
    return "Kunde inte spara. Bilden är för stor för webbläsaren.";
  }
}

export function getPage(slug: string): CmsPage | null {
  return loadPages().find((page) => page.slug === slug) ?? null;
}

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "");
}

export function validateSlug(input: string, pages: CmsPage[]): string | null {
  const slug = normalizeSlug(input);

  if (!slug) return "Skriv en sökväg, till exempel /payments.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Använd bara små bokstäver, siffror och bindestreck.";
  }
  if (RESERVED.has(slug)) return "Den sökvägen är upptagen.";
  if (pages.some((page) => page.slug === slug)) {
    return "Det finns redan en sida med den sökvägen.";
  }

  return null;
}

function isCmsPage(value: unknown): value is CmsPage {
  if (!value || typeof value !== "object") return false;
  const page = value as CmsPage;
  return typeof page.slug === "string" && Array.isArray(page.blocks);
}
