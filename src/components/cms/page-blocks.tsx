import { OfferingBlock } from "@/components/cms/offering-block";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { renderInline } from "@/lib/cms/inline";
import { articleParagraphs, quoteAfterIndex, resolveTheme } from "@/lib/cms/library";
import type { CmsBlock, CmsPage } from "@/lib/cms/types";
import "./page-blocks.css";

export function PageBlocks({ page }: { page: CmsPage }) {
  const firstIsHero = page.blocks[0]?.type === "hero";

  return (
    <div id="top">
      {firstIsHero ? null : (
        <header className="cms-topbar">
          <a href="/" className="logo-link">
            <img src="/icons/logo.svg" width={239} height={46} alt="Mindstreet" />
          </a>
        </header>
      )}
      {page.blocks.map((block, index) => (
        <BlockView key={block.id} block={block} withHeader={firstIsHero && index === 0} />
      ))}
      {page.links.length > 0 ? (
        <nav className="cms-page-links" aria-label="Länkar">
          <ul>
            {page.links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <SiteFooter />
    </div>
  );
}

function BlockView({ block, withHeader }: { block: CmsBlock; withHeader: boolean }) {
  if (block.type === "hero") {
    return (
      <section className="hero cms-hero">
        {block.image ? (
          <img className="hero-photo" src={block.image} alt="" />
        ) : (
          <div className="hero-photo cms-hero-fallback" />
        )}
        <div className="hero-shade" />
        {withHeader ? <Header /> : null}
        <div className="hero-content">
          <div>
            <h1>{block.heading}</h1>
            {block.body ? <p className="cms-hero-lead">{block.body}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <ThemedSurface block={block}>
        <div className="intro">
          <h2>{block.heading}</h2>
          <p>{block.body}</p>
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "split") {
    return (
      <section className="about">
        <img
          className="about-shape"
          src="/icons/about-shape.svg"
          width={1440}
          height={833}
          alt=""
        />
        <div className="about-inner">
          {block.image ? (
            <img className="about-photo" src={block.image} alt="" />
          ) : (
            <div className="about-photo cms-photo-fallback" />
          )}
          <div className="about-copy">
            <h2>{block.heading}</h2>
            <p>{block.body}</p>
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "banner") {
    return (
      <section className="seminar-wrap">
        <div className="seminar">
          {block.image ? (
            <img src={block.image} alt="" />
          ) : (
            <div className="cms-banner-fallback" />
          )}
          <div className="seminar-shade" />
          <div className="seminar-copy">
            {block.body ? <p>{block.body}</p> : null}
            <h2>{block.heading}</h2>
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "imageText") {
    const side = block.imageSide === "left" ? "left" : "right";
    const theme = resolveTheme(block);
    return (
      <section className={`cms-media cms-theme-${theme}`}>
        {theme === "mist" ? <ModuleShape /> : null}
        <div className={`cms-media-inner is-image-${side}`}>
          {side === "left" ? <ModulePhoto src={block.image} /> : null}
          <ModuleCopy block={block} />
          {side === "right" ? <ModulePhoto src={block.image} /> : null}
        </div>
      </section>
    );
  }

  if (block.type === "imagePair") {
    const side = block.imageSide === "right" ? "right" : "left";
    const theme = resolveTheme(block);
    return (
      <section className={`cms-media cms-media-pair cms-theme-${theme}`}>
        {theme === "mist" ? <ModuleShape /> : null}
        <div className={`cms-media-inner is-image-${side}`}>
          {side === "left" ? <PairPhotos block={block} /> : null}
          <ModuleCopy block={block} />
          {side === "right" ? <PairPhotos block={block} /> : null}
        </div>
      </section>
    );
  }

  if (block.type === "sectionHeader") {
    const align = block.align === "center" ? "center" : "left";
    return (
      <ThemedSurface block={block}>
        <div className={`cms-divider is-${align}`}>
          <div className="cms-divider-inner">
            <h2>{block.heading}</h2>
          </div>
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "highlight") {
    return (
      <section className="seminar-wrap">
        <div className="seminar">
          {block.image ? (
            <img src={block.image} alt="" />
          ) : (
            <div className="cms-banner-fallback" />
          )}
          <div className="seminar-shade" />
          <div className="seminar-copy">
            {block.body ? <p>{block.body}</p> : null}
            <h2>{block.heading}</h2>
            {block.buttonLabel ? (
              <a className="btn btn-cream" href={block.buttonHref || "#"}>
                {block.buttonLabel}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "article") {
    const paragraphs = articleParagraphs(block.body);
    const quote = block.quote?.trim() ?? "";
    const after = quote ? quoteAfterIndex(block.quoteAfter, paragraphs.length) : -1;
    return (
      <ThemedSurface block={block}>
        <article className="cms-article">
          {block.heading ? <h2>{block.heading}</h2> : null}
          <ModulePhoto src={block.image} />
          <div className="cms-article-copy">
            {after === -1 && quote ? <blockquote>{renderInline(quote)}</blockquote> : null}
            {paragraphs.map((paragraph, index) => (
              <div key={index}>
                <p>{renderInline(paragraph)}</p>
                {after === index && quote ? <blockquote>{renderInline(quote)}</blockquote> : null}
              </div>
            ))}
          </div>
        </article>
      </ThemedSurface>
    );
  }

  if (block.type === "lead") {
    return (
      <ThemedSurface block={block}>
        <div className="intro">
          <h2>{block.heading}</h2>
          <p>{block.body}</p>
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "offering") {
    return <OfferingBlock heading={block.heading} items={block.items ?? []} />;
  }

  if (block.type === "expertise") {
    const items = block.items ?? [];
    return (
      <section className="cms-expertise">
        <div className="section-inner">
          {block.heading ? <h2>{block.heading}</h2> : null}
          <div className="cms-expertise-grid">
            {items.map((item) => (
              <article key={item.id}>
                {item.heading ? <h3>{item.heading}</h3> : null}
                {item.body ? <p>{item.body}</p> : null}
                <CardArrow heading={item.heading} href={item.href} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return null;
}

function CardArrow({ heading, href }: { heading: string; href: string }) {
  const icon = <img className="cms-expertise-arrow" src="/icons/arrow.svg" width={23} height={23} alt="" />;
  if (!href.trim()) return icon;
  return (
    <a className="cms-expertise-link" href={href} aria-label={heading || href}>
      {icon}
    </a>
  );
}

function ThemedSurface({
  block,
  children,
}: {
  block: CmsBlock;
  children: React.ReactNode;
}) {
  const theme = resolveTheme(block);
  return (
    <section className={`cms-surface cms-theme-${theme}`}>
      {theme === "mist" ? <ModuleShape /> : null}
      <div className="cms-surface-inner">{children}</div>
    </section>
  );
}

function ModuleShape() {
  return (
    <img
      className="cms-media-shape"
      src="/icons/about-shape.svg"
      width={1440}
      height={833}
      alt=""
    />
  );
}

function ModuleCopy({ block }: { block: CmsBlock }) {
  return (
    <div className="cms-module-copy">
      {block.eyebrow ? <p className="cms-eyebrow">{block.eyebrow}</p> : null}
      {block.heading ? <h2>{block.heading}</h2> : null}
      {block.body ? <p className="cms-module-text">{block.body}</p> : null}
      {block.buttonLabel ? (
        <a className="btn btn-dark" href={block.buttonHref || "#"}>
          {block.buttonLabel}
        </a>
      ) : null}
    </div>
  );
}

function ModulePhoto({ src }: { src?: string }) {
  if (src) {
    return <img className="cms-media-photo" src={src} alt="" />;
  }
  return <div className="cms-media-photo cms-photo-fallback" />;
}

function PairPhotos({ block }: { block: CmsBlock }) {
  return (
    <div className="cms-pair-photos">
      {block.image ? (
        <img src={block.image} alt="" />
      ) : (
        <div className="cms-photo-fallback" />
      )}
      {block.image2 ? (
        <img src={block.image2} alt="" />
      ) : (
        <div className="cms-photo-fallback" />
      )}
    </div>
  );
}
