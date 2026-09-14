"use client";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { mutateWork, readWorkDetails } from "@/app/actions/work";
import { type WorkCommand, type WorkDetails } from "@/lib/domain/live-work";
import { statuses, statusLabels, type Task } from "@/lib/domain/types";
import { useWorkspace } from "../workspace-provider";
import { TaskList } from "../task-list";
import { PageHeading, Field, Modal, Empty, Badge } from "../ui/workspace-ui";
import { Button } from "../ui/button";
const contributors = ["founder", "ops", "product_designer", "brand_designer"];
function useWorkMutation(task?: Task) {
  const { data } = useWorkspace();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function run(command: WorkCommand, onSuccess?: () => void) {
    setError("");
    startTransition(async () => {
      try {
        const result = await mutateWork({
          workspaceId: data.workspaceId,
          taskId: task?.id ?? null,
          expected: task?.updated_at ?? null,
          ...command,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess?.();
        if (!task) router.push(`/work/${result.taskId}`);
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
function WorkForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { data } = useWorkspace();
  const { run, pending, error } = useWorkMutation(task);
  const founder = data.roles.includes("founder");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const payload = {
      title: v("title"),
      owner_id:
        task && !founder ? (task.owner_id ?? null) : v("owner_id") || null,
      approver_id:
        task && !founder
          ? (task.approver_id ?? null)
          : v("approver_id") || null,
      product_id: v("product_id") || null,
      priority: v("priority"),
      effort: Number(v("effort")),
      due_date: v("due_date") || null,
      definition_of_done: v("definition_of_done"),
      workstream: v("workstream"),
      reason: v("reason"),
    };
    run(
      { operation: task ? "update" : "create", payload } as WorkCommand,
      onClose,
    );
  }
  const members = data.members.filter((m) =>
    m.roles?.some((r) => contributors.includes(r)),
  );
  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset disabled={pending} className="live-fieldset">
        <Field label="Tên công việc">
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={task?.title}
          />
        </Field>
        <div className="form-grid">
          {(["owner_id", "approver_id"] as const).map((key) => (
            <Field
              key={key}
              label={key === "owner_id" ? "Người phụ trách" : "Người duyệt"}
            >
              <select
                name={key}
                defaultValue={
                  task?.[key] ?? (key === "approver_id" ? data.userId : "")
                }
                disabled={!!task && !founder}
              >
                <option value="">Chưa phân công</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label="Workstream">
            <select
              name="workstream"
              defaultValue={task?.workstream ?? "Product"}
            >
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
            <input type="date" name="due_date" defaultValue={task?.due_date} />
          </Field>
          <Field label="Sản phẩm">
            <select name="product_id" defaultValue={task?.product_id ?? ""}>
              <option value="">Chưa gắn sản phẩm</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Definition of Done">
          <textarea
            rows={4}
            name="definition_of_done"
            maxLength={10000}
            defaultValue={task?.definition_of_done}
          />
        </Field>
        {task && founder && (
          <Field label="Lý do vượt giới hạn WIP (nếu có)">
            <input name="reason" maxLength={2000} />
          </Field>
        )}
        <p className="form-hint">
          Công việc mới vào Backlog. Cần owner, người duyệt, hạn và Definition
          of Done trước khi chuyển trạng thái.
        </p>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <div className="button-row">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit">
            {pending ? "Đang lưu…" : "Lưu công việc"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
export function ConnectedWork() {
  const { data } = useWorkspace();
  const [create, setCreate] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="CÙNG LÀM CHO TỚI NƠI"
        title="Công việc của đội"
        description={`${data.tasks.length} công việc · Dữ liệu từ workspace HẸN.`}
      >
        <Button
          disabled={
            !data.workReady || !data.roles.some((r) => contributors.includes(r))
          }
          onClick={() => setCreate(true)}
        >
          Tạo công việc
        </Button>
      </PageHeading>
      {!data.workReady && (
        <p className="notice">
          Dữ liệu đã kết nối. Cần hoàn tất bước thiết lập Công việc để bật chỉnh
          sửa.
        </p>
      )}
      <TaskList tasks={data.tasks} />
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Một công việc mới"
      >
        <WorkForm onClose={() => setCreate(false)} />
      </Modal>
    </>
  );
}
export function ConnectedTaskDetail({ id }: { id: string }) {
  const { data } = useWorkspace();
  const task = data.tasks.find((t) => t.id === id);
  return task ? (
    <LiveTask key={id} task={task} />
  ) : (
    <Empty
      title="Không tìm thấy công việc"
      description="Tải lại danh sách hoặc kiểm tra quyền truy cập."
    />
  );
}
function LiveTask({ task }: { task: Task }) {
  const { data } = useWorkspace();
  const router = useRouter();
  const { run, pending, error } = useWorkMutation(task);
  const [edit, setEdit] = useState(false);
  const [details, setDetails] = useState<WorkDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const founder = data.roles.includes("founder");
  const contributor = data.roles.some((r) => contributors.includes(r));
  const canEdit =
    !!data.workReady &&
    contributor &&
    (founder || task.owner_id === data.userId);
  const canApprove =
    !!data.workReady &&
    contributor &&
    (founder || task.approver_id === data.userId);
  const unlocked = canEdit && task.status !== "done";
  useEffect(() => {
    let active = true;
    if (!data.workReady || !data.workspaceId) return;
    readWorkDetails(data.workspaceId, task.id)
      .then((r) => {
        if (!active) return;
        if (r.ok) {
          setDetails(r.details);
          setLoadError("");
        } else setLoadError(r.message);
      })
      .catch(() => {
        if (active) setLoadError("Không tải được chi tiết. Vui lòng thử lại.");
      });
    return () => {
      active = false;
    };
  }, [data.workspaceId, data.workReady, task.id, task.updated_at, reload]);
  function submit(
    e: FormEvent<HTMLFormElement>,
    operation:
      | "checklist_add"
      | "link_add"
      | "comment_add"
      | "dependency_add"
      | "transition",
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = Object.fromEntries(f.entries());
    run({ operation, payload } as WorkCommand, () => {
      if (operation !== "transition") form.reset();
      setReload((v) => v + 1);
    });
  }
  const refresh = () => {
    router.refresh();
    setReload((v) => v + 1);
  };
  return (
    <>
      <Link className="back-link" href="/work">
        ← Công việc của đội
      </Link>
      <PageHeading
        eyebrow={task.code}
        title={task.title}
        description={`${task.owner} · ${task.product}`}
      >
        <Badge>{statusLabels[task.status]}</Badge>
        <Button
          variant="outline"
          disabled={!unlocked || pending}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa
        </Button>
      </PageHeading>
      {!data.workReady ? (
        <p className="notice">
          Cần hoàn tất bước thiết lập Công việc để xem checklist và lưu thay
          đổi.
        </p>
      ) : (
        <>
          {(error || loadError) && (
            <div className="notice" role="alert">
              <p>{error || loadError}</p>
              <Button variant="outline" onClick={refresh} disabled={pending}>
                Tải lại dữ liệu
              </Button>
            </div>
          )}
          <fieldset disabled={pending} className="live-fieldset">
            <div className="detail-grid">
              <section className="surface live-panel">
                <h2>Kết quả cần đạt</h2>
                <p className="preserve-lines">
                  {task.definition_of_done || "Chưa có Definition of Done."}
                </p>
                <p>
                  Hạn: {task.due_date || "Chưa đặt"} · {task.priority} ·{" "}
                  {task.effort ?? "—"} point
                </p>
                <p>
                  Người duyệt:{" "}
                  {data.members.find((m) => m.id === task.approver_id)?.name ||
                    "Chưa phân công"}
                </p>
                {task.blocked_reason && (
                  <p className="notice">Đang bị chặn: {task.blocked_reason}</p>
                )}
                {(canEdit || (canApprove && task.status === "review")) && (
                  <form
                    className="form-stack"
                    onSubmit={(e) => submit(e, "transition")}
                  >
                    <Field label="Chuyển trạng thái">
                      <select
                        name="status"
                        defaultValue={task.status}
                        key={task.status}
                      >
                        {statuses
                          .filter((s) =>
                            s === "done"
                              ? canApprove && task.status === "review"
                              : canEdit,
                          )
                          .map((s) => (
                            <option key={s} value={s}>
                              {statusLabels[s]}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Lý do bị chặn / vượt WIP">
                      <input
                        name="reason"
                        maxLength={2000}
                        placeholder="Bắt buộc khi Blocked hoặc Founder vượt WIP"
                      />
                    </Field>
                    <Button type="submit">
                      {pending ? "Đang lưu…" : "Cập nhật trạng thái"}
                    </Button>
                  </form>
                )}
              </section>
              <section className="surface live-panel">
                <h2>Checklist</h2>
                {!details && !loadError && (
                  <p role="status">Đang tải chi tiết…</p>
                )}
                {details?.checklist.length === 0 && (
                  <p>Chưa có mục kiểm tra.</p>
                )}
                {details?.checklist.map((item) => (
                  <label className="live-check" key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled={!unlocked}
                      onChange={(e) =>
                        run(
                          {
                            operation: "checklist_toggle",
                            payload: {
                              id: item.id,
                              completed: e.target.checked,
                            },
                          },
                          () => setReload((v) => v + 1),
                        )
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
                {unlocked && (
                  <form
                    className="form-stack"
                    onSubmit={(e) => submit(e, "checklist_add")}
                  >
                    <Field label="Mục kiểm tra mới">
                      <input name="label" required maxLength={500} />
                    </Field>
                    <Button type="submit" variant="outline">
                      Thêm mục kiểm tra
                    </Button>
                  </form>
                )}
              </section>
            </div>
            <div className="detail-grid">
              <section className="surface live-panel">
                <h2>Link kết quả</h2>
                {details?.links.length === 0 && (
                  <p>Chưa có output. Cần ít nhất một link để gửi duyệt.</p>
                )}
                {details?.links.map((item) => (
                  <div className="live-item" key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label} ↗
                    </a>
                    {unlocked && (
                      <Button
                        variant="ghost"
                        aria-label={`Xóa link ${item.label}`}
                        onClick={() =>
                          run(
                            {
                              operation: "link_remove",
                              payload: { id: item.id },
                            },
                            () => setReload((v) => v + 1),
                          )
                        }
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                ))}
                {unlocked && (
                  <form
                    className="form-stack"
                    onSubmit={(e) => submit(e, "link_add")}
                  >
                    <Field label="Tên kết quả">
                      <input name="label" required maxLength={200} />
                    </Field>
                    <Field label="Đường dẫn kết quả">
                      <input
                        name="url"
                        type="url"
                        required
                        pattern="https?://.*"
                        maxLength={2048}
                        placeholder="https://…"
                      />
                    </Field>
                    <Button variant="outline" type="submit">
                      Gắn link kết quả
                    </Button>
                  </form>
                )}
              </section>
              <section className="surface live-panel">
                <h2>Công việc phụ thuộc</h2>
                {details?.dependencies.length === 0 && (
                  <p>Không có công việc phụ thuộc.</p>
                )}
                {details?.dependencies.map((id) => {
                  const dep = data.tasks.find((t) => t.id === id);
                  return (
                    <div className="live-item" key={id}>
                      <Link href={`/work/${id}`}>
                        {dep ? `${dep.code} · ${dep.title}` : "Mở công việc"}
                      </Link>
                      {unlocked && (
                        <Button
                          variant="ghost"
                          aria-label={`Bỏ phụ thuộc ${dep?.code ?? id}`}
                          onClick={() =>
                            run(
                              {
                                operation: "dependency_remove",
                                payload: { id },
                              },
                              () => setReload((v) => v + 1),
                            )
                          }
                        >
                          Bỏ
                        </Button>
                      )}
                    </div>
                  );
                })}
                {unlocked && (
                  <form
                    className="form-stack"
                    onSubmit={(e) => submit(e, "dependency_add")}
                  >
                    <Field label="Cần hoàn tất trước">
                      <select name="id" required defaultValue="">
                        <option value="">Chọn công việc</option>
                        {data.tasks
                          .filter(
                            (t) =>
                              t.id !== task.id &&
                              !details?.dependencies.includes(t.id),
                          )
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.code} · {t.title}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Button variant="outline" type="submit">
                      Thêm phụ thuộc
                    </Button>
                  </form>
                )}
              </section>
            </div>
            <section className="surface live-panel">
              <h2>Trao đổi</h2>
              {contributor && (
                <form
                  className="form-stack"
                  onSubmit={(e) => submit(e, "comment_add")}
                >
                  <Field label="Bình luận mới">
                    <textarea name="body" required rows={3} maxLength={5000} />
                  </Field>
                  <Button type="submit">Lưu bình luận</Button>
                </form>
              )}
              {details?.comments.length === 0 && <p>Chưa có bình luận.</p>}
              {details?.comments.map((c) => (
                <article className="live-comment" key={c.id}>
                  <strong>
                    {data.members.find((m) => m.id === c.author_id)?.name ??
                      "Thành viên"}
                  </strong>
                  <span className="small muted">
                    {" "}
                    ·{" "}
                    {new Date(c.created_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </span>
                  <p className="preserve-lines">{c.body}</p>
                </article>
              ))}
              {details?.comments.length === 50 && (
                <p className="small muted">
                  Đang hiển thị 50 bình luận mới nhất.
                </p>
              )}
            </section>
          </fieldset>
        </>
      )}
      <Modal
        open={edit}
        onClose={() => setEdit(false)}
        title={`Chỉnh sửa ${task.code}`}
      >
        <WorkForm task={task} onClose={() => setEdit(false)} />
      </Modal>
    </>
  );
}
