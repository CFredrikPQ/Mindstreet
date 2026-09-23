import type { CmsLink, CmsPage } from "@/lib/cms/types";

const STORAGE_KEY = "mindstreet-cms-pages";
const RESERVED = new Set(["admin"]);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function loadPages(): CmsPage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(hydratePage).filter((page): page is CmsPage => page !== null);
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

export function getPublishedPage(slug: string): CmsPage | null {
  const page = getPage(slug);
  if (!page || !page.published) return null;
  return page;
}

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
}

export function slugifyTitle(input: string): string {
  return normalizeSlug(
    input
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-"),
  );
}

export function composeSlug(parentSlug: string | undefined, segment: string): string {
  const child = normalizeSlug(segment);
  const parent = parentSlug ? normalizeSlug(parentSlug) : "";
  if (!child) return parent;
  if (!parent) return child;
  return `${parent}/${child}`;
}

export function validateSlug(input: string, pages: CmsPage[]): string | null {
  const slug = normalizeSlug(input);

  if (!slug) return "Skriv en sökväg, till exempel /payments.";

  const parts = slug.split("/");
  if (parts.length > 2) {
    return "Sökvägen kan bara ha en undersida, till exempel /expertomraden/aml.";
  }
  if (parts.some((part) => !SEGMENT.test(part))) {
    return "Använd bara små bokstäver, siffror och bindestreck.";
  }
  if (RESERVED.has(parts[0])) return "Den sökvägen är upptagen.";
  if (pages.some((page) => page.slug === slug)) {
    return "Det finns redan en sida med den sökvägen.";
  }

  return null;
}

export function pageTitle(page: CmsPage): string {
  return page.title.trim() || page.slug;
}

export function rootPages(pages: CmsPage[]): CmsPage[] {
  return pages.filter((page) => !page.parentSlug);
}

export function orderedPages(pages: CmsPage[]): CmsPage[] {
  const children = new Map<string, CmsPage[]>();
  const roots: CmsPage[] = [];

  for (const page of pages) {
    if (page.parentSlug) {
      const list = children.get(page.parentSlug) ?? [];
      list.push(page);
      children.set(page.parentSlug, list);
    } else {
      roots.push(page);
    }
  }

  const result: CmsPage[] = [];
  const placed = new Set<string>();

  function walk(page: CmsPage) {
    result.push(page);
    placed.add(page.slug);
    for (const child of children.get(page.slug) ?? []) {
      walk(child);
    }
  }

  for (const root of roots) walk(root);
  for (const page of pages) {
    if (!placed.has(page.slug)) result.push(page);
  }

  return result;
}

function hydratePage(value: unknown): CmsPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Partial<CmsPage> & { slug?: unknown; blocks?: unknown };
  if (typeof page.slug !== "string" || !Array.isArray(page.blocks)) return null;

  const slug = page.slug;
  const parentFromSlug = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : undefined;

  return {
    slug,
    title: typeof page.title === "string" && page.title.trim() ? page.title : slug,
    parentSlug:
      typeof page.parentSlug === "string" && page.parentSlug ? page.parentSlug : parentFromSlug,
    published: page.published !== false,
    links: Array.isArray(page.links) ? page.links.filter(isCmsLink) : [],
    blocks: page.blocks,
  };
}

function isCmsLink(value: unknown): value is CmsLink {
  if (!value || typeof value !== "object") return false;
  const link = value as CmsLink;
  return typeof link.label === "string" && typeof link.href === "string";
}
