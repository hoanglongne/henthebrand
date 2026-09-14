import { Shell } from "@/components/shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { getSnapshot } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getSnapshot();
  return (
    <WorkspaceProvider initial={data}>
      <Shell mode={data.mode}>{children}</Shell>
    </WorkspaceProvider>
  );
}
