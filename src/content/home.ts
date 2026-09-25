/**
 * Homepage content from the Figma frontpage.
 * Replace this module when the CMS is added.
 */

export const menuItems = [
  { label: "About", href: "#om-mindstreet" },
  { label: "Services", href: "#expertomraden" },
  { label: "Insights", href: "#nyheter" },
  { label: "Recent", href: "#seminar" },
  { label: "About", href: "#erbjudande" },
  { label: "Contact", href: "#kontakt" },
] as const;

export const hero = {
  title: "Guiding the future of banking",
  primaryCta: { label: "Våra tjänster", href: "#expertomraden" },
  secondaryCta: { label: "Bli en av oss", href: "#kontakt" },
};

export const intro = {
  heading:
    "Vi kan bank och finans. Erfarna, kompetenta konsulter som kliver in och får saker gjorda.",
  body: "Våra konsulter kan AML. Vi driver program och projekt, gör gapanalyser och bemannar interimroller – men vi går också in hands-on som AML- och KYC-specialister, transaktionsmonitorerare och riskmodellerare. Vi stöttar dessutom i rekryteringsprocesser, rådgivning och utbildning.",
};

const expertiseBody =
  "Betalningsmarknaden förändras i rasande fart. Samtidigt som nya betaltjänster växer fram, ställs allt högre krav på att branschen ska anpassa sig till nya regler och ny infrastruktur.";

export const expertise = {
  title: "Våra expertområden",
  items: [
    { title: "Betalningar", body: expertiseBody, href: "/expertomraden/betalningar" },
    { title: "Kreditrisk", body: expertiseBody, href: "/expertomraden/kreditrisk" },
    { title: "AML", body: expertiseBody, href: "/expertomraden/aml" },
    { title: "Systembyten/Tech", body: expertiseBody, href: "/expertomraden/systembyten" },
  ],
};

export type OfferingItem = {
  title: string;
  body?: string;
  cta?: { label: string; href: string };
};

const offeringBody =
  "Ibland behöver man ett bollplank, ett annat perspektiv och en djupare kompetens i ett ämne. Mindstreet hjälper dig med seniora rådgivare till ledningsgrupper, specifika projekt eller inför större beslut.";

const offeringCta = { label: "Read more", href: "#kontakt" };

export const offering: { title: string; items: OfferingItem[] } = {
  title: "Vårt erbjudande",
  items: [
    { title: "Konsulttjänster", body: offeringBody, cta: offeringCta },
    { title: "Interimstjänster", body: offeringBody, cta: offeringCta },
    { title: "Rådgivning", body: offeringBody, cta: offeringCta },
    { title: "Rekrytering", body: offeringBody, cta: offeringCta },
  ],
};

export const about = {
  title: "Om Mindstreet",
  body: "Vi har en bred och lång samlad erfarenhet från bank och finans vilket är den branschen som vi vill verka inom och tycker är spännande. För oss är drivkraften att få hjälpa en kund och samtidigt skapa en bra arbetssituation för våra konsulter.",
  cta: { label: "Read more", href: "#kontakt" },
  image: {
    src: "/images/about.jpg",
    alt: "Kvinna med laptop i en ljus kontorsmiljö",
  },
};

export type NewsCard = {
  image: string;
  alt: string;
  caption: string;
  href: string;
};

export type NewsWelcome = {
  image: string;
  alt: string;
  captionLead: string;
  captionLink: { label: string; href: string };
  captionTail: string;
};

export const news: { title: string; items: Array<NewsCard | NewsWelcome> } = {
  title: "Mindblowing news",
  items: [
    {
      image: "/images/news-1.jpg",
      alt: "Kollegor i samtal utanför en kontorsentré",
      caption: "Behöver du en interimschef från branschen?",
      href: "#nyheter",
    },
    {
      image: "/images/news-3.jpg",
      alt: "Man som arbetar vid ett skrivbord i ett kontor",
      caption: "Tips på hur du lyckas med ett systembyte",
      href: "#nyheter",
    },
    {
      image: "/images/news-2.jpg",
      alt: "Två kollegor vid ett bord",
      captionLead: "Vi välkomnar ytterligare en stjärnkollega ",
      captionLink: {
        label: "Anders Gustafsson",
        href: "https://www.linkedin.com/in/anders-gustafsson-89a9133/",
      },
      captionTail: " till Mindstreet-teamet!",
    },
    {
      image: "/images/news-4.jpg",
      alt: "Två män i kostym på en trappa",
      caption: "Tips på hur du lyckas med ett systembyte",
      href: "#nyheter",
    },
  ],
};

export const seminar = {
  kicker: "Rådmansgatan 14",
  title: "Morning seminar",
  cta: { label: "Sign up", href: "#kontakt" },
  imageAlt: "Träinrett kök och samlingsrum",
};

export const footer = {
  address: ["Rådmansgatan 14", "114 25 Stockholm"],
  phone: { label: "08-579 20 000", href: "tel:+46857920000" },
  email: "hello@mindstreet.se",
  linkedIn: "https://www.linkedin.com/company/mindstreet",
};
