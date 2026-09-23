import type { BlockType, CmsBlock } from "@/lib/cms/types";

export const SITE_HOST = "www.mindstreet.se";

const loremBody =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

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
];

const defaults: Record<BlockType, Pick<CmsBlock, "heading" | "body">> = {
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
};

export function createBlock(type: BlockType): CmsBlock {
  return {
    id: crypto.randomUUID(),
    type,
    heading: defaults[type].heading,
    body: defaults[type].body,
  };
}

export function blockLabel(type: BlockType): string {
  return library.find((item) => item.type === type)?.label ?? type;
}

export function blockHasImage(type: BlockType): boolean {
  return type === "hero" || type === "split" || type === "banner";
}

export function fieldsFor(type: BlockType): { heading: string; body: string; image: boolean } {
  if (type === "banner") {
    return { heading: "Rubrik", body: "Liten rad", image: true };
  }

  return {
    heading: "Rubrik",
    body: "Text",
    image: blockHasImage(type),
  };
}
