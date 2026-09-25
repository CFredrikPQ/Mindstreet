import type { BlockTheme, BlockType, CmsBlock, CmsCard } from "@/lib/cms/types";

export const SITE_HOST = "www.mindstreet.se";

const loremBody =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const experienceHeading =
  "Vi har en bred och lång samlad erfarenhet från bank och finans";

const leadHeading =
  "Vi kan bank och finans. Erfarna, kompetenta konsulter som kliver in och får saker gjorda.";

const leadBody =
  "Våra konsulter kan AML. Vi driver program och projekt, gör gapanalyser och bemannar interimroller – men vi går också in hands-on som AML- och KYC-specialister, transaktionsmonitorerare och riskmodellerare. Vi stöttar dessutom i rekryteringsprocesser, rådgivning och utbildning.";

export type BlockFields = {
  heading: string | null;
  body: string | null;
  eyebrow: boolean;
  image: boolean;
  image2: boolean;
  button: boolean;
  imageSide: boolean;
  align: boolean;
  theme: boolean;
  quote: boolean;
};

export const themes: {
  id: BlockTheme;
  label: string;
  color: string;
}[] = [
  { id: "sand", label: "Sand", color: "rgba(205, 183, 151, 0.5)" },
  { id: "mist", label: "Dimma", color: "#e9edef" },
  { id: "cream", label: "Grädde", color: "#ede1da" },
  { id: "white", label: "Vit", color: "#fff" },
];

export const library: {
  type: BlockType;
  label: string;
  description: string;
}[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Helbild med rubrik",
  },
  {
    type: "lead",
    label: "Ingress",
    description: "Stor rubrik och text",
  },
  {
    type: "text",
    label: "Text",
    description: "Rubrik och stycke",
  },
  {
    type: "imageText",
    label: "Bild och text",
    description: "Ett foto, överrad och knapp",
  },
  {
    type: "imagePair",
    label: "Två bilder och text",
    description: "Två överlappande foton",
  },
  {
    type: "split",
    label: "Bild och text (startsida)",
    description: "Den äldre split-layouten",
  },
  {
    type: "sectionHeader",
    label: "Sektionsrubrik",
    description: "Rubrik med linje",
  },
  {
    type: "banner",
    label: "Banner",
    description: "Bakgrundsbild och rubrik",
  },
  {
    type: "highlight",
    label: "Highlight",
    description: "Helbild med knapp",
  },
  {
    type: "article",
    label: "Artikel",
    description: "Längre text, bild och citat",
  },
  {
    type: "expertise",
    label: "Expertområden",
    description: "Kort med rubrik, text och länk",
  },
  {
    type: "offering",
    label: "Erbjudande",
    description: "Utfällbara rader med länk",
  },
];

const defaults: Record<BlockType, Omit<CmsBlock, "id" | "type">> = {
  hero: {
    heading: "Lorem ipsum",
    body: loremBody,
  },
  text: {
    heading: "Lorem ipsum dolor sit amet",
    body: loremBody,
    theme: "white",
  },
  split: {
    heading: "Lorem ipsum dolor",
    body: loremBody,
  },
  banner: {
    heading: "Lorem ipsum",
    body: "Lorem ipsum",
  },
  imageText: {
    heading: experienceHeading,
    body: "",
    eyebrow: "Om Mindstreet",
    buttonLabel: "Läs mer",
    buttonHref: "/#kontakt",
    imageSide: "right",
    image: "/images/about.jpg",
    theme: "sand",
  },
  imagePair: {
    heading: experienceHeading,
    body: "",
    eyebrow: "Om Mindstreet",
    buttonLabel: "Läs mer",
    buttonHref: "/#kontakt",
    imageSide: "left",
    image: "/images/news-2.jpg",
    image2: "/images/news-4.jpg",
    theme: "sand",
  },
  sectionHeader: {
    heading: "Våra tjänster",
    body: "",
    align: "left",
    theme: "white",
  },
  highlight: {
    heading: "Morning seminar",
    body: "Rådmansgatan 14",
    buttonLabel: "Anmäl dig",
    buttonHref: "/#kontakt",
    image: "/images/seminar.jpg",
  },
  lead: {
    heading: leadHeading,
    body: leadBody,
    theme: "white",
  },
  article: {
    heading: "Lorem ipsum dolor sit amet",
    body: `${loremBody}\n\n${loremBody}`,
    image: "/images/about.jpg",
    imageSide: "right",
    theme: "white",
  },
  expertise: {
    heading: "Våra expertområden",
    body: "",
  },
  offering: {
    heading: "Vårt erbjudande",
    body: "",
  },
};

const expertiseCardBody =
  "Betalningsmarknaden förändras i rasande fart. Samtidigt som nya betaltjänster växer fram, ställs allt högre krav på att branschen ska anpassa sig till nya regler och ny infrastruktur.";

