export type BlockType =
  | "hero"
  | "text"
  | "split"
  | "banner"
  | "imageText"
  | "imagePair"
  | "sectionHeader"
  | "highlight"
  | "lead";

export type ImageSide = "left" | "right";
export type BlockAlign = "left" | "center";

export type CmsBlock = {
  id: string;
  type: BlockType;
  heading: string;
  body: string;
  image?: string;
  image2?: string;
  eyebrow?: string;
  buttonLabel?: string;
  buttonHref?: string;
  imageSide?: ImageSide;
  align?: BlockAlign;
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
