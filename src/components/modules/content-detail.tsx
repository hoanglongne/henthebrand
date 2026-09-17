"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle, Circle } from "@phosphor-icons/react";
import { readContentDetails } from "@/app/actions/content";
import { type ContentCommand, type ContentDetails } from "@/lib/domain/live-content";
import { shortDate, type ContentItem } from "@/lib/preview-data";
import { useWorkspace } from "../workspace-provider";
import { PageHeading, Modal, Field, Badge, Empty } from "../ui/workspace-ui";
import { Button } from "../ui/button";
import {
  ContentForm,
  contentContributors,
  useContentMutation,
} from "./connected-content";
export function ContentDetail({ id }: { id: string }) {
  const { data } = useWorkspace();
  const item = data.content.find((c) => c.id === id);
  return item ? (
    <LiveContent key={id} item={item} />
  ) : (
    <Empty
      title="Không tìm thấy nội dung"
      description="Tải lại danh sách hoặc kiểm tra quyền truy cập."
    >
      <Button asChild variant="outline">
        <Link href="/content">Về Content Studio</Link>
      </Button>
    </Empty>
  );
}
function LiveContent({ item }: { item: ContentItem }) {
  const { data } = useWorkspace();
  const { run, pending, error } = useContentMutation(item);
  const [edit, setEdit] = useState(false);
  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const contributor = data.roles.some((r) => contentContributors.includes(r));
  const unlocked = !!data.contentReady && contributor;
  const campaign = data.campaigns.find((c) => c.id === item.campaign);
  const done = details?.checklist.filter((c) => c.completed).length ?? 0;
  const total = details?.checklist.length ?? 0;
  useEffect(() => {
    let active = true;
    if (!data.contentReady || !data.workspaceId) return;
    readContentDetails(data.workspaceId, item.id)
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
  }, [data.workspaceId, data.contentReady, item.id, item.updated_at, reload]);
  function submit(e: FormEvent<HTMLFormElement>, operation: ContentCommand["operation"]) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    run({ operation, payload } as ContentCommand, () => {
      form.reset();
      setReload((v) => v + 1);
    });
  }
  return (
    <>
      <Link className="back-link" href="/content">
        ← Content Studio
      </Link>
      <PageHeading
        eyebrow={`${item.format} · ${item.channel}`}
        title={item.title}
        description={item.hook}
      >
        <Badge
          tone={
            item.status === "Review"
              ? "amber"
              : item.status === "Scheduled"
                ? "blue"
                : item.status === "Published"
                  ? "green"
                  : "neutral"
          }
        >
          {item.status}
        </Badge>
        <Button
          variant="outline"
          disabled={!unlocked || pending}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa
        </Button>
      </PageHeading>
      {!data.contentReady && (
        <p className="notice">
          Cần hoàn tất bước thiết lập Content Studio để xem checklist và lưu
          thay đổi.
        </p>
      )}
      {(error || loadError) && (
        <p className="error-message" role="alert">
          {error || loadError}
        </p>
      )}
      <div className="summary-strip">
        <div>
          <span>Ngày đăng</span>
          <strong>{item.publish ? shortDate(item.publish) : "Chưa đặt"}</strong>
        </div>
        <div>
          <span>Campaign</span>
          <strong>{campaign?.name ?? "Nội dung độc lập"}</strong>
        </div>
        <div>
          <span>Người phụ trách</span>
          <strong>{item.owner}</strong>
        </div>
        <div>
          <span>Asset</span>
          <strong>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Mở link ↗
              </a>
            ) : (
              "Chưa gắn"
            )}
          </strong>
        </div>
      </div>
      <div className="detail-grid">
        <section className="surface live-panel">
          <div className="section-heading">
            <h2>Việc cần làm</h2>
            <Badge tone={total > 0 && done === total ? "green" : "neutral"}>
              {done}/{total}
            </Badge>
          </div>
          {!details && !loadError && <p role="status">Đang tải chi tiết…</p>}
          {details?.checklist.length === 0 && <p>Chưa có mục nào.</p>}
          {details?.checklist.map((step) => (
            <div className="live-check" key={step.id}>
              <label>
                <input
                  type="checkbox"
                  checked={step.completed}
                  disabled={!unlocked}
                  onChange={(e) => {
                    const completed = e.target.checked;
                    // Tick hiện ngay, không đợi vòng lưu; sai thì lần tải sau trả về đúng.
                    setDetails((d) =>
                      d
                        ? {
                            ...d,
                            checklist: d.checklist.map((c) =>
                              c.id === step.id ? { ...c, completed } : c,
                            ),
                          }
                        : d,
                    );
                    run(
                      {
                        operation: "checklist_toggle",
                        payload: { id: step.id, completed },
                      } as ContentCommand,
                      () => setReload((v) => v + 1),
                    );
                  }}
                />
                <span>{step.label}</span>
              </label>
              {unlocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Xóa mục ${step.label}`}
                  onClick={() =>
                    run(
                      {
                        operation: "checklist_remove",
                        payload: { id: step.id },
                      } as ContentCommand,
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
              onSubmit={(e) => submit(e, "checklist_add")}
            >
              <Field label="Thêm việc">
                <input name="label" required maxLength={300} />
              </Field>
              <Button type="submit" variant="outline">
                Thêm vào checklist
              </Button>
            </form>
          )}
        </section>
        <section className="surface live-panel">
          <h2>Góp ý</h2>
          <p className="muted">
            Người duyệt viết rõ cần sửa gì ở đây, thay vì nhắn riêng rồi quên.
          </p>
          {unlocked && (
            <form
              className="form-stack"
              onSubmit={(e) => submit(e, "comment_add")}
            >
              <Field label="Góp ý mới">
                <textarea name="body" required rows={3} maxLength={5000} />
              </Field>
              <Button type="submit">Gửi góp ý</Button>
            </form>
          )}
          {details?.comments.length === 0 && <p>Chưa có góp ý nào.</p>}
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
        </section>
      </div>
      {item.learning && (
        <section className="surface">
          <h2>Bài học sau xuất bản</h2>
          <p className="preserve-lines">{item.learning}</p>
        </section>
      )}
      <section className="surface">
        <div className="section-heading">
          <h2>Bước tiếp theo</h2>
          {item.status === "Published" || item.status === "Learned" ? (
            <CheckCircle size={22} />
          ) : (
            <Circle size={22} />
          )}
        </div>
        <p className="muted">
          {total > 0 && done < total
            ? `Còn ${total - done} việc trong checklist trước khi nội dung này sẵn sàng.`
            : !item.publish || !item.url
              ? "Cần ngày đăng và link asset trước khi chuyển sang Scheduled, Published hoặc Learned."
              : "Đã đủ điều kiện để lên lịch hoặc xuất bản."}
        </p>
        {campaign && (
          <Link className="text-link" href={`/campaigns/${campaign.id}`}>
            Xem campaign {campaign.name} <ArrowUpRight size={15} />
          </Link>
        )}
      </section>
      <Modal open={edit} onClose={() => setEdit(false)} title="Chỉnh sửa nội dung">
        <ContentForm item={item} onClose={() => setEdit(false)} />
      </Modal>
    </>
  );
}
