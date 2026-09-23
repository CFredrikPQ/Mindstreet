import { about, expertise, hero, intro, seminar } from "@/content/home";

export const HOME_SELECTION = "__home__";
const STORAGE_KEY = "mindstreet-cms-home";

export type HomeExpertiseItem = {
  title: string;
  body: string;
  href: string;
};

export type HomeContent = {
  hero: {
    title: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  intro: {
    heading: string;
    body: string;
  };
  expertise: {
    title: string;
    items: HomeExpertiseItem[];
  };
  about: {
    title: string;
    body: string;
    cta: { label: string; href: string };
  };
  seminar: {
    kicker: string;
    title: string;
    cta: { label: string; href: string };
  };
};

export function defaultHomeContent(): HomeContent {
  return {
    hero: {
      title: hero.title,
      primaryCta: { ...hero.primaryCta },
      secondaryCta: { ...hero.secondaryCta },
    },
    intro: { ...intro },
    expertise: {
      title: expertise.title,
      items: expertise.items.map((item) => ({ ...item })),
    },
    about: {
      title: about.title,
      body: about.body,
      cta: { ...about.cta },
    },
    seminar: {
      kicker: seminar.kicker,
      title: seminar.title,
      cta: { ...seminar.cta },
    },
  };
}

export function loadHome(): HomeContent {
  const fallback = defaultHomeContent();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return hydrateHome(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function writeHome(content: HomeContent): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    return null;
  } catch {
    return "Kunde inte spara startsidan.";
  }
}

function hydrateHome(value: unknown, fallback: HomeContent): HomeContent {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<HomeContent>;
  const items = Array.isArray(raw.expertise?.items)
    ? raw.expertise.items
        .map((item, index) => hydrateItem(item, fallback.expertise.items[index]))
        .filter((item): item is HomeExpertiseItem => item !== null)
    : fallback.expertise.items;

  return {
    hero: {
      title: text(raw.hero?.title, fallback.hero.title),
      primaryCta: {
        label: text(raw.hero?.primaryCta?.label, fallback.hero.primaryCta.label),
        href: text(raw.hero?.primaryCta?.href, fallback.hero.primaryCta.href),
      },
      secondaryCta: {
        label: text(raw.hero?.secondaryCta?.label, fallback.hero.secondaryCta.label),
        href: text(raw.hero?.secondaryCta?.href, fallback.hero.secondaryCta.href),
      },
    },
    intro: {
      heading: text(raw.intro?.heading, fallback.intro.heading),
      body: text(raw.intro?.body, fallback.intro.body),
    },
    expertise: {
      title: text(raw.expertise?.title, fallback.expertise.title),
      items: items.length === fallback.expertise.items.length ? items : fallback.expertise.items,
    },
    about: {
      title: text(raw.about?.title, fallback.about.title),
      body: text(raw.about?.body, fallback.about.body),
      cta: {
        label: text(raw.about?.cta?.label, fallback.about.cta.label),
        href: text(raw.about?.cta?.href, fallback.about.cta.href),
      },
    },
    seminar: {
      kicker: text(raw.seminar?.kicker, fallback.seminar.kicker),
      title: text(raw.seminar?.title, fallback.seminar.title),
      cta: {
        label: text(raw.seminar?.cta?.label, fallback.seminar.cta.label),
        href: text(raw.seminar?.cta?.href, fallback.seminar.cta.href),
      },
    },
  };
}

function hydrateItem(value: unknown, fallback?: HomeExpertiseItem): HomeExpertiseItem | null {
  if (!fallback) return null;
  if (!value || typeof value !== "object") return { ...fallback };
  const item = value as Partial<HomeExpertiseItem>;
  return {
    title: text(item.title, fallback.title),
    body: text(item.body, fallback.body),
    href: text(item.href, fallback.href),
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
