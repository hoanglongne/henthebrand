"use client";
import Link from "next/link";
import { ConnectedWork, ConnectedTaskDetail } from "./connected-work";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  LinkSimple,
  CheckCircle,
  ChatCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  useWorkspace,
  defaultExtras,
  type TaskExtras,
} from "../workspace-provider";
import { TaskList } from "../task-list";
import {
  PageHeading,
  Modal,
  Field,
  FormFooter,
  Badge,
  Empty,
  PreviewHint,
  Tabs,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
import {
  statuses,
  statusLabels,
  type Task,
  type TaskStatus,
} from "@/lib/domain/types";
import { safeUrl } from "@/lib/preview-data";
function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { data, setData, editable, record } = useWorkspace();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const next: Task = {
      ...task,
      id: task?.id ?? crypto.randomUUID(),
      code:
        task?.code ??
        `HEN-${String(Math.max(0, ...data.tasks.map((t) => Number(t.code.split("-")[1]) || 0)) + 1).padStart(3, "0")}`,
      title: v("title"),
      owner: v("owner"),
      status: task?.status ?? "backlog",
      priority: v("priority"),
      effort: Number(v("effort")),
      due_date: v("due_date"),
      definition_of_done: v("definition_of_done"),
      workstream: v("workstream"),
      product: v("product"),
    };
    setData((d) => ({
      ...d,
      tasks: task
        ? d.tasks.map((t) => (t.id === task.id ? next : t))
        : [next, ...d.tasks],
    }));
    record(`${task ? "Chỉnh sửa" : "Tạo"} ${next.code}: ${next.title}`);
    onClose();
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <Field label="Tên công việc">
        <input
          name="title"
          required
          defaultValue={task?.title}
          placeholder="Bắt đầu bằng một hành động rõ ràng"
        />
      </Field>
      <div className="form-grid">
        <Field label="Người phụ trách">
          <select name="owner" defaultValue={task?.owner} required>
            <option value="">Chọn thành viên</option>
            {data.members.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Workstream">
          <select name="workstream" defaultValue={task?.workstream}>
            {["Product", "Dev", "Brand", "Operations"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Ưu tiên">
          <select name="priority" defaultValue={task?.priority ?? "P2"}>
            {["P0", "P1", "P2", "P3"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Effort (point)">
          <select name="effort" defaultValue={task?.effort ?? 3}>
            {[1, 2, 3, 5, 8, 13].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Hạn hoàn thành">
          <input
            name="due_date"
            type="date"
            required
            defaultValue={task?.due_date}
          />
        </Field>
        <Field label="Sản phẩm">
          <select name="product" defaultValue={task?.product}>
            {data.products.map((p) => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Definition of Done">
        <textarea
          name="definition_of_done"
          required
          rows={4}
          defaultValue={task?.definition_of_done}
          placeholder="Kết quả cụ thể nào cho biết công việc đã hoàn tất?"
        />
      </Field>
      <FormFooter onClose={onClose} />
    </form>
  );
}
function PreviewWork() {
  const { data, editable } = useWorkspace();
  const [create, setCreate] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="CÙNG LÀM CHO TỚI NƠI"
        title="Công việc của đội"
        description={`${data.tasks.length} công việc · Một owner rõ ràng, một kết quả cụ thể.`}
      >
        <Button disabled={!editable} onClick={() => setCreate(true)}>
          <Plus size={17} />
          Tạo công việc
        </Button>
      </PageHeading>
      <div className="work-summary">
        <span>
          <strong>
            {data.tasks.filter((t) => t.status === "in_progress").length}
          </strong>{" "}
          đang làm
        </span>
        <span>
          <strong>
            {data.tasks.filter((t) => t.status === "review").length}
          </strong>{" "}
          chờ duyệt
        </span>
        <span className="coral-text">
          <strong>
            {data.tasks.filter((t) => t.status === "blocked").length}
          </strong>{" "}
          đang bị chặn
        </span>
        <span>
          <CheckCircle size={17} />
          {data.tasks.filter((t) => t.status === "done").length} hoàn tất
        </span>
      </div>
      <TaskList tasks={data.tasks} />
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Một công việc mới"
      >
        <TaskForm onClose={() => setCreate(false)} />
      </Modal>
    </>
  );
}
function PreviewTaskDetail({ id }: { id: string }) {
  const { data, setData, editable, record, extras, setExtras } = useWorkspace();
  const task = data.tasks.find((t) => t.id === id);
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState("output");
  const [comment, setComment] = useState("");
  const [checkLabel, setCheckLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  if (!task)
    return (
      <Empty
        title="Không tìm thấy công việc"
        description="Task có thể chỉ tồn tại trong phiên thử trước đó."
      >
        <Button asChild>
          <Link href="/work">Về Work</Link>
        </Button>
      </Empty>
    );
  const t = task;
  const extra =
    extras[id] ??
    (editable
      ? defaultExtras(t)
      : {
          approver: "Chưa tải người duyệt",
          checklist: [],
          links: [],
          comments: [],
          dependencies: [],
          blockedReason: "",
        });
  function updateExtra(patch: Partial<TaskExtras>) {
    if (!editable) return;
    setExtras((items) => ({ ...items, [id]: { ...extra, ...patch } }));
  }
  function transition(next: TaskStatus) {
    setError("");
    if (!editable) return;
    if (
      next !== "backlog" &&
      (!t.owner ||
        !t.due_date ||
        !t.effort ||
        !t.definition_of_done.trim() ||
        !extra.approver)
    ) {
      setError("Cần owner, approver, deadline, effort và Definition of Done.");
      return;
    }
    if (
      next === "in_progress" &&
      data.tasks.filter(
        (other) =>
          other.id !== id &&
          other.owner === t.owner &&
          other.status === "in_progress",
      ).length >= 2 &&
      !reason.trim()
    ) {
      setError(
        "Owner đã có 2 việc đang làm. Founder cần ghi lý do override bên dưới.",
      );
      return;
    }
    if (
      ["ready", "in_progress"].includes(next) &&
      extra.dependencies.some((dep) =>
        data.tasks.some(
          (item) =>
            item.id === dep && item.priority === "P0" && item.status !== "done",
        ),
      )
    ) {
      setError("Dependency P0 chưa hoàn tất. Gỡ dependency trước khi bắt đầu.");
      return;
    }
    if (next === "blocked" && !extra.blockedReason.trim()) {
      setError("Ghi lý do bị chặn ở phần thuộc tính trước.");
      return;
    }
    if (next === "review" && !extra.links.length) {
      setError("Gắn link output trước khi gửi duyệt.");
      return;
    }
    if (
      next === "done" &&
      (!extra.checklist.every((c) => c.done) || !extra.links.length)
    ) {
      setError("Hoàn tất checklist và gắn output trước khi Done.");
      return;
    }
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((item) =>
        item.id === id ? { ...item, status: next } : item,
      ),
    }));
    record(`${t.code} → ${statusLabels[next]}${reason ? `: ${reason}` : ""}`);
    setReason("");
  }
  return (
    <>
      <Link href="/work" className="back-link">
        ← Công việc của đội
      </Link>
      <PageHeading
        eyebrow={`${t.code} · ${t.workstream}`}
        title={t.title}
        description={t.product}
      >
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa
        </Button>
        <Badge
          tone={
            t.status === "blocked"
              ? "coral"
              : t.status === "done"
                ? "green"
                : "blue"
          }
        >
          {statusLabels[t.status]}
        </Badge>
      </PageHeading>
      <div className="task-detail-layout">
        <div>
          <section className="surface">
            <h2>Kết quả cần đạt</h2>
            <p>{t.definition_of_done}</p>
            <div className="section-heading">
              <h2>Checklist</h2>
              <span className="small muted">
                {extra.checklist.filter((c) => c.done).length}/
                {extra.checklist.length}
              </span>
            </div>
            {extra.checklist.map((c) => (
              <label className="check-row" key={c.id}>
                <input
                  type="checkbox"
                  checked={c.done}
                  disabled={!editable}
                  onChange={() =>
                    updateExtra({
                      checklist: extra.checklist.map((item) =>
                        item.id === c.id ? { ...item, done: !item.done } : item,
                      ),
                    })
                  }
                />
                <span>{c.label}</span>
              </label>
            ))}
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!checkLabel.trim() || !editable) return;
                updateExtra({
                  checklist: [
                    ...extra.checklist,
                    {
                      id: crypto.randomUUID(),
                      label: checkLabel.trim(),
                      done: false,
                    },
                  ],
                });
                setCheckLabel("");
              }}
            >
              <input
                aria-label="Thêm checklist"
                placeholder="Thêm một bước cần hoàn tất…"
                value={checkLabel}
                onChange={(e) => setCheckLabel(e.target.value)}
                disabled={!editable}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={!editable}
                aria-label="Thêm mục checklist"
              >
                <Plus size={17} />
              </Button>
            </form>
          </section>
          <section className="surface">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "output",
                  label: "Link & output",
                  count: extra.links.length,
                },
                {
                  value: "comments",
                  label: "Trao đổi",
                  count: extra.comments.length,
                },
                {
                  value: "dependencies",
                  label: "Dependency",
                  count: extra.dependencies.length,
                },
              ]}
            />
            {tab === "output" ? (
              <>
                <div className="output-links">
                  {extra.links.length ? (
                    extra.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkSimple size={20} />
                        <span>
                          {link.label}
                          <small>{link.url}</small>
                        </span>
                        <ArrowUpRight size={18} />
                      </a>
                    ))
                  ) : (
                    <p className="muted small">
                      Gắn tài liệu, thiết kế hoặc pull request để approver có
                      thể kiểm tra.
                    </p>
                  )}
                </div>
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editable) return;
                    if (!safeUrl(linkUrl)) {
                      setError("Link cần bắt đầu bằng http:// hoặc https://.");
                      return;
                    }
                    updateExtra({
                      links: [
                        ...extra.links,
                        { label: linkLabel.trim() || "Output", url: linkUrl },
                      ],
                    });
                    setLinkUrl("");
                    setLinkLabel("");
                    setError("");
                  }}
                >
                  <Field label="Tên output">
                    <input
                      value={linkLabel}
                      required
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Prototype mobile, PR…"
                    />
                  </Field>
                  <Field label="Đường dẫn">
                    <input
                      type="url"
                      value={linkUrl}
                      required
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                  <Button variant="outline" disabled={!editable} type="submit">
                    <Plus size={16} />
                    Gắn link trong bản thử
                  </Button>
                </form>
              </>
            ) : tab === "comments" ? (
              <>
                <div className="comment-list">
                  {extra.comments.map((c, i) => (
                    <article key={i}>
                      <span className="avatar">H</span>
                      <div>
                        <strong>{c.author}</strong>
                        <p>{c.body}</p>
                      </div>
                    </article>
                  ))}
                  {!extra.comments.length && (
                    <p className="muted">
                      Chưa có trao đổi. Ghi rõ câu hỏi hoặc điều cần duyệt.
                    </p>
                  )}
                </div>
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!comment.trim() || !editable) return;
                    updateExtra({
                      comments: [
                        ...extra.comments,
                        { author: "Đội HẸN · bản thử", body: comment.trim() },
                      ],
                    });
                    setComment("");
                    record(`Thêm trao đổi vào ${t.code}`);
                  }}
                >
                  <textarea
                    aria-label="Nội dung trao đổi"
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Ghi chú cho đội mình…"
                  />
                  <Button type="submit" disabled={!editable}>
                    <ChatCircle size={17} />
                    Thêm vào bản thử
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="muted small">
                  Các việc cần hoàn tất trước task này. Dependency P0 chưa Done
                  sẽ chặn chuyển Ready/Đang làm trong bản thử.
                </p>
                {extra.dependencies.map((dep) => {
                  const linked = data.tasks.find((item) => item.id === dep);
                  return (
                    linked && (
                      <div className="dependency-row" key={dep}>
                        <Link href={`/work/${dep}`}>
                          {linked.code} · {linked.title}
                        </Link>
                        <button
                          disabled={!editable}
                          aria-label={`Gỡ dependency ${linked.code}`}
                          onClick={() =>
                            updateExtra({
                              dependencies: extra.dependencies.filter(
                                (d) => d !== dep,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  );
                })}
                <Field label="Thêm việc phụ thuộc">
                  <select
                    value=""
                    disabled={!editable}
                    onChange={(e) => {
                      if (e.target.value)
                        updateExtra({
                          dependencies: [...extra.dependencies, e.target.value],
                        });
                    }}
                  >
                    <option value="">Chọn công việc</option>
                    {data.tasks
                      .filter(
                        (other) =>
                          other.id !== id &&
                          !extra.dependencies.includes(other.id),
                      )
                      .map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.code} · {other.title}
                        </option>
                      ))}
                  </select>
                </Field>
              </>
            )}
          </section>
        </div>
        <aside>
          <section className="surface task-properties">
            <h2>Thuộc tính</h2>
            <Field label="Trạng thái">
              <select
                aria-label="Trạng thái công việc"
                disabled={!editable}
                value={t.status}
                onChange={(e) => transition(e.target.value as TaskStatus)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="simple-row">
              <span>Owner</span>
              <strong>{t.owner}</strong>
            </div>
            <Field label="Approver">
              <select
                value={extra.approver}
                disabled={!editable}
                onChange={(e) => updateExtra({ approver: e.target.value })}
              >
                {data.members.map((m) => (
                  <option key={m.name}>{m.name}</option>
                ))}
              </select>
            </Field>
            <div className="simple-row">
              <span>Hạn hoàn thành</span>
              <strong>{t.due_date}</strong>
            </div>
            <div className="simple-row">
              <span>Ưu tiên / effort</span>
              <strong>
                {t.priority} · {t.effort} point
              </strong>
            </div>
            <Field label="Lý do bị chặn">
              <textarea
                rows={2}
                value={extra.blockedReason}
                disabled={!editable}
                onChange={(e) => updateExtra({ blockedReason: e.target.value })}
              />
            </Field>
            <Field label="Lý do override WIP (Founder)">
              <textarea
                rows={2}
                value={reason}
                disabled={!editable}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Chỉ cần khi vượt 2 việc/người"
              />
            </Field>
            {error && (
              <p className="error-message" role="alert">
                <WarningCircle size={17} />
                {error}
              </p>
            )}
            <PreviewHint />
          </section>
          <p className="form-hint">
            Luồng thử mô phỏng quyền Founder. Quyền ghi thực tế vẫn bị khóa ở
            database.
          </p>
        </aside>
      </div>
      <Modal
        open={edit}
        onClose={() => setEdit(false)}
        title="Chỉnh sửa công việc"
      >
        <TaskForm task={t} onClose={() => setEdit(false)} />
      </Modal>
    </>
  );
}

export function Work() {
  const { data } = useWorkspace();
  return data.mode === "connected" ? <ConnectedWork /> : <PreviewWork />;
}
export function TaskDetail({ id }: { id: string }) {
  const { data } = useWorkspace();
  return data.mode === "connected" ? (
    <ConnectedTaskDetail id={id} />
  ) : (
    <PreviewTaskDetail id={id} />
  );
}
