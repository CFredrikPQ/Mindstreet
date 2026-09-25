"use client";

import { useState } from "react";
import type { CmsCard } from "@/lib/cms/types";

export function OfferingBlock({ heading, items }: { heading: string; items: CmsCard[] }) {
  const [openId, setOpenId] = useState("");

  return (
    <section className="offering">
      <div className="section-inner">
        {heading ? <h2>{heading}</h2> : null}
        <div className="offering-list">
          {items.map((item) => {
            const isOpen = openId === item.id;
            const panelId = `offering-${item.id}`;
            const href = item.href.trim();
            return (
              <article key={item.id} className={isOpen ? "is-open" : undefined}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId(isOpen ? "" : item.id)}
                  >
                    <span>{item.heading}</span>
                    <span className="plus" aria-hidden="true" />
                  </button>
                </h3>
                {isOpen ? (
                  <div className="offering-body" id={panelId}>
                    {item.body ? <p>{item.body}</p> : null}
                    {href ? (
                      <a className="btn btn-dark" href={href}>
                        {item.buttonLabel || item.heading}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
