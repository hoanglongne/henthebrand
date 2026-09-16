"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  FilmStrip,
  ImageSquare,
  TextT,
  Rows,
  SquaresFour,
} from "@phosphor-icons/react";
import { mutateContent } from "@/app/actions/content";
import { type ContentCommand } from "@/lib/domain/live-content";
import { useWorkspace } from "../workspace-provider";
import {
  PageHeading,
  Tabs,
  Search,
  Modal,
  Field,
  Badge,
  Empty,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
import { contentStates, shortDate, type ContentItem } from "@/lib/preview-data";
const contributors = ["founder", "ops", "brand_designer"];
function useContentMutation(item?: ContentItem) {
  const { data } = useWorkspace();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function run(command: ContentCommand, onSuccess?: () => void) {
    setError("");
    startTransition(async () => {
      try {
        const result = await mutateContent({
          workspaceId: data.workspaceId,
          contentId: item?.id ?? null,
          expected: item?.updated_at ?? null,
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
function ContentForm({
  item,
  onClose,
}: {
  item?: ContentItem;
  onClose: () => void;
}) {
  const { data } = useWorkspace();
  const campaigns = data.campaigns;
  const { run, pending, error } = useContentMutation(item);
  const [status, setStatus] = useState(item?.status ?? "Idea");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const payload = {
      title: v("title"),
      hook: v("hook"),
      format: v("format"),
      channel: v("channel"),
      status,
      owner_id: v("owner_id") || null,
      campaign_id: v("campaign_id") || null,
      publish_date: v("publish") || null,
      asset_url: v("url") || null,
      learning: v("learning"),
    };
    run(
      { operation: item ? "update" : "create", payload } as ContentCommand,
      onClose,
    );
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset disabled={pending} className="live-fieldset">
        <Field label="Tên nội dung">
          <input name="title" required maxLength={200} defaultValue={item?.title} />
        </Field>
        <Field label="Hook / câu mở đầu">
          <textarea
            name="hook"
            rows={3}
            maxLength={2000}
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
            <select name="campaign_id" defaultValue={item?.campaign ?? ""}>
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
            <select name="owner_id" defaultValue={item?.owner_id ?? ""}>
              <option value="">Chưa phân công</option>
              {data.members
                .filter((m) => m.active !== false)
                .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
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
            maxLength={2048}
            defaultValue={item?.url}
            placeholder="https://…"
          />
        </Field>
        <Field label="Bài học sau xuất bản">
          <textarea
            name="learning"
            rows={3}
            maxLength={5000}
            defaultValue={item?.learning}
            placeholder="Điều gì nên giữ, điều gì sẽ thử khác?"
          />
        </Field>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit">{pending ? "Đang lưu…" : "Lưu nội dung"}</Button>
        </div>
      </fieldset>
    </form>
  );
}
export function ConnectedContentStudio() {
  const { data } = useWorkspace();
  const content = data.content;
  const campaigns = data.campaigns;
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("");
  const [view, setView] = useState("cards");
  const [selection, setSelection] = useState<ContentItem | null | undefined>(
    undefined,
  );
  const contributor = data.roles.some((r) => contributors.includes(r));
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
        <Button
          disabled={!data.contentReady || !contributor}
          onClick={() => setSelection(null)}
        >
          <Plus size={17} />Ý tưởng mới
        </Button>
      </PageHeading>
      {!data.contentReady && (
        <p className="notice">
          Dữ liệu đã kết nối. Cần hoàn tất bước thiết lập Content Studio để bật
          chỉnh sửa.
        </p>
      )}
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
            disabled={!data.contentReady || !contributor}
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
