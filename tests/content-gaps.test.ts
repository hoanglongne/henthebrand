import { it, expect } from "vitest";
import { campaignContentGaps } from "../src/lib/domain/rules";
const today = "2026-11-01";
const campaign = {
  id: "c1",
  name: "Tết gặp lại",
  launch: "2026-11-08",
  status: "preparing",
};
it("flags a campaign whose linked content is not scheduled yet", () => {
  const gaps = campaignContentGaps(
    [campaign],
    [
      { campaign: "c1", status: "Script" },
      { campaign: "c1", status: "Published" },
      { campaign: "other", status: "Idea" },
    ],
    14,
    today,
  );
  expect(gaps).toHaveLength(1);
  expect(gaps[0]).toMatchObject({ total: 2, ready: 1, days: 7 });
});
it("flags a soon campaign with no content at all", () => {
  const gaps = campaignContentGaps([campaign], [], 14, today);
  expect(gaps[0]).toMatchObject({ total: 0, ready: 0 });
});
it("stays quiet when every linked piece is scheduled or published", () => {
  expect(
    campaignContentGaps(
      [campaign],
      [
        { campaign: "c1", status: "Scheduled" },
        { campaign: "c1", status: "Published" },
      ],
      14,
      today,
    ),
  ).toEqual([]);
});
it("ignores campaigns that already ended, launched in the past, or are far away", () => {
  expect(
    campaignContentGaps(
      [
        { ...campaign, status: "complete" },
        { ...campaign, id: "past", launch: "2026-10-20" },
        { ...campaign, id: "far", launch: "2026-12-30" },
      ],
      [],
      14,
      today,
    ),
  ).toEqual([]);
});
it("sorts the most urgent campaign first", () => {
  const gaps = campaignContentGaps(
    [
      { ...campaign, id: "later", launch: "2026-11-12" },
      { ...campaign, id: "sooner", launch: "2026-11-03" },
    ],
    [],
    14,
    today,
  );
  expect(gaps.map((g) => g.id)).toEqual(["sooner", "later"]);
});
