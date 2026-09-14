import { describe, expect, it } from "vitest";
import {
  readyTaskSchema,
  canStartTask,
  canLaunch,
  dayOffset,
} from "../src/lib/domain/rules";
describe("Operating guardrails", () => {
  it("requires the complete Definition of Ready", () => {
    expect(
      readyTaskSchema.safeParse({
        owner_id: null,
        effort: 4,
        definition_of_done: " ",
      }).success,
    ).toBe(false);
    expect(
      readyTaskSchema.safeParse({
        owner_id: "11111111-1111-4111-8111-111111111111",
        approver_id: "11111111-1111-4111-8111-111111111111",
        effort: 3,
        due_date: "2026-09-18",
        definition_of_done: "Prototype reviewed",
      }).success,
    ).toBe(true);
  });
  it("prevents WIP overflow without a reasoned founder override", () => {
    expect(canStartTask(1)).toBe(true);
    expect(canStartTask(2)).toBe(false);
    expect(canStartTask(2, true, " ")).toBe(false);
    expect(canStartTask(2, true, "Gỡ blocker launch")).toBe(true);
  });
  it("does not consider an empty or incomplete launch checklist ready", () => {
    expect(canLaunch([])).toBe(false);
    expect(canLaunch([true, false])).toBe(false);
    expect(canLaunch([true, true])).toBe(true);
  });
  it("computes roadmap dates across month/year boundaries", () => {
    expect(dayOffset("2026-12-28", 7)).toBe("2027-01-04");
  });
});
