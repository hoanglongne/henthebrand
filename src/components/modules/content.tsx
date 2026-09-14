"use client";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  FilmStrip,
  ImageSquare,
  TextT,
  Rows,
  SquaresFour,
} from "@phosphor-icons/react";
import { useWorkspace } from "../workspace-provider";
import {
  PageHeading,
  Tabs,
  Search,
  Modal,
  Field,
  FormFooter,
  Badge,
  Empty,
  ModuleBoundary,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
import {
  contentStates,
  shortDate,
  safeUrl,
  type ContentItem,
} from "@/lib/preview-data";
function ContentForm({
  item,
  onClose,
}: {
  item?: ContentItem;
  onClose: () => void;
}) {
  const { campaigns, data, setContent, editable, record } = useWorkspace();
  const [status, setStatus] = useState(item?.status ?? "Idea");
  const [error, setError] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    if (v("url") && !safeUrl(v("url"))) {
      setError("Link asset cần bắt đầu bằng https:// hoặc http://.");
      return;
    }
    if (
      ["Scheduled", "Published", "Learned"].includes(status) &&
      (!v("publish") || !v("url"))
    ) {
      setError("Cần ngày đăng và link asset trước khi lên lịch hoặc xuất bản.");
      return;
    }
    const next: ContentItem = {
      id: item?.id ?? crypto.randomUUID(),
      title: v("title"),
      hook: v("hook"),
      format: v("format"),
      channel: v("channel"),
      status,
      owner: v("owner"),
      publish: v("publish"),
      campaign: v("campaign"),
      url: v("url"),
      learning: v("learning"),
    };
    setContent((items) =>
      item ? items.map((i) => (i.id === item.id ? next : i)) : [next, ...items],
    );
    record(`Cập nhật nội dung: ${next.title}`);
    onClose();
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <Field label="Tên nội dung">
        <input name="title" required defaultValue={item?.title} />
      </Field>
      <Field label="Hook / câu mở đầu">
        <textarea
          name="hook"
          rows={3}
          required
          defaultValue={item?.hook}
          placeholder="Điều gì khiến người xem muốn dừng lại?"
        />
      </Field>
      <div className="form-grid">
        <Field label="Trạng thái">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {contentStates.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Campaign">
          <select name="campaign" defaultValue={item?.campaign}>
            <option value="">Nội dung độc lập</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Format">
          <select name="format" defaultValue={item?.format}>
            {[
              "Video ngắn",
              "Carousel",
              "Reaction",
              "Behind the scenes",
              "Story",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Kênh đăng">
          <select name="channel" defaultValue={item?.channel}>
            {["TikTok", "Instagram", "Facebook", "Landing"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Người phụ trách">
          <select name="owner" defaultValue={item?.owner}>
            {data.members.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày đăng dự kiến">
          <input name="publish" type="date" defaultValue={item?.publish} />
        </Field>
      </div>
      <Field
        label="Link asset / bài đã đăng"
        hint="Chỉ lưu đường dẫn; không tự đăng lên mạng xã hội."
      >
        <input
          name="url"
          type="url"
          defaultValue={item?.url}
          placeholder="https://…"
        />
      </Field>
      <Field label="Bài học sau xuất bản">
        <textarea
          name="learning"
          rows={3}
          defaultValue={item?.learning}
          placeholder="Điều gì nên giữ, điều gì sẽ thử khác?"
        />
      </Field>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <FormFooter onClose={onClose} />
    </form>
  );
}
export function ContentStudio() {
  const { content, campaigns, editable } = useWorkspace();
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("");
  const [view, setView] = useState("cards");
  const [selection, setSelection] = useState<ContentItem | null | undefined>(
    undefined,
  );
  const visible = content.filter(
    (c) =>
      (stage === "all" || c.status === stage) &&
      (!channel || c.channel === channel) &&
      `${c.title} ${c.hook}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  function card(c: ContentItem, i: number) {
    const Icon =
      c.format === "Carousel"
        ? ImageSquare
        : c.format === "Story"
          ? TextT
          : FilmStrip;
    return (
      <button
        className="content-card"
        key={c.id}
        onClick={() => setSelection(c)}
      >
        <div className={`content-art content-art-${i % 3}`}>
          <div>
            <Icon size={20} />
            <span>{c.format}</span>
          </div>
          <p>{c.hook}</p>
          <span className="content-art-footer">
            HẸN · {c.channel}
            <ArrowUpRight size={20} />
          </span>
        </div>
        <div className="content-card-body">
          <div>
            <Badge
              tone={
                c.status === "Review"
                  ? "amber"
                  : c.status === "Scheduled"
                    ? "blue"
                    : "neutral"
              }
            >
              {c.status}
            </Badge>
            <time>{shortDate(c.publish)}</time>
          </div>
          <h3>{c.title}</h3>
          <p>
            {campaigns.find((p) => p.id === c.campaign)?.name ??
              "Nội dung độc lập"}
          </p>
          <footer>
            <span className="avatar">{c.owner.charAt(0)}</span>
            <span>{c.owner}</span>
            {!c.url && <small>Chưa gắn asset</small>}
          </footer>
        </div>
      </button>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="NHỮNG CÂU CHUYỆN CỦA HẸN"
        title="Chuyện hay, kể đúng lúc"
        description="Từ một câu hook đến nội dung khiến ai đó muốn gặp nhau."
      >
        <Button disabled={!editable} onClick={() => setSelection(null)}>
          <Plus size={17} />Ý tưởng mới
        </Button>
      </PageHeading>
      <ModuleBoundary />
      <Tabs
        value={stage}
        onChange={setStage}
        items={[
          { value: "all", label: "Tất cả", count: content.length },
          ...contentStates.map((s) => ({
            value: s,
            label: s,
            count: content.filter((c) => c.status === s).length,
          })),
        ]}
      />
      <div className="work-toolbar">
        <Search
          value={query}
          onChange={setQuery}
          placeholder="Tìm nội dung hoặc hook…"
        />
        <select
          aria-label="Kênh nội dung"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <option value="">Tất cả kênh</option>
          {["TikTok", "Instagram", "Facebook", "Landing"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="view-switch">
          <button
            aria-label="Dạng thẻ nội dung"
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            <SquaresFour size={20} />
          </button>
          <button
            aria-label="Dạng pipeline nội dung"
            aria-pressed={view === "pipeline"}
            onClick={() => setView("pipeline")}
          >
            <Rows size={20} />
          </button>
        </div>
      </div>
      {!visible.length ? (
        <Empty
          title="Ý tưởng tiếp theo đang chờ bạn"
          description="Thử đổi bộ lọc hoặc thêm một ý tưởng mới."
        >
          <Button
            variant="outline"
            disabled={!editable}
            onClick={() => setSelection(null)}
          >
            Thêm ý tưởng
          </Button>
        </Empty>
      ) : view === "cards" ? (
        <div className="content-grid">{visible.map(card)}</div>
      ) : (
        <div className="content-pipeline">
          {contentStates.map((s) => (
            <section key={s}>
              <h3>
                {s}
                <span>{visible.filter((c) => c.status === s).length}</span>
              </h3>
              {visible.filter((c) => c.status === s).map((c, i) => card(c, i))}
            </section>
          ))}
        </div>
      )}
      <Modal
        open={selection !== undefined}
        onClose={() => setSelection(undefined)}
        title={selection ? "Chi tiết nội dung" : "Một ý tưởng mới"}
      >
        <ContentForm
          item={selection ?? undefined}
          onClose={() => setSelection(undefined)}
        />
      </Modal>
    </>
  );
}
