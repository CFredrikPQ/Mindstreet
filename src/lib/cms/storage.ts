import { seedPages } from "@/lib/cms/seed";
import type { CmsLink, CmsPage } from "@/lib/cms/types";

export type PageArchiveEntry = {
  id: string;
  slug: string;
  deletedAt: string;
  pages: CmsPage[];
};

export type ArchiveWriteResult = {
  next: CmsPage[] | null;
  archive: PageArchiveEntry[] | null;
  slug?: string;
  error: string | null;
};

const STORAGE_KEY = "mindstreet-cms-pages";
const ARCHIVE_KEY = "mindstreet-cms-page-archive";
const SEED_FLAG = "mindstreet-cms-seed-version";
const SEED_VERSION = "expertomraden-v1";
const RESERVED = new Set(["admin"]);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function loadPages(): CmsPage[] {
  if (typeof window === "undefined") return [];
  return mergeSeed(readStoredPages());
}

function readStoredPages(): CmsPage[] {
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

function mergeSeed(stored: CmsPage[]): CmsPage[] {
  try {
    if (window.localStorage.getItem(SEED_FLAG) === SEED_VERSION) {
      return stored;
    }
  } catch {
    return stored;
  }

  const existing = new Set(stored.map((page) => page.slug));
  const missing = seedPages.filter((page) => !existing.has(page.slug));
  const next = missing.length ? [...missing, ...stored] : stored;

  if (missing.length) {
    const error = writePages(next);
    if (error) return next;
  }

  try {
    window.localStorage.setItem(SEED_FLAG, SEED_VERSION);
  } catch {
    return next;
  }

  return next;
}

export function writePages(pages: CmsPage[]): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    return null;
  } catch {
    return "Kunde inte spara. Bilden är för stor för webbläsaren.";
  }
}

export function loadArchive(): PageArchiveEntry[] {
  if (typeof window === "undefined") return [];
  return readArchive();
}

export function pagesRemovedWith(slug: string, pages: CmsPage[]): CmsPage[] {
  const removed = new Set<string>([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const page of pages) {
      if (page.parentSlug && removed.has(page.parentSlug) && !removed.has(page.slug)) {
        removed.add(page.slug);
        grew = true;
      }
    }
  }
  return pages.filter((page) => removed.has(page.slug));
}

export function deletePagesToArchive(slug: string, pages: CmsPage[]): ArchiveWriteResult {
  const removed = pagesRemovedWith(slug, pages);
  if (!removed.some((page) => page.slug === slug)) {
    return { next: null, archive: null, error: "Sidan finns inte." };
  }

  const entry: PageArchiveEntry = {
    id: crypto.randomUUID(),
    slug,
    deletedAt: new Date().toISOString(),
    pages: removed,
  };
  const previous = readArchive();
  const archive = [entry, ...previous];
  const archiveError = writeArchive(archive);
  if (archiveError) {
    return { next: null, archive: null, error: archiveError };
  }

  const next = pages.filter((page) => !removed.some((item) => item.slug === page.slug));
  const pagesError = writePages(next);
  if (pagesError) {
    writeArchive(previous);
    return { next: null, archive: null, error: pagesError };
  }

  return { next, archive, error: null };
}

export function restoreArchivedPages(id: string, pages: CmsPage[]): ArchiveWriteResult {
  const previous = readArchive();
  const entry = previous.find((item) => item.id === id);
  if (!entry) {
    return { next: null, archive: null, error: "Arkivkopian finns inte." };
  }

  const conflict = entry.pages.find((page) => pages.some((live) => live.slug === page.slug));
  if (conflict) {
    return {
      next: null,
      archive: null,
      error: `Sökvägen /${conflict.slug} används redan, så sidan kan inte återställas.`,
    };
  }

  const next = [...pages, ...entry.pages];
  const pagesError = writePages(next);
  if (pagesError) {
    return { next: null, archive: null, error: pagesError };
  }

  const archive = previous.filter((item) => item.id !== id);
  const archiveError = writeArchive(archive);
  if (archiveError) {
    return {
      next,
      archive: previous,
      slug: entry.slug,
      error: "Sidan är återställd, men arkivkopian kunde inte rensas.",
    };
  }

  return { next, archive, slug: entry.slug, error: null };
}

function readArchive(): PageArchiveEntry[] {
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(hydrateArchiveEntry)
      .filter((entry): entry is PageArchiveEntry => entry !== null);
  } catch {
    return [];
  }
}

function writeArchive(entries: PageArchiveEntry[]): string | null {
  try {
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries));
    return null;
  } catch {
    return "Kunde inte spara arkivet. Sidan är kvar.";
  }
}

function hydrateArchiveEntry(value: unknown): PageArchiveEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<PageArchiveEntry>;
  if (typeof entry.id !== "string" || typeof entry.slug !== "string") return null;
  if (typeof entry.deletedAt !== "string" || !Array.isArray(entry.pages)) return null;
  const pages = entry.pages.map(hydratePage).filter((page): page is CmsPage => page !== null);
  if (!pages.some((page) => page.slug === entry.slug)) return null;
  return { id: entry.id, slug: entry.slug, deletedAt: entry.deletedAt, pages };
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
