"use client";
import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarBlank,
  ArrowLeft,
  ArrowRight,
} from "@phosphor-icons/react";
import { mutateMilestone } from "@/app/actions/timeline";
import { mutateCampaign } from "@/app/actions/campaigns";
import { mutateWork } from "@/app/actions/work";
import { type MilestoneCommand } from "@/lib/domain/live-timeline";
import { statusLabels, type Milestone, type Task } from "@/lib/domain/types";
import { type Campaign } from "@/lib/preview-data";
import { useWorkspace } from "../workspace-provider";
import {
  PageHeading,
  Tabs,
  Modal,
  Field,
  Badge,
  Empty,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
import { dayOffset } from "@/lib/domain/rules";
const TOTAL_WEEKS = 24;
const windowOptions = [
  { value: 24, label: "Cả 24 tuần" },
  { value: 12, label: "12 tuần" },
  { value: 8, label: "8 tuần" },
  { value: 4, label: "4 tuần" },
];
function weekOf(start: string, date: string) {
  if (!date) return null;
  const days = Math.floor(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86400000,
  );
  return Math.floor(days / 7) + 1;
}
function shiftDate(date: string | undefined | null, weeks: number) {
  return date ? dayOffset(date, weeks * 7) : null;
}
function clampWeek(week: number) {
  return Math.min(TOTAL_WEEKS, Math.max(1, week));
}
type DragState = {
  kind: "milestone" | "campaign" | "task";
  id: string;
  mode: "move" | "resize";
  startX: number;
  offset: number;
};
function useMilestoneMutation(milestone?: Milestone) {
  const { data } = useWorkspace();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function run(command: MilestoneCommand, onSuccess?: () => void) {
    setError("");
    startTransition(async () => {
      try {
        const result = await mutateMilestone({
          workspaceId: data.workspaceId,
          milestoneId: milestone?.id ?? null,
          expected: milestone?.updated_at ?? null,
          ...command,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch {
        setError(
          "Kết nối bị gián đoạn. Tải lại để kiểm tra dữ liệu trước khi thử lại.",
        );
      }
    });
  }
  return { run, pending, error };
}
export function ConnectedTimeline() {
  const { data } = useWorkspace();
  const [view, setView] = useState("roadmap");
  const [owner, setOwner] = useState("");
  const [stream, setStream] = useState("");
  const router = useRouter();
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [span, setSpan] = useState(TOTAL_WEEKS);
  const [from, setFrom] = useState(1);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    start: number;
    end: number;
  } | null>(null);
  const [dragError, setDragError] = useState("");
  const [, startDragSave] = useTransition();
  const chartRef = useRef<HTMLDivElement>(null);
  const { run, pending, error } = useMilestoneMutation(selected ?? undefined);
  const planner = data.roles.some((r) => ["founder", "ops"].includes(r));
  const unlocked = !!data.catalogReady && planner;
  const lastWeek = Math.min(TOTAL_WEEKS, from + span - 1);
  const weeks = Array.from({ length: lastWeek - from + 1 }, (_, i) => from + i);
  const gridStyle = {
    gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
  };
  // Thanh chỉ vẽ phần nằm trong cửa sổ đang xem.
  function placement(start: number, end: number) {
    const left = Math.max(start, from);
    const right = Math.min(end, lastWeek);
    if (right < left) return null;
    return {
      gridColumn: `${left - from + 1} / ${right - from + 2}`,
    } as React.CSSProperties;
  }
  function previewFor(
    kind: DragState["kind"],
    id: string,
    start: number,
    end: number,
  ) {
    if (preview?.id === id && drag?.kind === kind)
      return { start: preview.start, end: preview.end };
    return { start, end };
  }
  const campaignRows = data.campaigns
    .map((c) => ({
      ...c,
      startWeek: weekOf(data.startDate, c.launch),
      endWeek: weekOf(data.startDate, c.end),
    }))
    .filter(
      (c): c is Campaign & { startWeek: number; endWeek: number } =>
        c.startWeek !== null && c.endWeek !== null,
    )
    .map((c) => ({
      ...c,
      startWeek: clampWeek(c.startWeek),
      endWeek: clampWeek(Math.max(c.endWeek, c.startWeek)),
    }));
  const taskWeeks = data.tasks
    .map((t) => ({ ...t, week: weekOf(data.startDate, t.due_date) }))
    .filter((t): t is Task & { week: number } => t.week !== null)
    .map((t) => ({ ...t, week: clampWeek(t.week) }));
  function startDrag(
    e: React.PointerEvent,
    kind: DragState["kind"],
    id: string,
    mode: DragState["mode"],
    anchor: number,
  ) {
    if (!unlocked) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragError("");
    setDrag({ kind, id, mode, startX: e.clientX, offset: anchor });
  }
  function weekDelta(clientX: number) {
    const width = chartRef.current?.querySelector(".roadmap-weeks")?.clientWidth;
    if (!width || !drag) return 0;
    return Math.round(((clientX - drag.startX) / width) * weeks.length);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const delta = weekDelta(e.clientX);
    if (drag.kind === "milestone") {
      const m = data.milestones.find((x) => x.id === drag.id);
      if (!m) return;
      if (drag.mode === "resize") {
        const end = clampWeek(Math.max(m.start_week, m.end_week + delta));
        setPreview({ id: drag.id, start: m.start_week, end });
      } else {
        const width = m.end_week - m.start_week;
        const start = clampWeek(
          Math.min(m.start_week + delta, TOTAL_WEEKS - width),
        );
        setPreview({ id: drag.id, start, end: start + width });
      }
    } else if (drag.kind === "campaign") {
      const c = campaignRows.find((x) => x.id === drag.id);
      if (!c) return;
      const width = c.endWeek - c.startWeek;
      const start = clampWeek(Math.min(c.startWeek + delta, TOTAL_WEEKS - width));
      setPreview({ id: drag.id, start, end: start + width });
    } else {
      const t = taskWeeks.find((x) => x.id === drag.id);
      if (!t) return;
      const week = clampWeek(t.week + delta);
      setPreview({ id: drag.id, start: week, end: week });
    }
  }
  function onPointerUp() {
    if (!drag) return;
    const moved = preview;
    const current = drag;
    setDrag(null);
    setPreview(null);
    if (!moved) return;
    startDragSave(async () => {
      try {
        const result = await saveDrag(current, moved);
        if (result) setDragError(result);
        else router.refresh();
      } catch {
        setDragError("Kết nối bị gián đoạn. Tải lại để kiểm tra dữ liệu.");
      }
    });
  }
  async function saveDrag(
    current: DragState,
    moved: { start: number; end: number },
  ): Promise<string | null> {
    if (current.kind === "milestone") {
      const m = data.milestones.find((x) => x.id === current.id);
      if (!m || (m.start_week === moved.start && m.end_week === moved.end))
        return null;
      const r = await mutateMilestone({
        workspaceId: data.workspaceId,
        milestoneId: m.id,
        expected: m.updated_at ?? null,
        operation: "update",
        payload: {
          name: m.name,
          description: m.description,
          start_week: moved.start,
          end_week: moved.end,
        },
      });
      return r.ok ? null : r.message;
    }
    if (current.kind === "campaign") {
      const c = campaignRows.find((x) => x.id === current.id);
      if (!c || c.startWeek === moved.start) return null;
      const shift = moved.start - c.startWeek;
      const r = await mutateCampaign({
        workspaceId: data.workspaceId,
        campaignId: c.id,
        expected: c.updated_at ?? null,
        operation: "update",
        payload: {
          name: c.name,
          product_id: c.product_id ?? null,
          owner_id: c.owner_id ?? null,
          occasion: c.occasion,
          channel: c.channel,
          launch_date: shiftDate(c.launch, shift)!,
          end_date: shiftDate(c.end, shift)!,
          budget: c.budget,
          target_orders: c.orders,
          brief: c.brief,
          stop_condition: c.stop,
          // Các hạn phụ dời theo để không phá ràng buộc ngày của campaign.
          brief_due: shiftDate(c.briefDue, shift),
          asset_due: shiftDate(c.assetDue, shift),
          postmortem_due: shiftDate(c.postmortemDue, shift),
          cutoff_date: shiftDate(c.cutoff, shift),
          support_note: c.support ?? "",
        },
      });
      return r.ok ? null : r.message;
    }
    const t = taskWeeks.find((x) => x.id === current.id);
    if (!t || t.week === moved.start) return null;
    const r = await mutateWork({
      workspaceId: data.workspaceId,
      taskId: t.id,
      expected: t.updated_at ?? null,
      operation: "update",
      payload: {
        title: t.title,
        owner_id: t.owner_id ?? null,
        approver_id: t.approver_id ?? null,
        product_id: t.product_id ?? null,
        priority: t.priority,
        effort: t.effort,
        due_date: dayOffset(t.due_date, (moved.start - t.week) * 7),
        definition_of_done: t.definition_of_done,
        workstream: t.workstream,
      },
    });
    return r.ok ? null : r.message;
  }
  const tasks = data.tasks.filter(
    (t) =>
      (!owner || t.owner === owner) && (!stream || t.workstream === stream),
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") || "").trim(),
      description: String(f.get("description") || "").trim(),
      start_week: Number(f.get("start")),
      end_week: Number(f.get("end")),
    };
    run({ operation: "update", payload } as MilestoneCommand, () =>
      setSelected(null),
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="TỪ Ý TƯỞNG ĐẾN CUỘC HẸN"
        title="24 tuần, từng bước một"
        description={`Bắt đầu ${data.startDate}. Mỗi chặng có một kết quả rõ ràng.`}
      >
        <Button asChild variant="outline">
          <Link href="/settings">
            <CalendarBlank size={18} />
            Ngày bắt đầu
          </Link>
        </Button>
      </PageHeading>
      {!data.catalogReady && (
        <p className="notice">
          Dữ liệu đã kết nối. Cần hoàn tất bước thiết lập Products/Timeline để
          bật chỉnh sửa.
        </p>
      )}
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { value: "roadmap", label: "Hành trình 24 tuần" },
          {
            value: "tasks",
            label: "Công việc theo hạn",
            count: data.tasks.length,
          },
        ]}
      />
      {view === "roadmap" ? (
        <>
          <div className="work-toolbar">
            <select
              aria-label="Khoảng thời gian hiển thị"
              value={span}
              onChange={(e) => {
                const next = Number(e.target.value);
                setSpan(next);
                setFrom((f) => clampWeek(Math.min(f, TOTAL_WEEKS - next + 1)));
              }}
            >
              {windowOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {span < TOTAL_WEEKS && (
              <div className="button-row">
                <Button
                  variant="outline"
                  aria-label="Lùi khoảng thời gian"
                  disabled={from <= 1}
                  onClick={() => setFrom((f) => clampWeek(f - span))}
                >
                  <ArrowLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  aria-label="Tiến khoảng thời gian"
                  disabled={from + span > TOTAL_WEEKS}
                  onClick={() =>
                    setFrom((f) =>
                      clampWeek(Math.min(f + span, TOTAL_WEEKS - span + 1)),
                    )
                  }
                >
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}
            <span className="count-label">
              Tuần {from}–{lastWeek} · {dayOffset(data.startDate, (from - 1) * 7)}{" "}
              → {dayOffset(data.startDate, lastWeek * 7 - 1)}
            </span>
          </div>
          {unlocked && (
            <p className="form-hint">
              Kéo thanh mốc, campaign hoặc thẻ công việc sang tuần khác để dời
              lịch. Kéo mép phải của một mốc để đổi độ dài.
            </p>
          )}
          {dragError && (
            <p className="error-message" role="alert">
              {dragError}
            </p>
          )}
          <div className="timeline-scroll">
            <div
              className={`roadmap-chart${drag ? " is-dragging-chart" : ""}`}
              ref={chartRef}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="roadmap-header">
                <strong>Mốc của đội</strong>
                <div className="week-grid" style={gridStyle}>
                  {weeks.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
              </div>
              {data.milestones.map((m, i) => {
                const view = previewFor("milestone", m.id, m.start_week, m.end_week);
                return (
                  <div className="roadmap-row" key={m.id}>
                    <button
                      className="roadmap-label"
                      onClick={() => setSelected(m)}
                    >
                      <small>CHẶNG {i + 1}</small>
                      <strong>{m.name}</strong>
                    </button>
                    <div className="week-grid roadmap-weeks" style={gridStyle}>
                      {weeks.map((w) => (
                        <span className="week-cell" key={w} />
                      ))}
                      {placement(view.start, view.end) && (
                        <div
                          className={`roadmap-bar bar-${i % 3}${
                            drag?.id === m.id ? " is-dragging" : ""
                          }`}
                          style={placement(view.start, view.end) ?? undefined}
                          role="button"
                          tabIndex={0}
                          onClick={() => !drag && setSelected(m)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && setSelected(m)
                          }
                          onPointerDown={(e) =>
                            startDrag(e, "milestone", m.id, "move", view.start)
                          }
                          aria-label={`Chi tiết ${m.name}, tuần ${view.start} đến ${view.end}`}
                        >
                          {view.end - view.start > 1 ? m.name : "↗"}
                          {unlocked && (
                            <span
                              className="bar-resize"
                              aria-hidden="true"
                              onPointerDown={(e) =>
                                startDrag(e, "milestone", m.id, "resize", view.end)
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {campaignRows.length > 0 && (
                <div className="roadmap-header roadmap-subhead">
                  <strong>Campaign</strong>
                  <div className="week-grid" style={gridStyle} />
                </div>
              )}
              {campaignRows.map((c) => {
                const view = previewFor("campaign", c.id, c.startWeek, c.endWeek);
                return (
                  <div className="roadmap-row" key={c.id}>
                    <Link className="roadmap-label" href={`/campaigns/${c.id}`}>
                      <small>{c.occasion}</small>
                      <strong>{c.name}</strong>
                    </Link>
                    <div className="week-grid roadmap-weeks" style={gridStyle}>
                      {weeks.map((w) => (
                        <span className="week-cell" key={w} />
                      ))}
                      {placement(view.start, view.end) && (
                        <div
                          className={`roadmap-bar bar-campaign${
                            drag?.id === c.id ? " is-dragging" : ""
                          }`}
                          style={placement(view.start, view.end) ?? undefined}
                          onPointerDown={(e) =>
                            startDrag(e, "campaign", c.id, "move", view.start)
                          }
                          aria-label={`${c.name}, tuần ${view.start} đến ${view.end}`}
                        >
                          {c.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {taskWeeks.length > 0 && (
                <div className="roadmap-header roadmap-subhead">
                  <strong>Công việc theo hạn</strong>
                  <div className="week-grid" style={gridStyle} />
                </div>
              )}
              {taskWeeks.length > 0 && (
                <div className="roadmap-row roadmap-tasks">
                  <span className="roadmap-label roadmap-label-static">
                    <small>{taskWeeks.length} việc có hạn</small>
                    <strong>Kéo để dời hạn</strong>
                  </span>
                  <div className="week-grid roadmap-weeks" style={gridStyle}>
                    {weeks.map((w) => (
                      <span className="week-cell" key={w} />
                    ))}
                    {taskWeeks.map((t) => {
                      const view = previewFor("task", t.id, t.week, t.week);
                      const cell = placement(view.start, view.start);
                      if (!cell) return null;
                      return (
                        <span
                          key={t.id}
                          className={`task-chip status-${t.status}${
                            drag?.id === t.id ? " is-dragging" : ""
                          }`}
                          style={cell}
                          title={`${t.code} · ${t.title} · hạn ${t.due_date}`}
                          onPointerDown={(e) =>
                            startDrag(e, "task", t.id, "move", view.start)
                          }
                        >
                          {t.code}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="milestone-cards">
            {data.milestones.map((m, i) => (
              <button
                className="timeline-item"
                key={m.id}
                onClick={() => setSelected(m)}
              >
                <span className="timeline-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <small>
                    Tuần {m.start_week}–{m.end_week}
                  </small>
                  <h2>{m.name}</h2>
                  <p>{m.description}</p>
                </div>
                <ArrowUpRight size={22} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="work-toolbar">
            <select
              aria-label="Owner timeline"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">Tất cả thành viên</option>
              {data.members
                .filter((m) => m.active !== false)
                .map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
            </select>
            <select
              aria-label="Workstream timeline"
              value={stream}
              onChange={(e) => setStream(e.target.value)}
            >
              <option value="">Tất cả workstream</option>
              {["Product", "Dev", "Brand", "Operations"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {tasks.length ? (
            <div className="deadline-list">
              {[...tasks]
                .sort((a, b) =>
                  (a.due_date || "9999").localeCompare(b.due_date || "9999"),
                )
                .map((t) => (
                  <Link key={t.id} href={`/work/${t.id}`}>
                    <time>{t.due_date || "Chưa đặt hạn"}</time>
                    <div>
                      <small>
                        {t.code} · {t.owner}
                      </small>
                      <strong>{t.title}</strong>
                    </div>
                    <Badge>{statusLabels[t.status]}</Badge>
                    <ArrowUpRight size={18} />
                  </Link>
                ))}
            </div>
          ) : (
            <Empty />
          )}
        </>
      )}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Chi tiết mốc hành trình"
      >
        {selected && (
          <form className="form-stack" onSubmit={submit}>
            <fieldset disabled={pending || !unlocked} className="live-fieldset">
              <Field label="Tên milestone">
                <input name="name" required defaultValue={selected.name} />
              </Field>
              <Field label="Kết quả cần đạt">
                <textarea
                  name="description"
                  rows={3}
                  required
                  defaultValue={selected.description}
                />
              </Field>
              <div className="form-grid">
                <Field label="Tuần bắt đầu">
                  <input
                    name="start"
                    type="number"
                    min="1"
                    max="24"
                    required
                    defaultValue={selected.start_week}
                  />
                </Field>
                <Field label="Tuần kết thúc">
                  <input
                    name="end"
                    type="number"
                    min="1"
                    max="24"
                    required
                    defaultValue={selected.end_week}
                  />
                </Field>
              </div>
              <p className="muted">
                {dayOffset(data.startDate, (selected.start_week - 1) * 7)} →{" "}
                {dayOffset(data.startDate, selected.end_week * 7 - 1)}
              </p>
              <p className="notice">
                Dời milestone có thể ảnh hưởng kế hoạch launch. Ngày của task
                và campaign sẽ không tự đổi; cần rà soát các việc liên quan.
              </p>
              {!planner && (
                <p className="notice">
                  Chỉ Founder hoặc Ops được chỉnh mốc hành trình.
                </p>
              )}
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={!unlocked}>
                  {pending ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
              </div>
            </fieldset>
          </form>
        )}
      </Modal>
    </>
  );
}
