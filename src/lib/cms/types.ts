export type BlockType =
  | "hero"
  | "text"
  | "split"
  | "banner"
  | "imageText"
  | "imagePair"
  | "sectionHeader"
  | "highlight"
  | "lead"
  | "article"
  | "expertise"
  | "offering"
  | "statement";

export type ImageSide = "left" | "right";
export type BlockAlign = "left" | "center";
export type BlockTheme = "sand" | "mist" | "cream" | "white";

export type CmsCard = {
  id: string;
  heading: string;
  body: string;
  href: string;
  buttonLabel?: string;
};

export type CmsBlock = {
  id: string;
  type: BlockType;
  heading: string;
  body: string;
  items?: CmsCard[];
  image?: string;
  image2?: string;
  eyebrow?: string;
  buttonLabel?: string;
  buttonHref?: string;
  quote?: string;
  quoteAfter?: number;
  imageSide?: ImageSide;
  align?: BlockAlign;
  theme?: BlockTheme;
};

export type CmsLink = {
  label: string;
  href: string;
};

export type CmsPage = {
  slug: string;
  title: string;
  parentSlug?: string;
  published: boolean;
  links: CmsLink[];
  blocks: CmsBlock[];
};
