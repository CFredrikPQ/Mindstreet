import { Header } from "@/components/header";
import { Offering } from "@/components/offering";
import { about, expertise, footer, hero, intro, news, seminar } from "@/content/home";

export default function HomePage() {
  return (
    <>
      <section className="hero" id="top">
        <img
          className="hero-photo"
          src="/images/hero.jpg"
          alt=""
        />
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
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <img
                  className="arrow"
                  src="/icons/arrow.svg"
                  width={23}
                  height={23}
                  alt=""
                />
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
            src={about.image.src}
            alt={about.image.alt}
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
          <img src="/images/seminar.jpg" alt={seminar.imageAlt} />
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

      <footer className="site-footer" id="kontakt">
        <img
          src="/icons/logo-footer.svg"
          width={165}
          height={32}
          alt="Mindstreet"
        />
        <address>
          {footer.address.map((line) => (
            <span key={line}>{line}</span>
          ))}
          <a href={footer.phone.href}>{footer.phone.label}</a>
          <a href={`mailto:${footer.email}`}>{footer.email}</a>
        </address>
        <a
          className="linkedin"
          href={footer.linkedIn}
          target="_blank"
          rel="noreferrer"
          aria-label="Mindstreet på LinkedIn"
        >
          <img src="/icons/linkedin.svg" width={47} height={47} alt="" />
          <img
            className="linkedin-mark"
            src="/icons/linkedin-mark.svg"
            width={22}
            height={25}
            alt=""
          />
        </a>
      </footer>
    </>
  );
}
