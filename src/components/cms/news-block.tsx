"use client";

import { useState } from "react";
import { formatNewsDate } from "@/lib/cms/news-date";
import type { CmsCard } from "@/lib/cms/types";

export function NewsBlock({
  heading,
  items,
  preview = false,
  pageSize = 4,
}: {
  heading: string;
  items: CmsCard[];
  preview?: boolean;
  pageSize?: number;
}) {
  const shown = preview ? items : items.filter((item) => item.published !== false);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = shown.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const showPager = shown.length > pageSize;

  return (
    <section className="news">
      <div className="section-inner">
        {heading ? <h2>{heading}</h2> : null}
        <div className="news-grid">
          {visible.map((item) => (
            <article key={item.id}>
              <NewsCard item={item} draft={preview && item.published === false} />
            </article>
          ))}
        </div>
        {showPager ? (
          <div className="news-pager">
            {safePage > 0 ? (
              <button type="button" aria-label="Nyare nyheter" onClick={() => setPage(safePage - 1)}>
                <img src="/icons/arrow.svg" width={23} height={23} alt="" />
              </button>
            ) : null}
            {safePage < pageCount - 1 ? (
              <button
                type="button"
                className="is-older"
                aria-label="Äldre nyheter"
                onClick={() => setPage(safePage + 1)}
              >
                <img src="/icons/arrow.svg" width={23} height={23} alt="" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function NewsCard({ item, draft }: { item: CmsCard; draft: boolean }) {
  const href = item.href.trim();
  const photo = item.image ? (
    <img src={item.image} alt="" />
  ) : (
    <div className="news-photo-fallback" />
  );
  const title = item.heading ? <span className="news-card-title">{item.heading}</span> : null;
  const dateLabel = item.publishedAt ? formatNewsDate(item.publishedAt) : "";
  const date = dateLabel ? (
    <time className="news-card-date" dateTime={item.publishedAt}>
      {dateLabel}
    </time>
  ) : null;
  const badge = draft ? <span className="news-card-draft">Utkast</span> : null;

  if (!href) {
    return (
      <div className="news-card">
        {badge}
        {photo}
        {date}
        {title}
      </div>
    );
  }

  return (
    <a className="news-card" href={href}>
      {badge}
      {photo}
      {date}
      {title}
    </a>
  );
}
