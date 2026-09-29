"use client";

import { useEffect, useState } from "react";
import { PageBlocks } from "@/components/cms/page-blocks";
import { SiteFooter } from "@/components/site-footer";
import { newsDateForSlug } from "@/lib/cms/news-date";
import { getPublishedPage, loadPages } from "@/lib/cms/storage";
import type { CmsPage } from "@/lib/cms/types";

export function MissingPage() {
  return (
    <>
      <main className="cms-missing">
        <div>
          <h1>Sidan finns inte</h1>
          <p>Det finns ingen sida på den här sökvägen.</p>
          <div className="cms-missing-actions">
            <a className="btn btn-dark" href="/admin">
              Till admin
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function CmsRoute({ slug }: { slug: string }) {
  const [page, setPage] = useState<CmsPage | null | undefined>(undefined);
  const [publishedAt, setPublishedAt] = useState("");

  useEffect(() => {
    const found = getPublishedPage(slug);
    setPage(found);
    setPublishedAt(found ? newsDateForSlug(found.slug, loadPages()) : "");
    document.title = found ? `${found.title || found.slug} – Mindstreet` : "Mindstreet";
  }, [slug]);

  if (page === undefined) return null;

  if (!page) return <MissingPage />;

  return <PageBlocks page={page} publishedAt={publishedAt} />;
}
