"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { applyInline } from "@/lib/cms/inline";
import { newsDateForSlug } from "@/lib/cms/news-date";
import { LockedFooterNote } from "@/components/cms/locked-footer";
import { PageBlocks } from "@/components/cms/page-blocks";
import {
  SITE_HOST,
  articleParagraphs,
  blockLabel,
  cloneTemplateBlocks,
  createBlock,
  createCard,
  createNewsItem,
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
  deleteTemplateChoice,
  hiddenTemplateSlugs,
  loadArchive,
  loadPages,
  loadTemplateArchive,
  loadTemplates,
  orderedPages,
  pagesRemovedWith,
  pageTitle,
  restoreArchivedPages,
  restoreTemplateChoice,
  rootPages,
  slugifyTitle,
  templateChoices,
  validateSlug,
  writePages,
  type CmsTemplate,
  type PageArchiveEntry,
  type TemplateArchiveEntry,
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

type Panel = "pages" | "create" | "components" | "archive";

const BLANK_TEMPLATE = "__blank__";

function DragGrip() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
      <circle cx="2" cy="2.5" r="1.15" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1.15" fill="currentColor" />
      <circle cx="2" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="2" cy="13.5" r="1.15" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 4.4h9.6M6.3 4.4V3.2A.8.8 0 0 1 7.1 2.4h1.8a.8.8 0 0 1 .8.8v1.2M4.5 4.4l.55 8a.9.9 0 0 0 .9.8h4.1a.9.9 0 0 0 .9-.8l.55-8M6.7 6.7v4.2M9.3 6.7v4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const panels: { id: Panel; kicker: string; title: string }[] = [
  { id: "pages", kicker: "Befintliga", title: "Publicerade sidor" },
  { id: "create", kicker: "Ny sida", title: "Skapa ny sida av mall" },
  { id: "components", kicker: "Bibliotek", title: "Skapa ny sidmall utifrån komponenter" },
];

export default function AdminPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("pages");
  const [titleInput, setTitleInput] = useState("");
  const [componentTarget, setComponentTarget] = useState(BLANK_TEMPLATE);
  const [blankBlocks, setBlankBlocks] = useState<CmsBlock[]>([]);
  const [blankTitle, setBlankTitle] = useState("");
  const [blankParent, setBlankParent] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<CmsBlock[]>([]);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [archive, setArchive] = useState<PageArchiveEntry[]>([]);
  const [templates, setTemplates] = useState<CmsTemplate[]>([]);
  const [templateArchive, setTemplateArchive] = useState<TemplateArchiveEntry[]>([]);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<"page" | "template" | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const dragOriginRef = useRef<number | null>(null);
  const pagesRef = useRef(pages);
  const templatesRef = useRef(templates);
  const templateArchiveRef = useRef(templateArchive);
  pagesRef.current = pages;
  templatesRef.current = templates;
  templateArchiveRef.current = templateArchive;

  useEffect(() => {
    const stored = loadPages();
    setPages(stored);
    setArchive(loadArchive());
    setTemplates(loadTemplates());
    setTemplateArchive(loadTemplateArchive());
    setSelectedSlug(orderedPages(stored)[0]?.slug ?? null);
  }, []);

  const selected = pages.find((page) => page.slug === selectedSlug) ?? null;
  const listedPages = orderedPages(pages);
  const templateOptions = templateChoices(pages, templates, hiddenTemplateSlugs(templateArchive));
  const templatePage = templateOptions.find((page) => page.slug === templateSlug) ?? null;
  const pendingDelete =
    deleteTarget === "page" && deleteSlug
      ? (pages.find((page) => page.slug === deleteSlug) ?? null)
      : null;
  const pendingTemplateDelete =
    deleteTarget === "template" && deleteSlug
      ? (templateOptions.find((page) => page.slug === deleteSlug) ?? null)
      : null;
  const pendingRemoved = deleteSlug ? pagesRemovedWith(deleteSlug, pages) : [];
  const parents = rootPages(pages);
  const previewSlug = composeSlug(parentSlug || undefined, slugifyTitle(titleInput));
  const blankMode = componentTarget === BLANK_TEMPLATE;
  const componentPage = blankMode
    ? null
    : (pages.find((page) => page.slug === componentTarget) ?? null);
  const componentBlocks = blankMode ? blankBlocks : (componentPage?.blocks ?? []);
  const blankSlug = composeSlug(blankParent || undefined, slugifyTitle(blankTitle));
  const templateDraftTitle =
    blankMode || !componentPage ? blankTitle.trim() || "Ny sidmall" : pageTitle(componentPage);
  const templateDraftUrl = blankMode
    ? blankSlug
      ? `${SITE_HOST}/${blankSlug}`
      : `${SITE_HOST}/`
    : componentPage
      ? `${SITE_HOST}/${componentPage.slug}`
      : SITE_HOST;

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

  function findTemplate(slug: string | null) {
    if (!slug) return null;
    return (
      templateChoices(
        pagesRef.current,
        templatesRef.current,
        hiddenTemplateSlugs(templateArchiveRef.current),
      ).find((page) => page.slug === slug) ??
      null
    );
  }

  function resetCreateForm() {
    setTitleInput("");
    setParentSlug("");
    setPublished(true);
    const template = findTemplate(templateSlug);
    setDraftBlocks(template ? cloneTemplateBlocks(template.blocks) : []);
  }

  function chooseTemplate(slug: string) {
    if (slug === templateSlug) return;
    const template = findTemplate(slug);
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

    if (!findTemplate(templateSlug)) {
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
    setDeleteTarget("page");
    setDeleteSlug(slug);
    setDeleteInput("");
    setNotice(null);
  }

  function openDeleteTemplate(slug: string) {
    setDeleteTarget("template");
    setDeleteSlug(slug);
    setDeleteInput("");
    setNotice(null);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteSlug(null);
    setDeleteInput("");
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
    if (result.templates) {
      templatesRef.current = result.templates;
      setTemplates(result.templates);
    }
    closeDelete();
    setSelectedSlug(orderedPages(result.next)[0]?.slug ?? null);
    setNotice("Sidan är borttagen och ligger under Borttagna sidor och mallar.");
  }

  function confirmDeleteTemplate() {
    if (!deleteSlug) return;
    const address = `${SITE_HOST}/${deleteSlug}`;
    if (!addressMatches(deleteInput, address)) return;
    const result = deleteTemplateChoice(deleteSlug, pagesRef.current, templatesRef.current);
    if (result.error || !result.templates || !result.archive) {
      setNotice(result.error ?? "Kunde inte ta bort mallen.");
      return;
    }
    templatesRef.current = result.templates;
    templateArchiveRef.current = result.archive;
    setTemplates(result.templates);
    setTemplateArchive(result.archive);
    if (templateSlug === deleteSlug) {
      setTemplateSlug(null);
      setDraftBlocks([]);
    }
    closeDelete();
    setNotice("Mallen är borttagen och ligger under Borttagna sidor och mallar.");
  }

  function restoreTemplate(id: string) {
    const result = restoreTemplateChoice(id, templatesRef.current);
    if (!result.templates || !result.archive) {
      setNotice(result.error ?? "Kunde inte återställa mallen.");
      return;
    }
    templatesRef.current = result.templates;
    templateArchiveRef.current = result.archive;
    setTemplates(result.templates);
    setTemplateArchive(result.archive);
    const entry = templateArchive.find((item) => item.id === id);
    if (entry) {
      setTemplateSlug(entry.slug);
      const live = pagesRef.current.find((page) => page.slug === entry.slug);
      setDraftBlocks(cloneTemplateBlocks((live ?? entry.template).blocks));
    }
    setNotice(result.error ?? "Mallen är återställd.");
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
    const block = createBlock(type);
    if (componentTarget === BLANK_TEMPLATE) {
      setBlankBlocks((current) => [...current, block]);
      setNotice(null);
      return;
    }
    if (!pagesRef.current.some((page) => page.slug === componentTarget)) {
      setNotice("Välj en sida först.");
      return;
    }
    persist((current) =>
      current.map((page) =>
        page.slug === componentTarget ? { ...page, blocks: [...page.blocks, block] } : page,
      ),
    );
  }

  function saveBlankTemplate() {
    const title = blankTitle.trim();
    if (!title) {
      setNotice("Skriv ett sidnamn.");
      return;
    }
    const parent = blankParent || undefined;
    const slug = composeSlug(parent, slugifyTitle(title));
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
      published: false,
      links: [],
      blocks: blankBlocks,
    };
    const saved = persist((pages) => [...pages, page]);
    if (!saved) return;
    setSelectedSlug(page.slug);
    setComponentTarget(page.slug);
    setBlankBlocks([]);
    setBlankTitle("");
    setBlankParent("");
    setNotice("Sidmallen är sparad som utkast.");
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

  function applyBlockOrder(blocks: CmsBlock[], from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to > blocks.length) return blocks;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    const insertAt = from < to ? to - 1 : to;
    next.splice(insertAt, 0, item);
    return next;
  }

  function reorderComponentBlocks(from: number, to: number) {
    if (from === to || from + 1 === to) return;
    if (blankMode) {
      setBlankBlocks((current) => applyBlockOrder(current, from, to));
      return;
    }
    if (!componentPage) return;
    const slug = componentPage.slug;
    persist((current) =>
      current.map((page) =>
        page.slug === slug ? { ...page, blocks: applyBlockOrder(page.blocks, from, to) } : page,
      ),
    );
  }

  function removeComponentBlock(id: string) {
    if (blankMode) {
      setBlankBlocks((current) => current.filter((block) => block.id !== id));
      setNotice(null);
      return;
    }
    if (!componentPage) return;
    const slug = componentPage.slug;
    persist((current) =>
      current.map((page) =>
        page.slug === slug
          ? { ...page, blocks: page.blocks.filter((block) => block.id !== id) }
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
              }}
            >
              <RailIcon name={item.id} />
            </button>
          ))}
        </nav>
        <div className="admin-rail-foot">
          <button
            type="button"
            className={panel === "archive" ? "is-active" : undefined}
            data-label="Borttagna sidor och mallar"
            aria-label="Borttagna sidor och mallar"
            aria-current={panel === "archive" ? "page" : undefined}
            onClick={() => {
              setPanel("archive");
              setNotice(null);
            }}
          >
            <RailIcon name="archive" />
          </button>
          <a className="admin-logout" href="/" data-label="Logga ut" aria-label="Logga ut">
            <RailIcon name="logout" />
          </a>
        </div>
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
                          <span className="admin-page-row">
                            <span className="admin-page-name">{pageTitle(page)}</span>
                            <span className={page.published ? "admin-status is-live" : "admin-status"}>
                              {page.published ? "Publicerad" : "Utkast"}
                            </span>
                          </span>
                          <small>
                            {SITE_HOST}/{page.slug}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                {selected ? (
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
                                    {block.type === "news" ? null : (
                                      <button type="button" onClick={() => removeBlock(block.id)}>
                                        Ta bort
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <BlockFieldsEditor
                                  block={block}
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
                                {block.type === "news" ? (
                                  <NewsCards
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
                          ? "Sidan och dess undersidor försvinner från webbplatsen. En kopia sparas under Borttagna sidor och mallar och kan återställas."
                          : "Sidan försvinner från webbplatsen. En kopia sparas under Borttagna sidor och mallar och kan återställas."}
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
                ) : (
                  <p className="admin-empty">Inga sidor.</p>
                )}

                {selected ? (
                  <PageMiniature
                    url={`${SITE_HOST}/${selected.slug}`}
                    page={selected}
                    publishedAt={newsDateForSlug(selected.slug, pages)}
                  />
                ) : null}
              </div>
              </div>
          ) : null}

          {panel === "create" ? (
            <div className="admin-panel">
              <PageHeading kicker="Ny sida" title="Skapa ny sida av mall" />
              {templateOptions.length === 0 ? (
                <p className="admin-empty">
                  Skapa en sidmall under Skapa ny sidmall utifrån komponenter.
                </p>
              ) : (
                <div className="admin-pages-layout is-create">
                  <section aria-label="Sidmallar">
                    {templateOptions.length === 0 ? (
                      <p className="admin-empty">Inga sidmallar kvar.</p>
                    ) : (
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
                          {templateOptions.map((page) => (
                            <option key={page.slug} value={page.slug}>
                              {page.parentSlug ? `– ${pageTitle(page)}` : pageTitle(page)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
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
                    {templatePage ? (
                      <section className="admin-danger" aria-label="Ta bort mall">
                        <h3>Ta bort mallen</h3>
                        <p>
                          Mallen försvinner från listan. En kopia sparas under Borttagna sidor och mallar
                          och kan återställas. Sidor som redan finns påverkas inte.
                        </p>
                        <button
                          type="button"
                          className="admin-danger-button"
                          onClick={() => openDeleteTemplate(templatePage.slug)}
                        >
                          Ta bort mall
                        </button>
                      </section>
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
                                    onChange={(patch) => updateDraftBlock(block.id, patch)}
                                    onImage={(src, field) => updateDraftBlock(block.id, { [field]: src })}
                                  />
                                  {block.type === "expertise" ? (
                                    <ExpertiseCards
                                      items={block.items ?? []}
                                      pages={pages}
                                      onChange={(items) => updateDraftBlock(block.id, { items })}
                                    />
                                  ) : null}
                                  {block.type === "offering" ? (
                                    <OfferingRows
                                      items={block.items ?? []}
                                      pages={pages}
                                      onChange={(items) => updateDraftBlock(block.id, { items })}
                                    />
                                  ) : null}
                                  {block.type === "news" ? (
                                    <NewsCards
                                      items={block.items ?? []}
                                      pages={pages}
                                      onChange={(items) => updateDraftBlock(block.id, { items })}
                                    />
                                  ) : null}
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
                    publishedAt={newsDateForSlug(previewSlug, pages)}
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
              <div className="admin-pages-layout is-components">
                <section aria-label="På ny sidmall">
                  <div className="admin-on-page">
                    <h3>På {templateDraftTitle}</h3>
                    {componentBlocks.length === 0 ? (
                      <p className="admin-empty">Inga komponenter på sidan ännu.</p>
                    ) : (
                      <ol
                        className={
                          dropIndex === componentBlocks.length ? "is-drop-end" : undefined
                        }
                      >
                        {componentBlocks.map((block, index) => (
                          <li
                            key={block.id}
                            className={[
                              "is-draggable",
                              dragIndex === index ? "is-dragging" : "",
                              dropIndex === index ? "is-drop-before" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onPointerDown={(event) => {
                              if (event.button !== 0) return;
                              if ((event.target as HTMLElement).closest("button")) return;
                              dragOriginRef.current = event.clientY;
                              dragIndexRef.current = null;
                              try {
                                event.currentTarget.setPointerCapture(event.pointerId);
                              } catch {
                                // Pointer capture is unavailable for some synthetic drags.
                              }
                            }}
                            onPointerMove={(event) => {
                              if (dragOriginRef.current === null) return;
                              if (dragIndexRef.current === null) {
                                if (Math.abs(event.clientY - dragOriginRef.current) < 4) return;
                                dragIndexRef.current = index;
                                setDragIndex(index);
                              }
                              const rows = event.currentTarget.parentElement?.children;
                              if (!rows) return;
                              let next = rows.length;
                              for (let i = 0; i < rows.length; i += 1) {
                                const rect = (rows[i] as HTMLElement).getBoundingClientRect();
                                if (event.clientY < rect.top + rect.height / 2) {
                                  next = i;
                                  break;
                                }
                              }
                              setDropIndex((current) => (current === next ? current : next));
                            }}
                            onPointerUp={(event) => {
                              const from = dragIndexRef.current;
                              const rows = event.currentTarget.parentElement?.children;
                              let to = rows?.length ?? index;
                              if (rows) {
                                for (let i = 0; i < rows.length; i += 1) {
                                  const rect = (rows[i] as HTMLElement).getBoundingClientRect();
                                  if (event.clientY < rect.top + rect.height / 2) {
                                    to = i;
                                    break;
                                  }
                                }
                              }
                              dragOriginRef.current = null;
                              dragIndexRef.current = null;
                              setDragIndex(null);
                              setDropIndex(null);
                              if (from === null) return;
                              reorderComponentBlocks(from, to);
                            }}
                            onPointerCancel={() => {
                              dragOriginRef.current = null;
                              dragIndexRef.current = null;
                              setDragIndex(null);
                              setDropIndex(null);
                            }}
                          >
                            <div className="admin-block-head">
                              <span className="admin-block-label">
                                <span className="admin-drag-handle" aria-hidden="true">
                                  <DragGrip />
                                </span>
                                <strong>{blockLabel(block.type)}</strong>
                              </span>
                              <button
                                type="button"
                                className="admin-icon-button"
                                aria-label={`Ta bort ${blockLabel(block.type)}`}
                                onClick={() => removeComponentBlock(block.id)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                            <span>{block.heading}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    <LockedFooterNote />
                  </div>
                </section>

                <section aria-label="Komponenter">
                  <div className="admin-main-head">
                    <div>
                      <p className="admin-kicker">Ny sidmall</p>
                      <h2 className="admin-title">{templateDraftTitle}</h2>
                      <p className="admin-preview">{templateDraftUrl}</p>
                    </div>
                    {blankMode ? (
                      <div className="admin-main-actions">
                        <button type="button" className="admin-primary" onClick={saveBlankTemplate}>
                          Spara sidmall
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <label className="admin-pick" htmlFor="component-target">
                    Utgå från
                    <select
                      id="component-target"
                      value={blankMode ? BLANK_TEMPLATE : (componentPage?.slug ?? BLANK_TEMPLATE)}
                      onChange={(event) => {
                        setComponentTarget(event.target.value);
                        setNotice(null);
                      }}
                    >
                      <option value={BLANK_TEMPLATE}>Blank sida</option>
                      {listedPages.map((page) => (
                        <option key={page.slug} value={page.slug}>
                          {page.parentSlug ? `– ${pageTitle(page)}` : pageTitle(page)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {blankMode ? (
                    <div className="admin-create-fields">
                      <label htmlFor="blank-title">
                        Sidnamn
                        <input
                          id="blank-title"
                          value={blankTitle}
                          onChange={(event) => setBlankTitle(event.target.value)}
                          placeholder="Ny sidmall"
                        />
                      </label>
                      <p className="admin-derived-url">
                        <span>URL</span>
                        {templateDraftUrl}
                      </p>
                      <label htmlFor="blank-parent">
                        Förälder
                        <select
                          id="blank-parent"
                          value={blankParent}
                          onChange={(event) => setBlankParent(event.target.value)}
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
                  ) : null}

                  <BlockCatalog onAdd={addBlock} />
                </section>

                <PageMiniature
                  url={templateDraftUrl}
                  publishedAt={newsDateForSlug(
                    blankMode ? blankSlug : (componentPage?.slug ?? ""),
                    pages,
                  )}
                  page={
                    blankMode
                      ? {
                          slug: blankSlug || "ny-mall",
                          title: templateDraftTitle,
                          parentSlug: blankParent || undefined,
                          published: false,
                          links: [],
                          blocks: blankBlocks,
                        }
                      : (componentPage ?? {
                          slug: "ny-mall",
                          title: "Ny sidmall",
                          published: false,
                          links: [],
                          blocks: [],
                        })
                  }
                />
              </div>
            </div>
          ) : null}

          {panel === "archive" ? (
            <div className="admin-panel">
              <PageHeading kicker="Borttagna" title="Borttagna sidor och mallar" />
              <div className="admin-archive-layout">
                <section className="admin-archive" aria-label="Borttagna sidor">
                  <h3>Borttagna sidor</h3>
                  <p>Kopian ligger kvar här tills sidan återställs.</p>
                  {archive.length === 0 ? (
                    <p className="admin-empty">Inga borttagna sidor.</p>
                  ) : (
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
                            <button
                              type="button"
                              className="admin-quiet"
                              onClick={() => restorePage(entry.id)}
                            >
                              Återställ
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                <section className="admin-archive" aria-label="Borttagna mallar">
                  <h3>Borttagna mallar</h3>
                  <p>Kopian ligger kvar här tills mallen återställs.</p>
                  {templateArchive.length === 0 ? (
                    <p className="admin-empty">Inga borttagna mallar.</p>
                  ) : (
                    <ul>
                      {templateArchive.map((entry) => (
                        <li key={entry.id}>
                          <span>{entry.template.title.trim() || entry.template.slug}</span>
                          <small>
                            {SITE_HOST}/{entry.slug}
                          </small>
                          <small>{formatDeletedAt(entry.deletedAt)}</small>
                          <button
                            type="button"
                            className="admin-quiet"
                            onClick={() => restoreTemplate(entry.id)}
                          >
                            Återställ
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
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
            closeDelete();
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
      {pendingTemplateDelete ? (
        <DeletePageDialog
          mode="template"
          title={pageTitle(pendingTemplateDelete)}
          address={`${SITE_HOST}/${pendingTemplateDelete.slug}`}
          childCount={0}
          value={deleteInput}
          onChange={setDeleteInput}
          onCancel={() => {
            closeDelete();
          }}
          onConfirm={confirmDeleteTemplate}
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
}: {
  block: CmsBlock;
  onChange: (patch: Partial<CmsBlock>) => void;
  onImage: (src: string, field: "image" | "image2") => void;
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
      {fields.quote ? (
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
      {block.type === "statement" ? (
        <label>
          Justering
          <select
            value={block.align ?? "center"}
            onChange={(event) => onChange({ align: event.target.value as CmsBlock["align"] })}
          >
            <option value="left">Vänster</option>
            <option value="center">Centrerad</option>
            <option value="right">Höger</option>
          </select>
        </label>
      ) : null}
      {fields.button && block.type === "statement" ? (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={block.buttonLabel !== undefined}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? {
                        buttonLabel: block.buttonLabel || "Contact us",
                        buttonHref: block.buttonHref || "/#kontakt",
                      }
                    : { buttonLabel: undefined, buttonHref: undefined },
                )
              }
            />
            Knapp
          </label>
          {block.buttonLabel !== undefined ? (
            <>
              <label>
                Knapp
                <input
                  value={block.buttonLabel}
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
        </>
      ) : null}
      {fields.button && block.type !== "statement" ? (
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
  mode = "page",
}: {
  title: string;
  address: string;
  childCount: number;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  mode?: "page" | "template" | "news";
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
          {mode === "news" ? (
            "Nyheten tas bort från sidan."
          ) : (
            <>
              {mode === "template"
                ? "Mallen tas bort från listan. Sidor som redan finns påverkas inte."
                : childCount > 0
                  ? `Sidan och ${childCount} ${childCount === 1 ? "undersida" : "undersidor"} tas bort från webbplatsen.`
                  : "Sidan tas bort från webbplatsen."}{" "}
              Kopian sparas i arkivet.
            </>
          )}
        </p>
        <label>
          {mode === "news" ? "Rubrik" : "Adress"}
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
            {mode === "news" ? "Ta bort nyhet" : mode === "template" ? "Ta bort mall" : "Ta bort sida"}
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
  publishedAt = "",
}: {
  page?: CmsPage;
  url: string;
  summary?: string;
  children?: ReactNode;
  publishedAt?: string;
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
            {children ?? (page ? <PageBlocks page={page} preview publishedAt={publishedAt} /> : null)}
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

function newsConfirmText(item: CmsCard, index: number) {
  const heading = item.heading.trim();
  return heading || `Nyhet ${index + 1}`;
}

function NewsCards({
  items,
  pages,
  onChange,
}: {
  items: CmsCard[];
  pages: CmsPage[];
  onChange: (items: CmsCard[]) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const pendingIndex = items.findIndex((item) => item.id === pendingId);
  const pending = pendingIndex >= 0 ? items[pendingIndex] : null;
  const confirmText = pending ? newsConfirmText(pending, pendingIndex) : "";

  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  function openItemDelete(id: string) {
    setPendingId(id);
    setDeleteInput("");
  }

  function closeItemDelete() {
    setPendingId(null);
    setDeleteInput("");
  }

  function confirmItemDelete() {
    if (!pending || !addressMatches(deleteInput, confirmText)) return;
    onChange(items.filter((row) => row.id !== pending.id));
    closeItemDelete();
  }

  return (
    <fieldset className="admin-cards">
      <legend>Nyheter</legend>
      <button type="button" className="admin-cards-add" onClick={() => onChange([createNewsItem(), ...items])}>
        Lägg till nyhet
      </button>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>Nyhet {index + 1}</strong>
              <div>
                <button
                  type="button"
                  className={item.published === false ? "admin-publish" : "admin-publish is-live"}
                  aria-pressed={item.published !== false}
                  onClick={() => patch(item.id, { published: item.published === false })}
                >
                  {item.published === false ? "Ej publiserad" : "Publiserad"}
                </button>
                <button type="button" onClick={() => openItemDelete(item.id)}>
                  Ta bort
                </button>
              </div>
            </div>
            <ImageField
              src={item.image}
              emptyLabel="Ingen bild vald."
              chooseLabel={item.image ? "Byt bild" : "Välj bild"}
              onChoose={(src) => patch(item.id, { image: src })}
              onClear={() => patch(item.id, { image: "" })}
            />
            <label>
              Publicerad
              <input
                type="date"
                value={item.publishedAt ?? ""}
                onChange={(event) => patch(item.id, { publishedAt: event.target.value })}
              />
            </label>
            <label>
              Rubrik
              <input
                value={item.heading}
                onChange={(event) => patch(item.id, { heading: event.target.value })}
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
      {pending
        ? createPortal(
            <DeletePageDialog
              mode="news"
              title={confirmText}
              address={confirmText}
              childCount={0}
              value={deleteInput}
              onChange={setDeleteInput}
              onCancel={closeItemDelete}
              onConfirm={confirmItemDelete}
            />,
            document.body,
          )
        : null}
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

  if (name === "archive") {
    return (
      <svg {...props}>
        <path d="M4.5 7h15" />
        <path d="M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7" />
        <path d="M6.2 7l.7 11.2A1.5 1.5 0 0 0 8.4 19.5h7.2a1.5 1.5 0 0 0 1.5-1.3L17.8 7" />
        <path d="M10 11v4.5" />
        <path d="M14 11v4.5" />
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
