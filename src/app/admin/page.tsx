"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { HomeEditor } from "@/components/cms/home-editor";
import { applyInline } from "@/lib/cms/inline";
import { LockedFooterNote } from "@/components/cms/locked-footer";
import { PageBlocks } from "@/components/cms/page-blocks";
import { HomeView } from "@/components/home-view";
import { HOME_SELECTION, defaultHomeContent, loadHome, writeHome, type HomeContent } from "@/lib/cms/home";
import {
  SITE_HOST,
  articleParagraphs,
  blockLabel,
  cloneTemplateBlocks,
  createBlock,
  createCard,
  createOfferingRow,
  fieldsFor,
  library,
  quoteAfterIndex,
  resolveTheme,
  themes,
} from "@/lib/cms/library";
import {
  composeSlug,
  deletePagesToArchive,
  loadArchive,
  loadPages,
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
import type { BlockTheme, BlockType, CmsBlock, CmsCard, CmsPage } from "@/lib/cms/types";
import "./admin.css";

const PREVIEW_WIDTH = 1280;

let libraryImagesRequest: Promise<string[]> | null = null;

function loadLibraryImages() {
  if (!libraryImagesRequest) {
    libraryImagesRequest = fetch("/api/library-images")
      .then(async (response) => {
        if (!response.ok) throw new Error("Kunde inte läsa bildbiblioteket.");
        const data = (await response.json()) as { images?: string[] };
        return data.images ?? [];
      })
      .catch((error) => {
        libraryImagesRequest = null;
        throw error;
      });
  }
  return libraryImagesRequest;
}

type Panel = "pages" | "create" | "components";

const panels: { id: Panel; kicker: string; title: string }[] = [
  { id: "pages", kicker: "Befintliga", title: "Publicerade sidor" },
  { id: "create", kicker: "Ny sida", title: "Skapa ny sida av mall" },
  { id: "components", kicker: "Bibliotek", title: "Skapa ny sidmall utifrån komponenter" },
];

export default function AdminPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [home, setHome] = useState<HomeContent>(defaultHomeContent);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(HOME_SELECTION);
  const [panel, setPanel] = useState<Panel>("pages");
  const [titleInput, setTitleInput] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<CmsBlock[]>([]);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
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
  const templatePage = listedPages.find((page) => page.slug === templateSlug) ?? null;
  const pendingDelete = deleteSlug ? pages.find((page) => page.slug === deleteSlug) ?? null : null;
  const pendingRemoved = deleteSlug ? pagesRemovedWith(deleteSlug, pages) : [];
  const parents = rootPages(pages);
  const previewSlug = composeSlug(parentSlug || undefined, slugifyTitle(titleInput));

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
    setParentSlug("");
    setPublished(true);
    const template = pagesRef.current.find((page) => page.slug === templateSlug);
    setDraftBlocks(template ? cloneTemplateBlocks(template.blocks) : []);
  }

  function chooseTemplate(slug: string) {
    if (slug === templateSlug) return;
    const template = pagesRef.current.find((page) => page.slug === slug);
    setTemplateSlug(slug);
    setDraftBlocks(template ? cloneTemplateBlocks(template.blocks) : []);
    setNotice(null);
  }

  function createPage(event: FormEvent) {
    event.preventDefault();
    const title = titleInput.trim();
    if (!title) {
      setNotice("Skriv ett sidnamn.");
      return;
    }

    if (!templateSlug || !pagesRef.current.some((page) => page.slug === templateSlug)) {
      setNotice("Välj en sidmall till vänster.");
      return;
    }

    const parent = parentSlug || undefined;
    const segment = slugifyTitle(title);
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

    const page: CmsPage = {
      slug,
      title,
      parentSlug: parent,
      published,
      links: [],
      blocks: draftBlocks,
    };
    const saved = persist((pages) => [...pages, page]);
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

  function updateDraftBlock(id: string, patch: Partial<CmsBlock>) {
    setDraftBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
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
              data-label={item.title}
              aria-label={item.title}
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
              <div className="admin-panel">
                <PageHeading kicker="Befintliga" title="Publicerade sidor" />
              <div className="admin-pages-layout">
                <section aria-label="Befintliga sidor">
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
                          Inga komponenter ännu. Lägg till ett block under Skapa ny sidmall utifrån komponenter.
                        </p>
                      ) : (
                        <ol>
                          {selected.blocks.map((block, index) => (
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
                                <BlockFieldsEditor
                                  block={block}
                                  quoteMode="toggle"
                                  onChange={(patch) => updateBlock(block.id, patch)}
                                  onImage={(src, field) => updateBlock(block.id, { [field]: src })}
                                />
                                {block.type === "expertise" ? (
                                  <ExpertiseCards
                                    items={block.items ?? []}
                                    pages={pages}
                                    onChange={(items) => updateBlock(block.id, { items })}
                                  />
                                ) : null}
                                {block.type === "offering" ? (
                                  <OfferingRows
                                    items={block.items ?? []}
                                    pages={pages}
                                    onChange={(items) => updateBlock(block.id, { items })}
                                  />
                                ) : null}
                              </li>
                            ))}
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

                {homeSelected ? (
                  <PageMiniature url={SITE_HOST} summary="Startsida och footer">
                    <HomeView content={home} />
                  </PageMiniature>
                ) : selected ? (
                  <PageMiniature url={`${SITE_HOST}/${selected.slug}`} page={selected} />
                ) : null}
              </div>
              </div>
          ) : null}

          {panel === "create" ? (
            <div className="admin-panel">
              <PageHeading kicker="Ny sida" title="Skapa ny sida av mall" />
              {listedPages.length === 0 ? (
                <p className="admin-empty">
                  Skapa en sidmall under Skapa ny sidmall utifrån komponenter.
                </p>
              ) : (
                <div className="admin-pages-layout is-create">
                  <section aria-label="Sidmallar">
                    <label className="admin-pick" htmlFor="create-template">
                      Sida
                      <select
                        id="create-template"
                        value={templateSlug ?? ""}
                        onChange={(event) => {
                          const slug = event.target.value;
                          if (slug) chooseTemplate(slug);
                        }}
                      >
                        <option value="" disabled>
                          Välj mall
                        </option>
                        {listedPages.map((page) => (
                          <option key={page.slug} value={page.slug}>
                            {page.parentSlug ? `– ${pageTitle(page)}` : pageTitle(page)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {templatePage ? (
                      <div className="admin-on-page">
                        <h3>På {pageTitle(templatePage)}</h3>
                        {templatePage.blocks.length === 0 ? (
                          <p className="admin-empty">Mallen har inga komponenter ännu.</p>
                        ) : (
                          <ol>
                            {templatePage.blocks.map((block) => (
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
                  </section>

                  {templatePage ? (
                    <section aria-label="Ny sida">
                      <form onSubmit={createPage}>
                        <div className="admin-main-head">
                          <div>
                            <p className="admin-kicker">Ny sida</p>
                            <h2 className="admin-title">{titleInput.trim() || "Ny sida"}</h2>
                            <p className="admin-preview">
                              {previewSlug ? `${SITE_HOST}/${previewSlug}` : `${SITE_HOST}/`}
                            </p>
                          </div>
                          <div className="admin-main-actions">
                            <div className="admin-action-row">
                              <label className="admin-check">
                                <input
                                  type="checkbox"
                                  checked={published}
                                  onChange={(event) => setPublished(event.target.checked)}
                                />
                                Publicera
                              </label>
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
                        </div>

                        <div className="admin-create-fields">
                          <label htmlFor="page-title">
                            Sidnamn
                            <input
                              id="page-title"
                              value={titleInput}
                              onChange={(event) => setTitleInput(event.target.value)}
                              placeholder="Våra expertområden"
                              autoFocus
                            />
                          </label>
                          <p className="admin-derived-url">
                            <span>URL</span>
                            {previewSlug ? `${SITE_HOST}/${previewSlug}` : `${SITE_HOST}/`}
                          </p>
                          <label htmlFor="page-parent">
                            Förälder
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
                          </label>
                        </div>

                        <section className="admin-canvas" aria-label="Sidans block">
                          <h3>Sidan</h3>
                          {draftBlocks.length === 0 ? (
                            <p className="admin-empty">Mallen har inga komponenter ännu.</p>
                          ) : (
                            <ol>
                              {draftBlocks.map((block) => (
                                <li key={block.id}>
                                  <div className="admin-block-head">
                                    <strong>{blockLabel(block.type)}</strong>
                                  </div>
                                  <BlockFieldsEditor
                                    block={block}
                                    quoteMode="locked"
                                    onChange={(patch) => updateDraftBlock(block.id, patch)}
                                    onImage={(src, field) => updateDraftBlock(block.id, { [field]: src })}
                                  />
                                </li>
                              ))}
                            </ol>
                          )}
                          <LockedFooterNote />
                        </section>
                      </form>
                    </section>
                  ) : (
                    <section aria-label="Ny sida">
                      <p className="admin-empty">Välj en sidmall till vänster.</p>
                    </section>
                  )}

                  <PageMiniature
                    url={previewSlug ? `${SITE_HOST}/${previewSlug}` : SITE_HOST}
                    page={{
                      slug: previewSlug || "ny-sida",
                      title: titleInput.trim() || "Ny sida",
                      parentSlug: parentSlug || undefined,
                      published,
                      links: [],
                      blocks: templatePage ? draftBlocks : [],
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}

          {panel === "components" ? (
            <div className="admin-panel">
              <PageHeading kicker="Bibliotek" title="Skapa ny sidmall utifrån komponenter" />
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

function PageHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="admin-page-head">
      <p className="admin-kicker">{kicker}</p>
      <h2 className="admin-title">{title}</h2>
    </header>
  );
}

function BlockFieldsEditor({
  block,
  onChange,
  onImage,
  quoteMode,
}: {
  block: CmsBlock;
  onChange: (patch: Partial<CmsBlock>) => void;
  onImage: (src: string, field: "image" | "image2") => void;
  quoteMode: "toggle" | "locked";
}) {
  const fields = fieldsFor(block.type);
  const quoteFields =
    block.quote !== undefined ? (
      <>
        <FormattedText
          label="Citat"
          rows={3}
          value={block.quote}
          onChange={(quote) => onChange({ quote })}
        />
        <QuotePlacement
          body={block.body}
          value={block.quoteAfter}
          onChange={(quoteAfter) => onChange({ quoteAfter })}
        />
      </>
    ) : null;

  return (
    <>
      {fields.theme ? (
        <ColorSwatch value={resolveTheme(block)} onChange={(theme) => onChange({ theme })} />
      ) : null}
      {fields.eyebrow ? (
        <label>
          Överrad
          <input
            value={block.eyebrow ?? ""}
            onChange={(event) => onChange({ eyebrow: event.target.value })}
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
              onChange={(event) => onChange({ heading: event.target.value })}
            />
          ) : (
            <input
              value={block.heading}
              onChange={(event) => onChange({ heading: event.target.value })}
            />
          )}
        </label>
      ) : null}
      {fields.body ? (
        block.type === "article" ? (
          <FormattedText
            label={fields.body}
            rows={8}
            value={block.body}
            onChange={(body) => onChange({ body })}
          />
        ) : (
          <label>
            {fields.body}
            <textarea
              rows={
                block.type === "banner" || block.type === "highlight"
                  ? 2
                  : block.type === "statement"
                    ? 6
                    : 5
              }
              value={block.body}
              onChange={(event) => onChange({ body: event.target.value })}
            />
          </label>
        )
      ) : null}
      {fields.quote && quoteMode === "toggle" ? (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={block.quote !== undefined}
              onChange={(event) =>
                onChange({
                  quote: event.target.checked ? block.quote ?? "" : undefined,
                  quoteAfter: event.target.checked ? block.quoteAfter ?? 0 : undefined,
                })
              }
            />
            Citat i texten
          </label>
          {quoteFields}
        </>
      ) : null}
      {fields.quote && quoteMode === "locked" ? quoteFields : null}
      {fields.button ? (
        <>
          <label>
            Knapp
            <input
              value={block.buttonLabel ?? ""}
              onChange={(event) => onChange({ buttonLabel: event.target.value })}
            />
          </label>
          <label>
            Länk
            <input
              value={block.buttonHref ?? ""}
              onChange={(event) => onChange({ buttonHref: event.target.value })}
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
                  onChange({ imageSide: event.target.value as CmsBlock["imageSide"] })
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
                onChange={(event) => onChange({ align: event.target.value as CmsBlock["align"] })}
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
          onChoose={(src) => onImage(src, "image")}
          onClear={() => onChange({ image: undefined })}
        />
      ) : null}
      {fields.image2 ? (
        <ImageField
          src={block.image2}
          emptyLabel="Ingen andra bild vald."
          chooseLabel={block.image2 ? "Byt andra bilden" : "Välj andra bilden"}
          onChoose={(src) => onImage(src, "image2")}
          onClear={() => onChange({ image2: undefined })}
        />
      ) : null}
    </>
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

function PageMiniature({
  page,
  url,
  summary,
  children,
}: {
  page?: CmsPage;
  url: string;
  summary?: string;
  children?: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const count = page?.blocks.length ?? 0;
  const previousCount = useRef(count);
  const [scale, setScale] = useState(0.32);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      if (width <= 0) return;
      const next = width / PREVIEW_WIDTH;
      setScale((current) => (Math.abs(current - next) < 0.002 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const added = count - previousCount.current;
    previousCount.current = count;
    if (added !== 1) return;
    frame.scrollTo({ top: frame.scrollHeight, behavior: "smooth" });
  }, [count]);

  const label =
    summary ??
    (count === 0 ? "Footer" : `${count} komponent${count === 1 ? "" : "er"} och footer`);
  const showHint = Boolean(page) && count === 0;

  return (
    <aside className="admin-miniature" aria-label="Förhandsvisning av sidan">
      <div className="admin-miniature-label">
        <p className="admin-kicker">Förhandsvisning</p>
        <span>{label}</span>
      </div>
      <div className="admin-miniature-window">
        <div className="admin-miniature-chrome">
          <i />
          <i />
          <i />
          <em>{url}</em>
        </div>
        <div
          className={showHint ? "admin-miniature-frame is-empty" : "admin-miniature-frame"}
          ref={frameRef}
        >
          <div
            className="admin-miniature-page"
            inert
            aria-hidden="true"
            style={{ width: PREVIEW_WIDTH, zoom: scale }}
          >
            {children ?? (page ? <PageBlocks page={page} /> : null)}
          </div>
          {showHint ? (
            <p className="admin-miniature-hint">
              Lägg till en komponent så byggs sidan upp här.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function FormattedText({
  label,
  rows,
  value,
  onChange,
}: {
  label: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  function format(kind: "bold" | "link") {
    const field = fieldRef.current;
    if (!field) return;
    const url = kind === "link" ? window.prompt("Klistra in länken", "https://") ?? "" : "";
    if (kind === "link" && !url.trim()) return;
    const next = applyInline(value, field.selectionStart, field.selectionEnd, kind, url);
    if (!next) {
      window.alert("Länken behöver börja med https://, http://, /, #, mailto: eller tel:.");
      return;
    }
    onChange(next.value);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  }

  return (
    <div className="admin-format">
      <span>{label}</span>
      <div className="admin-format-tools">
        <button type="button" onClick={() => format("bold")}>
          Fetstil
        </button>
        <button type="button" onClick={() => format("link")}>
          Länk
        </button>
      </div>
      <textarea
        ref={fieldRef}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function QuotePlacement({
  body,
  value,
  onChange,
}: {
  body: string;
  value: number | undefined;
  onChange: (quoteAfter: number) => void;
}) {
  const count = articleParagraphs(body).length;
  if (count === 0) return null;

  const selected = quoteAfterIndex(value, count);
  const options = [
    { value: -1, label: "Före texten" },
    ...Array.from({ length: count }, (_, index) => ({
      value: index,
      label: index === count - 1 ? "Efter texten" : `Efter stycke ${index + 1}`,
    })),
  ];

  return (
    <label>
      Placering
      <select
        value={selected}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ExpertiseCards({
  items,
  pages,
  onChange,
}: {
  items: CmsCard[];
  pages: CmsPage[];
  onChange: (items: CmsCard[]) => void;
}) {
  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  return (
    <fieldset className="admin-cards">
      <legend>Kort</legend>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>Kort {index + 1}</strong>
              <button
                type="button"
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              >
                Ta bort
              </button>
            </div>
            <label>
              Rubrik
              <input
                value={item.heading}
                onChange={(event) => patch(item.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Text
              <textarea
                rows={4}
                value={item.body}
                onChange={(event) => patch(item.id, { body: event.target.value })}
              />
            </label>
            <label>
              Undersida
              <select
                value={item.href}
                onChange={(event) => patch(item.id, { href: event.target.value })}
              >
                <option value="">Ingen sida</option>
                {pages.map((page) => (
                  <option key={page.slug} value={`/${page.slug}`}>
                    {page.title}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...items, createCard()])}>
        Lägg till kort
      </button>
    </fieldset>
  );
}

function OfferingRows({
  items,
  pages,
  onChange,
}: {
  items: CmsCard[];
  pages: CmsPage[];
  onChange: (items: CmsCard[]) => void;
}) {
  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  return (
    <fieldset className="admin-cards">
      <legend>Rader</legend>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>Rad {index + 1}</strong>
              <button
                type="button"
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              >
                Ta bort
              </button>
            </div>
            <label>
              Rubrik
              <input
                value={item.heading}
                onChange={(event) => patch(item.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Text
              <textarea
                rows={4}
                value={item.body}
                onChange={(event) => patch(item.id, { body: event.target.value })}
              />
            </label>
            <label>
              Knapp
              <input
                value={item.buttonLabel ?? ""}
                onChange={(event) => patch(item.id, { buttonLabel: event.target.value })}
              />
            </label>
            <label>
              Undersida
              <select
                value={item.href}
                onChange={(event) => patch(item.id, { href: event.target.value })}
              >
                <option value="">Ingen sida</option>
                {pages.map((page) => (
                  <option key={page.slug} value={`/${page.slug}`}>
                    {page.title}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...items, createOfferingRow("Ny rad")])}>
        Lägg till rad
      </button>
    </fieldset>
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
  onChoose: (src: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadLibraryImages()
      .then((next) => {
        if (!cancelled) {
          setImages(next);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Kunde inte läsa bilderna.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="admin-image" ref={rootRef}>
      {src ? <img src={src} alt="" /> : <p>{emptyLabel}</p>}
      <div>
        <button
          type="button"
          className="admin-file"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {chooseLabel}
        </button>
        {src ? (
          <button type="button" onClick={onClear}>
            Ta bort bild
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="admin-image-picker">
          <p>Bilder i biblioteket</p>
          {error ? <p>{error}</p> : null}
          {images === null && !error ? <p>Hämtar bilder…</p> : null}
          {images?.length === 0 ? <p>Inga bilder att välja.</p> : null}
          {images && images.length > 0 ? (
            <ul>
              {images.map((image) => {
                const name = image.split("/").pop() ?? image;
                return (
                  <li key={image}>
                    <button
                      type="button"
                      className={src === image ? "is-selected" : undefined}
                      aria-pressed={src === image}
                      aria-label={name}
                      title={name}
                      onClick={() => {
                        onChoose(image);
                        setOpen(false);
                      }}
                    >
                      <img src={image} alt="" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
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
