"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HomeEditor } from "@/components/cms/home-editor";
import { LockedFooterNote } from "@/components/cms/locked-footer";
import { PageBlocks } from "@/components/cms/page-blocks";
import { HOME_SELECTION, defaultHomeContent, loadHome, writeHome, type HomeContent } from "@/lib/cms/home";
import {
  SITE_HOST,
  blockLabel,
  createBlock,
  fieldsFor,
  library,
  resolveTheme,
  themes,
} from "@/lib/cms/library";
import {
  composeSlug,
  deletePagesToArchive,
  loadArchive,
  loadPages,
  normalizeSlug,
  orderedPages,
  pagesRemovedWith,
  pageTitle,
  restoreArchivedPages,
  rootPages,
  slugifyTitle,
  validateSlug,
  writePages,
  type PageArchiveEntry,
} from "@/lib/cms/storage";
import type { BlockTheme, BlockType, CmsBlock, CmsLink, CmsPage } from "@/lib/cms/types";
import "./admin.css";

const MAX_IMAGE_BYTES = 1_000_000;
const PREVIEW_WIDTH = 1280;

type Panel = "pages" | "create" | "components";
type DraftLink = { id: string; label: string; href: string };
type DraftChild = { id: string; title: string; slug: string };

function newDraftLink(): DraftLink {
  return { id: crypto.randomUUID(), label: "", href: "" };
}

function newDraftChild(): DraftChild {
  return { id: crypto.randomUUID(), title: "", slug: "" };
}

const panels: { id: Panel; label: string }[] = [
  { id: "pages", label: "Sidor" },
  { id: "create", label: "Skapa sidor" },
  { id: "components", label: "Skapa komponenter" },
];

