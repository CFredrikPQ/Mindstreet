"use client";

import { useEffect, useState } from "react";
import { PageBlocks } from "@/components/cms/page-blocks";
import { getPage } from "@/lib/cms/storage";
import type { CmsPage } from "@/lib/cms/types";

export function CmsRoute({ slug }: { slug: string }) {
  const [page, setPage] = useState<CmsPage | null | undefined>(undefined);

  useEffect(() => {
    const found = getPage(slug);
    setPage(found);
    document.title = found ? `${found.slug} – Mindstreet` : "Mindstreet";
  }, [slug]);

  if (page === undefined) return null;

  if (!page) {
    return (
      <main className="cms-missing">
        <div>
          <h1>Sidan finns inte</h1>
          <p>Det finns ingen sida på den här sökvägen.</p>
          <div className="cms-missing-actions">
            <a className="btn btn-dark" href="/">
              Till startsidan
            </a>
            <a className="btn btn-dark" href="/admin">
              Till admin
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <PageBlocks page={page} />;
}
