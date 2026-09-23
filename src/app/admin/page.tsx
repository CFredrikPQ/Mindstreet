"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  SITE_HOST,
  blockLabel,
  createBlock,
  fieldsFor,
  library,
} from "@/lib/cms/library";
import { loadPages, normalizeSlug, validateSlug, writePages } from "@/lib/cms/storage";
import type { BlockType, CmsBlock, CmsPage } from "@/lib/cms/types";
import "./admin.css";

const MAX_IMAGE_BYTES = 1_000_000;

export default function AdminPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    const stored = loadPages();
    setPages(stored);
    setSelectedSlug(stored[0]?.slug ?? null);
    setReady(true);
    document.title = "Admin – Mindstreet";
  }, []);

  const selected = pages.find((page) => page.slug === selectedSlug) ?? null;
  const previewSlug = normalizeSlug(slugInput);

  function persist(updater: (current: CmsPage[]) => CmsPage[]) {
    const next = updater(pagesRef.current);
    const error = writePages(next);
    if (error) {
      setNotice(error);
      return false;
    }
    pagesRef.current = next;
    setPages(next);
    setNotice(null);
    return true;
  }

  function createPage(event: FormEvent) {
    event.preventDefault();
    const error = validateSlug(slugInput, pagesRef.current);
    if (error) {
      setNotice(error);
      return;
    }

    const page: CmsPage = { slug: normalizeSlug(slugInput), blocks: [] };
    const saved = persist((current) => [...current, page]);
    if (!saved) return;
    setSelectedSlug(page.slug);
    setCreating(false);
    setSlugInput("");
  }

  function removePage(slug: string) {
    const confirmed = window.confirm(`Ta bort ${SITE_HOST}/${slug}?`);
    if (!confirmed) return;
    const saved = persist((current) => current.filter((page) => page.slug !== slug));
    if (!saved) return;
    setSelectedSlug((current) => {
      if (current !== slug) return current;
      return pagesRef.current[0]?.slug ?? null;
    });
  }

  function addBlock(type: BlockType) {
    if (!selected) return;
    const block = createBlock(type);
    persist((current) =>
      current.map((page) =>
        page.slug === selected.slug ? { ...page, blocks: [...page.blocks, block] } : page,
      ),
    );
  }

  function updateBlock(id: string, patch: Partial<CmsBlock>) {
    if (!selected) return;
    persist((current) =>
      current.map((page) =>
        page.slug === selected.slug
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === id ? { ...block, ...patch } : block,
              ),
            }
          : page,
      ),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    if (!selected) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.blocks.length) return;
    persist((current) =>
      current.map((page) => {
        if (page.slug !== selected.slug) return page;
        const blocks = [...page.blocks];
        const [item] = blocks.splice(index, 1);
        blocks.splice(nextIndex, 0, item);
        return { ...page, blocks };
      }),
    );
  }

  function removeBlock(id: string) {
    if (!selected) return;
    persist((current) =>
      current.map((page) =>
        page.slug === selected.slug
          ? { ...page, blocks: page.blocks.filter((block) => block.id !== id) }
          : page,
      ),
    );
  }

  function onImage(id: string, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Välj en bildfil.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice("Bilden får vara högst 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateBlock(id, { image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <div>
          <p className="admin-kicker">Mindstreet</p>
          <h1>Admin</h1>
        </div>
        <a href="/">Till webbplatsen</a>
      </header>

      {notice ? <p className="admin-notice">{notice}</p> : null}

      <div className="admin-shell">
        <aside className="admin-pages">
          <button
            type="button"
            className="admin-primary"
            onClick={() => {
              setCreating(true);
              setNotice(null);
            }}
          >
            Skapa ny sida
          </button>

          {creating ? (
            <form className="admin-create" onSubmit={createPage}>
              <label htmlFor="page-slug">Sökväg</label>
              <div className="admin-url">
                <span>{SITE_HOST}</span>
                <input
                  id="page-slug"
                  value={slugInput}
                  onChange={(event) => setSlugInput(event.target.value)}
                  placeholder="/payments"
                  autoFocus
                />
              </div>
              <p className="admin-preview">
                {previewSlug ? `${SITE_HOST}/${previewSlug}` : `${SITE_HOST}/`}
              </p>
              <div className="admin-create-actions">
                <button type="submit" className="admin-primary">
                  Skapa
                </button>
                <button
                  type="button"
                  className="admin-quiet"
                  onClick={() => {
                    setCreating(false);
                    setSlugInput("");
                    setNotice(null);
                  }}
                >
                  Avbryt
                </button>
              </div>
            </form>
          ) : null}

          <ul className="admin-page-list">
            {ready && pages.length === 0 ? <li className="admin-empty">Inga sidor ännu.</li> : null}
            {pages.map((page) => (
              <li key={page.slug}>
                <button
                  type="button"
                  className={page.slug === selectedSlug ? "is-selected" : undefined}
                  onClick={() => {
                    setSelectedSlug(page.slug);
                    setNotice(null);
                  }}
                >
                  <span>{page.slug}</span>
                  <small>
                    {SITE_HOST}/{page.slug}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="admin-main">
          {selected ? (
            <>
              <div className="admin-main-head">
                <div>
                  <p className="admin-kicker">Sida</p>
                  <h2>
                    {SITE_HOST}/{selected.slug}
                  </h2>
                </div>
                <div className="admin-main-actions">
                  <a className="admin-primary" href={`/${selected.slug}`} target="_blank" rel="noreferrer">
                    Öppna sida
                  </a>
                  <button type="button" className="admin-quiet" onClick={() => removePage(selected.slug)}>
                    Ta bort sida
                  </button>
                </div>
              </div>

              <div className="admin-builder">
                <section className="admin-library" aria-label="Komponentbibliotek">
                  <h3>Bibliotek</h3>
                  <ul>
                    {library.map((item) => (
                      <li key={item.type}>
                        <button type="button" onClick={() => addBlock(item.type)}>
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="admin-canvas" aria-label="Sidans block">
                  <h3>Sidan</h3>
                  {selected.blocks.length === 0 ? (
                    <p className="admin-empty">Lägg till ett block från biblioteket.</p>
                  ) : (
                    <ol>
                      {selected.blocks.map((block, index) => {
                        const fields = fieldsFor(block.type);
                        return (
                          <li key={block.id}>
                            <div className="admin-block-head">
                              <strong>{blockLabel(block.type)}</strong>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => moveBlock(index, -1)}
                                  disabled={index === 0}
                                >
                                  Upp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveBlock(index, 1)}
                                  disabled={index === selected.blocks.length - 1}
                                >
                                  Ner
                                </button>
                                <button type="button" onClick={() => removeBlock(block.id)}>
                                  Ta bort
                                </button>
                              </div>
                            </div>
                            <label>
                              {fields.heading}
                              <input
                                value={block.heading}
                                onChange={(event) =>
                                  updateBlock(block.id, { heading: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              {fields.body}
                              <textarea
                                rows={block.type === "banner" ? 2 : 5}
                                value={block.body}
                                onChange={(event) =>
                                  updateBlock(block.id, { body: event.target.value })
                                }
                              />
                            </label>
                            {fields.image ? (
                              <div className="admin-image">
                                {block.image ? (
                                  <img src={block.image} alt="" />
                                ) : (
                                  <p>Ingen bakgrundsbild vald.</p>
                                )}
                                <div>
                                  <label className="admin-file">
                                    {block.image ? "Byt bild" : "Välj bild"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) => {
                                        onImage(block.id, event.target.files?.[0]);
                                        event.target.value = "";
                                      }}
                                    />
                                  </label>
                                  {block.image ? (
                                    <button
                                      type="button"
                                      onClick={() => updateBlock(block.id, { image: undefined })}
                                    >
                                      Ta bort bild
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="admin-placeholder">
              <h2>Välj eller skapa en sida</h2>
              <p>
                En ny sida får adressen {SITE_HOST} och en egen sökväg, till exempel /payments.
                Sedan lägger du till block från biblioteket.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
