import { del, head, list, put } from "@vercel/blob";
import { unstable_noStore as noStore } from "next/cache";
import { hydrateState, seedState, serializeState, type CmsState } from "@/lib/cms/storage";

function storeKey(): string {
  const key = process.env.CMS_STATE_KEY;
  if (!key) throw new Error("CMS_STATE_KEY saknas.");
  return key;
}

function versionPrefix(): string {
  return `cms/${storeKey()}/v/`;
}

function legacyPath(): string {
  return `cms/${storeKey()}/state.json`;
}

export type StoredCms = {
  state: CmsState;
  etag: string | null;
  empty: boolean;
};

async function readBlobJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json();
}

export async function readCmsState(): Promise<StoredCms> {
  noStore();
  const listed = await list({ prefix: versionPrefix(), limit: 100 });
  const latest = listed.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  if (latest) {
    const json = await readBlobJson(latest.url);
    if (json) return { state: hydrateState(json), etag: latest.pathname, empty: false };
  }

  try {
    const legacy = await head(legacyPath());
    const json = await readBlobJson(legacy.url);
    if (json) return { state: hydrateState(json), etag: legacy.pathname, empty: false };
  } catch {
    // No document has been saved yet.
  }

  return { state: seedState(), etag: null, empty: true };
}

export async function writeCmsState(state: CmsState): Promise<string> {
  const pathname = `${versionPrefix()}${Date.now()}.json`;
  const blob = await put(pathname, JSON.stringify(serializeState(state)), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  const listed = await list({ prefix: versionPrefix(), limit: 100 });
  const stale = listed.blobs.filter((item) => item.pathname !== blob.pathname).map((item) => item.url);
  if (stale.length) {
    await del(stale).catch(() => undefined);
  }

  return blob.pathname;
}
