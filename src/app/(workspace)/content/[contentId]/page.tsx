import { ContentItemPage } from "@/components/modules/content";
export default async function Page({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  return <ContentItemPage id={contentId} />;
}
