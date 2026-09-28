"use client";

import { useState } from "react";
import type { CmsCard } from "@/lib/cms/types";

const PAGE_SIZE = 4;

const months = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

function formatNewsDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;
}

export function NewsBlock({ heading, items }: { heading: string; items: CmsCard[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const showPager = items.length >= 5;

  return (
    <section className="news">
      <div className="section-inner">
        {heading ? <h2>{heading}</h2> : null}
        <div className="news-grid">
          {visible.map((item) => (
            <article key={item.id}>
              <NewsCard item={item} />
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

function NewsCard({ item }: { item: CmsCard }) {
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

  if (!href) {
    return (
      <div className="news-card">
        {photo}
        {date}
        {title}
      </div>
    );
  }

  return (
    <a className="news-card" href={href}>
      {photo}
      {date}
      {title}
    </a>
  );
}
