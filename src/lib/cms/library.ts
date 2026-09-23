import type { BlockType, CmsBlock } from "@/lib/cms/types";

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
};

export const library: {
  type: BlockType;
  label: string;
  description: string;
}[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Bakgrundsbild, rubrik och text",
  },
  {
    type: "text",
    label: "Text",
    description: "Rubrik och stycke",
  },
  {
    type: "split",
    label: "Bild och text",
    description: "Foto, rubrik och text",
  },
  {
    type: "banner",
    label: "Banner",
    description: "Bakgrundsbild, liten rad och rubrik",
  },
  {
    type: "imageText",
    label: "Text och bild",
    description: "Överrad, rubrik och knapp med bild till vänster eller höger",
  },
  {
    type: "imagePair",
    label: "Dubbelbild och text",
    description: "Två överlappande foton, överrad, rubrik och knapp",
  },
  {
    type: "sectionHeader",
    label: "Sektionsrubrik",
    description: "Rubrik med linje, vänsterställd eller centrerad",
  },
  {
    type: "highlight",
    label: "Highlight",
    description: "Helbreddsbild med etikett, rubrik och knapp",
  },
  {
    type: "lead",
    label: "Ingress",
    description: "Stor rubrik till vänster och stycke till höger",
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
  },
  sectionHeader: {
    heading: "Våra tjänster",
    body: "",
    align: "left",
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
  },
};

export function createBlock(type: BlockType): CmsBlock {
  return {
    id: crypto.randomUUID(),
    type,
    ...defaults[type],
  };
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
    type === "highlight"
  );
}

export function fieldsFor(type: BlockType): BlockFields {
  if (type === "banner") {
    return {
      heading: "Rubrik",
      body: "Liten rad",
      eyebrow: false,
      image: true,
      image2: false,
      button: false,
      imageSide: false,
      align: false,
    };
  }

  if (type === "imageText") {
    return {
      heading: "Rubrik",
      body: null,
      eyebrow: true,
      image: true,
      image2: false,
      button: true,
      imageSide: true,
      align: false,
    };
  }

  if (type === "imagePair") {
    return {
      heading: "Rubrik",
      body: null,
      eyebrow: true,
      image: true,
      image2: true,
      button: true,
      imageSide: true,
      align: false,
    };
  }

  if (type === "sectionHeader") {
    return {
      heading: "Rubrik",
      body: null,
      eyebrow: false,
      image: false,
      image2: false,
      button: false,
      imageSide: false,
      align: true,
    };
  }

  if (type === "highlight") {
    return {
      heading: "Rubrik",
      body: "Liten rad",
      eyebrow: false,
      image: true,
      image2: false,
      button: true,
      imageSide: false,
      align: false,
    };
  }

  if (type === "lead") {
    return {
      heading: "Rubrik",
      body: "Text",
      eyebrow: false,
      image: false,
      image2: false,
      button: false,
      imageSide: false,
      align: false,
    };
  }

  return {
    heading: "Rubrik",
    body: "Text",
    eyebrow: false,
    image: blockHasImage(type),
    image2: false,
    button: false,
    imageSide: false,
    align: false,
  };
}
