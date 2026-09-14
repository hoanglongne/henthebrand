import { notFound } from "next/navigation";
import { Campaigns } from "@/components/modules/campaigns";
import { ContentStudio } from "@/components/modules/content";
import { Operations } from "@/components/modules/operations";
import { Timeline } from "@/components/modules/timeline";
import { Settings } from "@/components/modules/settings";
const pages: Record<string, React.ComponentType> = {
  campaigns: Campaigns,
  content: ContentStudio,
  operations: Operations,
  timeline: Timeline,
  settings: Settings,
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return {
    title:
      (
        {
          campaigns: "Campaigns",
          content: "Content Studio",
          operations: "Operations",
          timeline: "Timeline",
          settings: "Settings",
        } as Record<string, string>
      )[section] ?? "HẸN",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const Component = pages[section];
  if (!Component) notFound();
  return <Component />;
}
