import { TaskDetail } from "@/components/modules/work";
export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetail id={taskId} />;
}
