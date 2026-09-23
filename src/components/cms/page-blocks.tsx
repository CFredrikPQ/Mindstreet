import { Header } from "@/components/header";
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
      <section className="intro">
        <h2>{block.heading}</h2>
        <p>{block.body}</p>
      </section>
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
