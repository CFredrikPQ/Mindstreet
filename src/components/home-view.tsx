"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Offering } from "@/components/offering";
import { SiteFooter } from "@/components/site-footer";
import { about as aboutFallback, news } from "@/content/home";
import { defaultHomeContent, loadHome, type HomeContent } from "@/lib/cms/home";

export function HomeView({ content }: { content?: HomeContent }) {
  const [stored, setStored] = useState<HomeContent>(defaultHomeContent);
  const controlled = content !== undefined;

  useEffect(() => {
    if (controlled) return;
    setStored(loadHome());
  }, [controlled]);

  const { hero, intro, expertise, about, seminar } = content ?? stored;

  return (
    <>
      <section className="hero" id="top">
        <img className="hero-photo" src="/images/hero.jpg" alt="" />
        <div className="hero-shade" />
        <img
          className="hero-shape"
          src="/icons/hero-shape.svg"
          width={1840}
          height={1054}
          alt=""
        />
        <Header />
        <div className="hero-content">
          <h1>{hero.title}</h1>
          <div className="hero-actions">
            <a className="btn btn-light" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </a>
            <a className="btn btn-light" href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </section>

      <section className="intro">
        <h2>{intro.heading}</h2>
        <p>{intro.body}</p>
      </section>

      <section className="expertise" id="expertomraden">
        <div className="section-inner">
          <h2>{expertise.title}</h2>
          <div className="expertise-grid">
            {expertise.items.map((item) => (
              <article key={item.href}>
                <a href={item.href}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <img
                    className="arrow"
                    src="/icons/arrow.svg"
                    width={23}
                    height={23}
                    alt=""
                  />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Offering />

      <section className="about" id="om-mindstreet">
        <img
          className="about-shape"
          src="/icons/about-shape.svg"
          width={1440}
          height={833}
          alt=""
        />
        <div className="about-inner">
          <img
            className="about-photo"
            src={aboutFallback.image.src}
            alt={aboutFallback.image.alt}
          />
          <div className="about-copy">
            <h2>{about.title}</h2>
            <p>{about.body}</p>
            <a className="btn btn-dark" href={about.cta.href}>
              {about.cta.label}
            </a>
          </div>
        </div>
      </section>

      <section className="news" id="nyheter">
        <div className="section-inner">
          <h2>{news.title}</h2>
          <div className="news-grid">
            {news.items.map((item) => (
              <article key={item.image}>
                <img src={item.image} alt={item.alt} />
                {"caption" in item ? (
                  <a href={item.href}>{item.caption}</a>
                ) : (
                  <p>
                    {item.captionLead}
                    <a href={item.captionLink.href} target="_blank" rel="noreferrer">
                      {item.captionLink.label}
                    </a>
                    {item.captionTail}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="seminar-wrap" id="seminar">
        <div className="seminar">
          <img src="/images/seminar.jpg" alt="Träinrett kök och samlingsrum" />
          <div className="seminar-shade" />
          <div className="seminar-copy">
            <p>{seminar.kicker}</p>
            <h2>{seminar.title}</h2>
            <a className="btn btn-cream" href={seminar.cta.href}>
              {seminar.cta.label}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
