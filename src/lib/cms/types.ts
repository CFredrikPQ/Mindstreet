export type BlockType = "hero" | "text" | "split" | "banner";

export type CmsBlock = {
  id: string;
  type: BlockType;
  heading: string;
  body: string;
  image?: string;
};

export type CmsPage = {
  slug: string;
  blocks: CmsBlock[];
};
