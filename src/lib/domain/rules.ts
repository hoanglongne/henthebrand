import { z } from "zod";
export const readyTaskSchema = z.object({
  owner_id: z.string().uuid(),
  approver_id: z.string().uuid(),
  due_date: z.iso.date(),
  effort: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(5),
    z.literal(8),
    z.literal(13),
  ]),
  definition_of_done: z.string().trim().min(1),
});
export function canStartTask(
  activeCount: number,
  founderOverride = false,
  reason = "",
) {
  return activeCount < 2 || (founderOverride && reason.trim().length > 0);
}
export function canLaunch(
  requiredItems: boolean[],
  founderOverride = false,
  reason = "",
) {
  return (
    (requiredItems.length > 0 && requiredItems.every(Boolean)) ||
    (founderOverride && reason.trim().length > 0)
  );
}
export function dayOffset(start: string, days: number) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export const readyContentStates = ["Scheduled", "Published"];
// Campaign sắp mở mà nội dung chưa lên lịch/xuất bản là rủi ro đội hay bỏ sót.
export function campaignContentGaps(
  campaigns: { id: string; name: string; launch: string; status: string }[],
  content: { campaign: string; status: string }[],
  withinDays = 14,
  today = new Date().toISOString().slice(0, 10),
) {
  const limit = dayOffset(today, withinDays);
  return campaigns
    .filter(
      (c) =>
        !["complete", "cancelled"].includes(c.status) &&
        c.launch >= today &&
        c.launch <= limit,
    )
    .map((c) => {
      const linked = content.filter((item) => item.campaign === c.id);
      const ready = linked.filter((item) =>
        readyContentStates.includes(item.status),
      ).length;
      const days = Math.round(
        (Date.parse(`${c.launch}T00:00:00Z`) -
          Date.parse(`${today}T00:00:00Z`)) /
          86400000,
      );
      return { id: c.id, name: c.name, total: linked.length, ready, days };
    })
    .filter((row) => row.ready < row.total || row.total === 0)
    .sort((a, b) => a.days - b.days);
}