const expertiseCardHeadings = ["Betalningar", "Kreditrisk", "AML", "Systembyten/Tech"];

export function createCard(heading = "Nytt område"): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading,
    body: expertiseCardBody,
    href: "",
  };
}

export function createExpertiseItems(): CmsCard[] {
  return expertiseCardHeadings.map((heading) => createCard(heading));
}

const offeringAdvice =
  "Ibland behöver man ett bollplank, ett annat perspektiv och en djupare kompetens i ett ämne. Mindstreet hjälper dig med seniora rådgivare till ledningsgrupper, specifika projekt eller inför större beslut.";

export function createOfferingRow(heading: string, body = "", buttonLabel = ""): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading,
    body,
    href: "",
    buttonLabel,
  };
}

export function createOfferingItems(): CmsCard[] {
  return [
    createOfferingRow("Konsulttjänster"),
    createOfferingRow("Interimstjänster"),
    createOfferingRow("Rådgivning", offeringAdvice, "Les mer"),
    createOfferingRow("Rekrytering"),
  ];
}

export function articleParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function quoteAfterIndex(quoteAfter: number | undefined, count: number): number {
  if (count === 0) return -1;
  const raw = quoteAfter ?? 0;
  if (raw < 0) return -1;
  return Math.min(raw, count - 1);
}

export function createBlock(type: BlockType): CmsBlock {
  return {
    id: crypto.randomUUID(),
    type,
    ...defaults[type],
    ...(type === "expertise" ? { items: createExpertiseItems() } : {}),
    ...(type === "offering" ? { items: createOfferingItems() } : {}),
  };
}

export function cloneTemplateBlocks(blocks: CmsBlock[]): CmsBlock[] {
  return blocks.map((block) => {
    const next: CmsBlock = {
      id: crypto.randomUUID(),
      type: block.type,
      heading: "",
      body: "",
    };
    if (block.imageSide) next.imageSide = block.imageSide;
    if (block.align) next.align = block.align;
    if (block.theme) next.theme = block.theme;
    if (block.quote !== undefined) {
      next.quote = "";
      if (block.quoteAfter !== undefined) next.quoteAfter = block.quoteAfter;
    }
    return next;
  });
}

export function blockLabel(type: BlockType): string {
  return library.find((item) => item.type === type)?.label ?? type;
}

export function blockHasImage(type: BlockType): boolean {
  return (
    type === "hero" ||
    type === "split" ||
    type === "banner" ||
    type === "imageText" ||
    type === "imagePair" ||
    type === "highlight" ||
    type === "article"
  );
}

export function blockHasTheme(type: BlockType): boolean {
  return (
    type === "imageText" ||
    type === "imagePair" ||
    type === "text" ||
    type === "lead" ||
    type === "sectionHeader" ||
    type === "article"
  );
}

export function resolveTheme(block: CmsBlock): BlockTheme {
  if (block.theme) return block.theme;
  if (block.type === "imageText" || block.type === "imagePair") {
    return block.imageSide === "left" ? "mist" : "sand";
  }
  return "white";
}

const none: Omit<BlockFields, "heading" | "body"> = {
  eyebrow: false,
  image: false,
  image2: false,
  button: false,
  imageSide: false,
  align: false,
  theme: false,
  quote: false,
};

export function fieldsFor(type: BlockType): BlockFields {
  if (type === "banner") {
    return { ...none, heading: "Rubrik", body: "Liten rad", image: true };
  }

  if (type === "imageText") {
    return {
      ...none,
      heading: "Rubrik",
      body: null,
      eyebrow: true,
      image: true,
      button: true,
      imageSide: true,
      theme: true,
    };
  }

  if (type === "imagePair") {
    return {
      ...none,
      heading: "Rubrik",
      body: null,
      eyebrow: true,
      image: true,
      image2: true,
      button: true,
      imageSide: true,
      theme: true,
    };
  }

  if (type === "sectionHeader") {
    return { ...none, heading: "Rubrik", body: null, align: true, theme: true };
  }

  if (type === "highlight") {
    return { ...none, heading: "Rubrik", body: "Liten rad", image: true, button: true };
  }

  if (type === "expertise" || type === "offering") {
    return { ...none, heading: "Rubrik", body: null };
  }

  if (type === "lead" || type === "text") {
    return { ...none, heading: "Rubrik", body: "Text", theme: true };
  }

  if (type === "article") {
    return {
      ...none,
      heading: "Rubrik",
      body: "Text",
      quote: true,
      image: true,
      imageSide: true,
      theme: true,
    };
  }

  return {
    ...none,
    heading: "Rubrik",
    body: "Text",
    image: blockHasImage(type),
  };
}