export default function AdminPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [home, setHome] = useState<HomeContent>(defaultHomeContent);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(HOME_SELECTION);
  const [panel, setPanel] = useState<Panel>("pages");
  const [slugInput, setSlugInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<CmsBlock[]>([]);
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  const [draftChildren, setDraftChildren] = useState<DraftChild[]>([]);
  const [published, setPublished] = useState(true);
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [archive, setArchive] = useState<PageArchiveEntry[]>([]);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    const stored = loadPages();
    setPages(stored);
    setArchive(loadArchive());
    setHome(loadHome());
    setSelectedSlug(HOME_SELECTION);
  }, []);

  const homeSelected = selectedSlug === HOME_SELECTION;
  const selected = homeSelected ? null : pages.find((page) => page.slug === selectedSlug) ?? null;
  const listedPages = orderedPages(pages);
  const pendingDelete = deleteSlug ? pages.find((page) => page.slug === deleteSlug) ?? null : null;
  const pendingRemoved = deleteSlug ? pagesRemovedWith(deleteSlug, pages) : [];
  const parents = rootPages(pages);
  const previewSlug = composeSlug(parentSlug || undefined, slugInput || slugifyTitle(titleInput));

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

  function persistHome(next: HomeContent) {
    const error = writeHome(next);
    if (error) {
      setNotice(error);
      return;
    }
    setHome(next);
    setNotice(null);
  }

  function resetCreateForm() {
    setTitleInput("");
    setSlugInput("");
    setParentSlug("");
    setDraftBlocks([]);
    setDraftLinks([]);
    setDraftChildren([]);
    setPublished(true);
  }

  function createPage(event: FormEvent) {
    event.preventDefault();
    const title = titleInput.trim();
    if (!title) {
      setNotice("Skriv ett sidnamn.");
      return;
    }

    const parent = parentSlug || undefined;
    const segment = normalizeSlug(slugInput) || slugifyTitle(title);
    const slug = composeSlug(parent, segment);
    const current = pagesRef.current;
    const slugError = validateSlug(slug, current);
    if (slugError) {
      setNotice(slugError);
      return;
    }

    if (parent && !current.some((page) => page.slug === parent)) {
      setNotice("Välj en befintlig förälder.");
      return;
    }

    const links: CmsLink[] = [];
    for (const row of draftLinks) {
      const label = row.label.trim();
      const href = row.href.trim();
      if (!label && !href) continue;
      if (!label || !href) {
        setNotice("Fyll i både länktext och adress, eller ta bort raden.");
        return;
      }
      links.push({ label, href });
    }

    const children: CmsPage[] = [];
    if (!parent) {
      const taken = new Set(current.map((page) => page.slug));
      taken.add(slug);
      for (const row of draftChildren) {
        const childTitle = row.title.trim();
        const childSegment = normalizeSlug(row.slug) || slugifyTitle(childTitle);
        if (!childTitle && !childSegment) continue;
        if (!childTitle) {
          setNotice("Skriv ett namn för varje undersida.");
          return;
        }
        const childSlug = composeSlug(slug, childSegment);
        const childError = validateSlug(childSlug, current);
        if (childError) {
          setNotice(`${childTitle}: ${childError}`);
          return;
        }
        if (taken.has(childSlug)) {
          setNotice("Undersidorna måste ha unika sökvägar.");
          return;
        }
        taken.add(childSlug);
        children.push({
          slug: childSlug,
          title: childTitle,
          parentSlug: slug,
          published,
          links: [],
          blocks: [],
        });
      }
    }

    const page: CmsPage = {
      slug,
      title,
      parentSlug: parent,
      published,
      links,
      blocks: draftBlocks,
    };
    const saved = persist((pages) => [...pages, page, ...children]);
    if (!saved) return;
    setSelectedSlug(page.slug);
    setLastSavedSlug(page.slug);
    resetCreateForm();
  }

  function togglePublished(slug: string) {
    persist((current) =>
      current.map((page) =>
        page.slug === slug ? { ...page, published: !page.published } : page,
      ),
    );
  }

  function openDelete(slug: string) {
    setDeleteSlug(slug);
    setDeleteInput("");
    setNotice(null);
  }

  function confirmDelete() {
    if (!deleteSlug) return;
    const address = `${SITE_HOST}/${deleteSlug}`;
    if (!addressMatches(deleteInput, address)) return;
    const result = deletePagesToArchive(deleteSlug, pagesRef.current);
    if (result.error || !result.next || !result.archive) {
      setNotice(result.error ?? "Kunde inte ta bort sidan.");
      return;
    }
    pagesRef.current = result.next;
    setPages(result.next);
    setArchive(result.archive);
    setDeleteSlug(null);
    setDeleteInput("");
    setSelectedSlug(HOME_SELECTION);
    setNotice("Sidan är borttagen och ligger kvar i arkivet.");
  }

  function restorePage(id: string) {
    const result = restoreArchivedPages(id, pagesRef.current);
    if (!result.next) {
      setNotice(result.error ?? "Kunde inte återställa sidan.");
      return;
    }
    pagesRef.current = result.next;
    setPages(result.next);
    if (result.archive) setArchive(result.archive);
    if (result.slug) setSelectedSlug(result.slug);
    setNotice(result.error ?? "Sidan är återställd.");
  }

  function addBlock(type: BlockType) {
    if (!selected) {
      setNotice("Välj en sida först.");
      return;
    }
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

  function onImage(id: string, file: File | undefined, field: "image" | "image2" = "image") {
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
        updateBlock(id, { [field]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="admin">
      <aside className="admin-rail" aria-label="Adminmeny">
        <MindstreetMark />
        <nav className="admin-nav" aria-label="Avsnitt">
          {panels.map((item) => (
            <button
              key={item.id}
              type="button"
              className={panel === item.id ? "is-active" : undefined}
              data-label={item.label}
              aria-label={item.label}
              aria-current={panel === item.id ? "page" : undefined}
              onClick={() => {
                setPanel(item.id);
                setNotice(null);
                if (item.id === "components" && selectedSlug === HOME_SELECTION) {
                  setSelectedSlug(pagesRef.current[0]?.slug ?? HOME_SELECTION);
                }
              }}
            >
              <RailIcon name={item.id} />
            </button>
          ))}
        </nav>
        <a className="admin-logout" href="/" data-label="Logga ut" aria-label="Logga ut">
          <RailIcon name="logout" />
        </a>
      </aside>

      <div className="admin-stage">
        {notice ? <p className="admin-notice">{notice}</p> : null}

        <main className="admin-main">
          {panel === "pages" ? (
              <div className="admin-pages-layout">
                <section aria-label="Befintliga sidor">
                  <p className="admin-kicker">Befintliga</p>
                  <h2 className="admin-title">Sidor</h2>
                  <ul className="admin-page-list">
                    <li>
                      <button
                        type="button"
                        className={homeSelected ? "is-selected" : undefined}
                        onClick={() => {
                          setSelectedSlug(HOME_SELECTION);
                          setNotice(null);
                        }}
                      >
                        <span>Startsida</span>
                        <small>{SITE_HOST}</small>
                      </button>
                    </li>
                    {listedPages.map((page) => (
                      <li key={page.slug} className={page.parentSlug ? "is-child" : undefined}>
                        <button
                          type="button"
                          className={page.slug === selectedSlug ? "is-selected" : undefined}
                          onClick={() => {
                            setSelectedSlug(page.slug);
                            setNotice(null);
                          }}
                        >
                          <span>{pageTitle(page)}</span>
                          <small>
                            {SITE_HOST}/{page.slug}
                            {page.published ? "" : " · Utkast"}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {archive.length > 0 ? (
                    <section className="admin-archive" aria-label="Borttagna sidor">
                      <h3>Borttagna sidor</h3>
                      <p>Kopian ligger kvar här tills sidan återställs.</p>
                      <ul>
                        {archive.map((entry) => {
                          const page =
                            entry.pages.find((item) => item.slug === entry.slug) ?? entry.pages[0];
                          return (
                            <li key={entry.id}>
                              <span>{pageTitle(page)}</span>
                              <small>
                                {SITE_HOST}/{page.slug}
                                {entry.pages.length > 1
                                  ? ` · ${entry.pages.length - 1} undersidor`
                                  : ""}
                              </small>
                              <small>{formatDeletedAt(entry.deletedAt)}</small>
                              <button type="button" className="admin-quiet" onClick={() => restorePage(entry.id)}>
                                Återställ
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null}
                </section>

                {homeSelected ? (
                  <section aria-label="Startsida">
                    <div className="admin-main-head">
                      <div>
                        <p className="admin-kicker">Sida</p>
                        <h2 className="admin-title">Startsida</h2>
                        <p className="admin-preview">{SITE_HOST}</p>
                      </div>
                      <div className="admin-main-actions">
                        <a className="admin-primary" href="/" target="_blank" rel="noreferrer">
                          Öppna sida
                        </a>
                      </div>
                    </div>
                    <HomeEditor content={home} onChange={persistHome} />
                  </section>
                ) : selected ? (
                  <section aria-label="Vald sida">
                    <div className="admin-main-head">
                      <div>
                        <p className="admin-kicker">Sida</p>
                        <h2 className="admin-title">{pageTitle(selected)}</h2>
                        <p className="admin-preview">
                          {SITE_HOST}/{selected.slug}
                        </p>
                      </div>
                      <div className="admin-main-actions">
                        <div className="admin-action-row">
                          <a
                            className="admin-primary"
                            href={`/${selected.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Öppna sida
                          </a>
                          <button
                            type="button"
                            className={
                              selected.published ? "admin-publish is-live" : "admin-publish"
                            }
                            aria-pressed={selected.published}
                            onClick={() => togglePublished(selected.slug)}
                          >
                            {selected.published ? "Publiserad" : "Ej publiserad"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <section className="admin-canvas" aria-label="Sidans block">
                      <h3>Sidan</h3>
                      {selected.blocks.length === 0 ? (
                        <p className="admin-empty">
                          Inga komponenter ännu. Lägg till ett block under Skapa komponenter.
                        </p>
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
                                {fields.theme ? (
                                  <ColorSwatch
                                    value={resolveTheme(block)}
                                    onChange={(theme) => updateBlock(block.id, { theme })}
                                  />
                                ) : null}
                                {fields.eyebrow ? (
                                  <label>
                                    Överrad
                                    <input
                                      value={block.eyebrow ?? ""}
                                      onChange={(event) =>
                                        updateBlock(block.id, { eyebrow: event.target.value })
                                      }
                                    />
                                  </label>
                                ) : null}
                                {fields.heading ? (
                                  <label>
                                    {fields.heading}
                                    {block.type === "lead" ? (
                                      <textarea
                                        rows={4}
                                        value={block.heading}
                                        onChange={(event) =>
                                          updateBlock(block.id, { heading: event.target.value })
                                        }
                                      />
                                    ) : (
                                      <input
                                        value={block.heading}
                                        onChange={(event) =>
                                          updateBlock(block.id, { heading: event.target.value })
                                        }
                                      />
                                    )}
                                  </label>
                                ) : null}
                                {fields.body ? (
                                  <label>
                                    {fields.body}
                                    <textarea
                                      rows={
                                        block.type === "banner" || block.type === "highlight" ? 2 : 5
                                      }
                                      value={block.body}
                                      onChange={(event) =>
                                        updateBlock(block.id, { body: event.target.value })
                                      }
                                    />
                                  </label>
                                ) : null}
                                {fields.button ? (
                                  <>
                                    <label>
                                      Knapp
                                      <input
                                        value={block.buttonLabel ?? ""}
                                        onChange={(event) =>
                                          updateBlock(block.id, { buttonLabel: event.target.value })
                                        }
                                      />
                                    </label>
                                    <label>
                                      Länk
                                      <input
                                        value={block.buttonHref ?? ""}
                                        onChange={(event) =>
                                          updateBlock(block.id, { buttonHref: event.target.value })
                                        }
                                      />
                                    </label>
                                  </>
                                ) : null}
                                {fields.imageSide || fields.align ? (
                                  <div className="admin-field-row">
                                    {fields.imageSide ? (
                                      <label>
                                        Bildsida
                                        <select
                                          value={block.imageSide ?? "left"}
                                          onChange={(event) =>
                                            updateBlock(block.id, {
                                              imageSide: event.target.value as CmsBlock["imageSide"],
                                            })
                                          }
                                        >
                                          <option value="left">Vänster</option>
                                          <option value="right">Höger</option>
                                        </select>
                                      </label>
                                    ) : null}
                                    {fields.align ? (
                                      <label>
                                        Justering
                                        <select
                                          value={block.align ?? "left"}
                                          onChange={(event) =>
                                            updateBlock(block.id, {
                                              align: event.target.value as CmsBlock["align"],
                                            })
                                          }
                                        >
                                          <option value="left">Vänster</option>
                                          <option value="center">Centrerad</option>
                                        </select>
                                      </label>
                                    ) : null}
                                  </div>
                                ) : null}
                                {fields.image ? (
                                  <ImageField
                                    src={block.image}
                                    emptyLabel="Ingen bild vald."
                                    chooseLabel={block.image ? "Byt bild" : "Välj bild"}
                                    onChoose={(file) => onImage(block.id, file, "image")}
                                    onClear={() => updateBlock(block.id, { image: undefined })}
                                  />
                                ) : null}
                                {fields.image2 ? (
                                  <ImageField
                                    src={block.image2}
                                    emptyLabel="Ingen andra bild vald."
                                    chooseLabel={block.image2 ? "Byt andra bilden" : "Välj andra bilden"}
                                    onChoose={(file) => onImage(block.id, file, "image2")}
                                    onClear={() => updateBlock(block.id, { image2: undefined })}
                                  />
                                ) : null}
                              </li>
                            );
                          })}
                        </ol>
                      )}
                      <LockedFooterNote />
                    </section>

                    <section className="admin-danger" aria-label="Ta bort sida">
                      <h3>Ta bort sidan</h3>
                      <p>
                        {pages.some((page) => page.parentSlug === selected.slug)
                          ? "Sidan och dess undersidor försvinner från webbplatsen. En kopia sparas under Borttagna sidor och kan återställas."
                          : "Sidan försvinner från webbplatsen. En kopia sparas under Borttagna sidor och kan återställas."}
                      </p>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => openDelete(selected.slug)}
                      >
                        Ta bort sida
                      </button>
                    </section>
                  </section>
                ) : null}
              </div>
          ) : null}

          {panel === "create" ? (
            <div className="admin-create-layout">
            <div className="admin-builder">
              <p className="admin-kicker">Ny sida</p>
              <h2 className="admin-title">Skapa sida</h2>
              <form onSubmit={createPage}>
                <section className="admin-card">
                  <div className="admin-card-head">
                    <h3>Sida</h3>
                  </div>
                  <div className="admin-card-body">
                    <label htmlFor="page-title">Sidnamn</label>
                    <input
                      id="page-title"
                      value={titleInput}
                      onChange={(event) => setTitleInput(event.target.value)}
                      placeholder="Våra expertområden"
                      autoFocus
                    />
                    <label htmlFor="page-slug">URL</label>
                    <div className="admin-url">
                      <span>
                        {SITE_HOST}
                        {parentSlug ? `/${parentSlug}` : ""}
                      </span>
                      <input
                        id="page-slug"
                        value={slugInput}
                        onChange={(event) => setSlugInput(event.target.value)}
                        placeholder="expertomraden"
                      />
                    </div>
                    <label htmlFor="page-parent">Förälder</label>
                    <select
                      id="page-parent"
                      value={parentSlug}
                      onChange={(event) => setParentSlug(event.target.value)}
                    >
                      <option value="">Ingen</option>
                      {parents.map((page) => (
                        <option key={page.slug} value={page.slug}>
                          {pageTitle(page)}
                        </option>
                      ))}
                    </select>
                    <p className="admin-preview">
                      {previewSlug ? `${SITE_HOST}/${previewSlug}` : `${SITE_HOST}/`}
                    </p>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card-head">
                    <h3>Innehåll</h3>
                  </div>
                  <div className="admin-card-body">
                    <BlockCatalog
                      onAdd={(type) =>
                        setDraftBlocks((current) => [...current, createBlock(type)])
                      }
                    />
                    {draftBlocks.length === 0 ? (
                      <p className="admin-empty">Inga komponenter ännu. Välj ett block ovan.</p>
                    ) : (
                      <ol className="admin-draft-list">
                        {draftBlocks.map((block, index) => (
                          <li key={block.id}>
                            <div className="admin-draft-main">
                              <strong>{blockLabel(block.type)}</strong>
                              <div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftBlocks((current) => {
                                      if (index === 0) return current;
                                      const next = [...current];
                                      const [item] = next.splice(index, 1);
                                      next.splice(index - 1, 0, item);
                                      return next;
                                    })
                                  }
                                  disabled={index === 0}
                                >
                                  Upp
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftBlocks((current) => {
                                      if (index === current.length - 1) return current;
                                      const next = [...current];
                                      const [item] = next.splice(index, 1);
                                      next.splice(index + 1, 0, item);
                                      return next;
                                    })
                                  }
                                  disabled={index === draftBlocks.length - 1}
                                >
                                  Ner
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftBlocks((current) =>
                                      current.filter((item) => item.id !== block.id),
                                    )
                                  }
                                >
                                  Ta bort
                                </button>
                              </div>
                            </div>
                            {fieldsFor(block.type).theme ? (
                              <ColorSwatch
                                value={resolveTheme(block)}
                                onChange={(theme) =>
                                  setDraftBlocks((current) =>
                                    current.map((item) =>
                                      item.id === block.id ? { ...item, theme } : item,
                                    ),
                                  )
                                }
                              />
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    )}
                    <LockedFooterNote />
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card-head">
                    <h3>Länkar</h3>
                  </div>
                  <div className="admin-card-body">
                    {draftLinks.length === 0 ? (
                      <p className="admin-empty">Inga länkar ännu.</p>
                    ) : (
                      draftLinks.map((row) => (
                        <div className="admin-row" key={row.id}>
                          <label>
                            Länktext
                            <input
                              value={row.label}
                              onChange={(event) =>
                                setDraftLinks((current) =>
                                  current.map((item) =>
                                    item.id === row.id
                                      ? { ...item, label: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="Läs mer"
                            />
                          </label>
                          <label>
                            Adress
                            <input
                              value={row.href}
                              onChange={(event) =>
                                setDraftLinks((current) =>
                                  current.map((item) =>
                                    item.id === row.id
                                      ? { ...item, href: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="/kontakt"
                            />
                          </label>
                          <button
                            type="button"
                            className="admin-quiet"
                            onClick={() =>
                              setDraftLinks((current) =>
                                current.filter((item) => item.id !== row.id),
                              )
                            }
                          >
                            Ta bort
                          </button>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      className="admin-quiet"
                      onClick={() => setDraftLinks((current) => [...current, newDraftLink()])}
                    >
                      Lägg till länk
                    </button>
                  </div>
                </section>

                {parentSlug ? null : (
                  <section className="admin-card">
                    <div className="admin-card-head">
                      <h3>Undersidor</h3>
                    </div>
                    <div className="admin-card-body">
                      {draftChildren.length === 0 ? (
                        <p className="admin-empty">Inga undersidor ännu.</p>
                      ) : (
                        draftChildren.map((row) => (
                          <div className="admin-row" key={row.id}>
                            <label>
                              Namn
                              <input
                                value={row.title}
                                onChange={(event) =>
                                  setDraftChildren((current) =>
                                    current.map((item) =>
                                      item.id === row.id
                                        ? { ...item, title: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="AML"
                              />
                            </label>
                            <label>
                              Sökväg
                              <input
                                value={row.slug}
                                onChange={(event) =>
                                  setDraftChildren((current) =>
                                    current.map((item) =>
                                      item.id === row.id
                                        ? { ...item, slug: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="aml"
                              />
                            </label>
                            <button
                              type="button"
                              className="admin-quiet"
                              onClick={() =>
                                setDraftChildren((current) =>
                                  current.filter((item) => item.id !== row.id),
                                )
                              }
                            >
                              Ta bort
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        type="button"
                        className="admin-quiet"
                        onClick={() =>
                          setDraftChildren((current) => [...current, newDraftChild()])
                        }
                      >
                        Lägg till undersida
                      </button>
                    </div>
                  </section>
                )}

                <section className="admin-card">
                  <div className="admin-card-head">
                    <h3>Spara</h3>
                  </div>
                  <div className="admin-card-body admin-save">
                    <label className="admin-check">
                      <input
                        type="checkbox"
                        checked={published}
                        onChange={(event) => setPublished(event.target.checked)}
                      />
                      Publicera
                    </label>
                    <div className="admin-create-actions">
                      <button type="submit" className="admin-primary">
                        Spara sida
                      </button>
                      {lastSavedSlug ? (
                        <a
                          className="admin-quiet"
                          href={`/${lastSavedSlug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Öppna sida
                        </a>
                      ) : null}
                    </div>
                  </div>
                </section>
              </form>
            </div>
            <PageMiniature
              url={previewSlug ? `${SITE_HOST}/${previewSlug}` : SITE_HOST}
              page={{
                slug: previewSlug || "ny-sida",
                title: titleInput.trim() || "Ny sida",
                parentSlug: parentSlug || undefined,
                published,
                links: draftLinks.flatMap((row) => {
                  const label = row.label.trim();
                  const href = row.href.trim();
                  return label && href ? [{ label, href }] : [];
                }),
                blocks: draftBlocks,
              }}
            />
            </div>
          ) : null}

          {panel === "components" ? (
            <div>
              <p className="admin-kicker">Bibliotek</p>
              <h2 className="admin-title">Skapa komponenter</h2>
              {pages.length === 0 ? (
                <p className="admin-empty">Skapa en sida först. Sedan kan du lägga till block.</p>
              ) : (
                <>
                  <label className="admin-pick">
                    Sida
                    <select
                      value={selectedSlug ?? ""}
                      onChange={(event) => {
                        setSelectedSlug(event.target.value || null);
                        setNotice(null);
                      }}
                    >
                      {listedPages.map((page) => (
                        <option key={page.slug} value={page.slug}>
                          {pageTitle(page)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <BlockCatalog onAdd={addBlock} />

                  {selected ? (
                    <div className="admin-on-page">
                      <h3>På {pageTitle(selected)}</h3>
                      {selected.blocks.length === 0 ? (
                        <p className="admin-empty">Inga komponenter på sidan ännu.</p>
                      ) : (
                        <ol>
                          {selected.blocks.map((block) => (
                            <li key={block.id}>
                              <strong>{blockLabel(block.type)}</strong>
                              <span>{block.heading}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <LockedFooterNote />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </main>
      </div>
      {pendingDelete ? (
        <DeletePageDialog
          title={pageTitle(pendingDelete)}
          address={`${SITE_HOST}/${pendingDelete.slug}`}
          childCount={Math.max(0, pendingRemoved.length - 1)}
          value={deleteInput}
          onChange={setDeleteInput}
          onCancel={() => {
            setDeleteSlug(null);
            setDeleteInput("");
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

function addressMatches(input: string, address: string) {
  const value = input.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return value === address;
}

function formatDeletedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function DeletePageDialog({
  title,
  address,
  childCount,
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  title: string;
  address: string;
  childCount: number;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = addressMatches(value, address);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-page-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches) onConfirm();
        }}
      >
        <h2 id="delete-page-title">Ta bort {title}?</h2>
        <p>
          Skriv <strong>{address}</strong> för att bekräfta.{" "}
          {childCount > 0
            ? `Sidan och ${childCount} ${childCount === 1 ? "undersida" : "undersidor"} tas bort från webbplatsen.`
            : "Sidan tas bort från webbplatsen."}{" "}
          Kopian sparas i arkivet.
        </p>
        <label>
          Adress
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={address}
          />
        </label>
        <div className="admin-modal-actions">
          <button type="button" className="admin-quiet" onClick={onCancel}>
            Avbryt
          </button>
          <button type="submit" className="admin-danger-button" disabled={!matches}>
            Ta bort sida
          </button>
        </div>
      </form>
    </div>
  );
}

function PageMiniature({ page, url }: { page: CmsPage; url: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(page.blocks.length);
  const [scale, setScale] = useState(0.32);
  const count = page.blocks.length;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      if (width > 0) setScale(width / PREVIEW_WIDTH);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (count > previousCount.current) {
      frame.scrollTo({ top: frame.scrollHeight, behavior: "smooth" });
    }
    previousCount.current = count;
  }, [count]);

  return (
    <aside className="admin-miniature" aria-label="Förhandsvisning av sidan">
      <div className="admin-miniature-label">
        <p className="admin-kicker">Förhandsvisning</p>
        <span>
          {count === 0
            ? "Footer"
            : `${count} komponent${count === 1 ? "" : "er"} och footer`}
        </span>
      </div>
      <div className="admin-miniature-window">
        <div className="admin-miniature-chrome">
          <i />
          <i />
          <i />
          <em>{url}</em>
        </div>
        <div
          className={count === 0 ? "admin-miniature-frame is-empty" : "admin-miniature-frame"}
          ref={frameRef}
        >
          <div
            className="admin-miniature-page"
            inert
            aria-hidden="true"
            style={{ width: PREVIEW_WIDTH, zoom: scale }}
          >
            <PageBlocks page={page} />
          </div>
          {count === 0 ? (
            <p className="admin-miniature-hint">
              Lägg till en komponent så byggs sidan upp här.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function BlockCatalog({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <section className="admin-library" aria-label="Komponentbibliotek">
      <ul>
        {library.map((item) => (
          <li key={item.type}>
            <button type="button" onClick={() => onAdd(item.type)}>
              <span className={`admin-thumb admin-thumb-${item.type}`} aria-hidden="true" />
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ColorSwatch({
  value,
  onChange,
}: {
  value: BlockTheme;
  onChange: (theme: BlockTheme) => void;
}) {
  return (
    <fieldset className="admin-swatches">
      <legend>Bakgrund</legend>
      <div>
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={value === theme.id ? "is-active" : undefined}
            style={{ background: theme.color }}
            aria-pressed={value === theme.id}
            aria-label={theme.label}
            title={theme.label}
            onClick={() => onChange(theme.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function ImageField({
  src,
  emptyLabel,
  chooseLabel,
  onChoose,
  onClear,
}: {
  src?: string;
  emptyLabel: string;
  chooseLabel: string;
  onChoose: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="admin-image">
      {src ? <img src={src} alt="" /> : <p>{emptyLabel}</p>}
      <div>
        <label className="admin-file">
          {chooseLabel}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              onChoose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {src ? (
          <button type="button" onClick={onClear}>
            Ta bort bild
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MindstreetMark() {
  return (
    <span className="admin-mark" role="img" aria-label="Mindstreet">
      <img src="/icons/logo-footer.svg" alt="" />
    </span>
  );
}

function RailIcon({ name }: { name: Panel | "logout" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "pages") {
    return (
      <svg {...props}>
        <path d="M8 6.5h9.5A1.5 1.5 0 0 1 19 8v11.5A1.5 1.5 0 0 1 17.5 21h-9A1.5 1.5 0 0 1 7 19.5V8A1.5 1.5 0 0 1 8.5 6.5H8Z" />
        <path d="M7 17.5H5.5A1.5 1.5 0 0 1 4 16V4.5A1.5 1.5 0 0 1 5.5 3H15" />
      </svg>
    );
  }

  if (name === "create") {
    return (
      <svg {...props}>
        <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14A1.5 1.5 0 0 0 7.5 20.5h9A1.5 1.5 0 0 0 18 19V8.5L14 3.5Z" />
        <path d="M14 3.5V8h4.2" />
        <path d="M12 11.5v5" />
        <path d="M9.5 14h5" />
      </svg>
    );
  }

  if (name === "components") {
    return (
      <svg {...props}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" />
      <path d="M10 12h9" />
      <path d="M16 8.5 19.5 12 16 15.5" />
    </svg>
  );
}
