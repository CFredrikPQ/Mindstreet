import { CmsRoute } from "@/components/cms/cms-route";

export const dynamic = "force-dynamic";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <CmsRoute slug={slug.join("/")} />;
}
