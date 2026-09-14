import { CampaignDetail } from "@/components/modules/campaigns";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <CampaignDetail id={campaignId} />;
}
