"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarBlank } from "@phosphor-icons/react";
import { mutateMilestone } from "@/app/actions/timeline";
import { type MilestoneCommand } from "@/lib/domain/live-timeline";
import { statusLabels, type Milestone } from "@/lib/domain/types";
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
  const [selected, setSelected] = useState<Milestone | null>(null);
  const { run, pending, error } = useMilestoneMutation(selected ?? undefined);
  const planner = data.roles.some((r) => ["founder", "ops"].includes(r));
  const unlocked = !!data.catalogReady && planner;
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
          <div className="timeline-scroll">
            <div className="roadmap-chart">
              <div className="roadmap-header">
                <strong>Mốc của đội</strong>
                <div className="week-grid">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
              </div>
              {data.milestones.map((m, i) => (
                <div className="roadmap-row" key={m.id}>
                  <button
                    className="roadmap-label"
                    onClick={() => setSelected(m)}
                  >
                    <small>CHẶNG {i + 1}</small>
                    <strong>{m.name}</strong>
                  </button>
                  <div className="week-grid roadmap-weeks">
                    {Array.from({ length: 24 }, (_, j) => (
                      <span className="week-cell" key={j} />
                    ))}
                    <button
                      className={`roadmap-bar bar-${i % 3}`}
                      style={{
                        gridColumn: `${m.start_week} / ${m.end_week + 1}`,
                      }}
                      onClick={() => setSelected(m)}
                      aria-label={`Chi tiết ${m.name}, tuần ${m.start_week} đến ${m.end_week}`}
                    >
                      {m.end_week - m.start_week > 1 ? m.name : "↗"}
                    </button>
                  </div>
                </div>
              ))}
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
              {data.members.map((m) => (
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
