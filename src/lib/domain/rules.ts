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
