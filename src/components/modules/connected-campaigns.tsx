"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Flag,
} from "@phosphor-icons/react";
import { mutateCampaign } from "@/app/actions/campaigns";
import { type CampaignCommand } from "@/lib/domain/live-campaigns";
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
import { dayOffset, campaignContentGaps } from "@/lib/domain/rules";
import { campaignLabels, money, shortDate, type Campaign } from "@/lib/preview-data";
const planners = ["founder", "ops"];
const contributors = ["founder", "ops", "brand_designer"];
function useCampaignMutation(campaign?: Campaign) {
  const { data } = useWorkspace();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function run(command: CampaignCommand, onSuccess?: () => void) {
    setError("");
    startTransition(async () => {
      try {
        const result = await mutateCampaign({
          workspaceId: data.workspaceId,
          campaignId: campaign?.id ?? null,
          expected: campaign?.updated_at ?? null,
          ...command,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess?.();
        if (!campaign) router.push(`/campaigns/${result.campaignId}`);
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
function CampaignForm({
  campaign,
  onClose,
}: {
  campaign?: Campaign;
  onClose: () => void;
}) {
  const { data } = useWorkspace();
  const { run, pending, error } = useCampaignMutation(campaign);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const num = (k: string) => Number(f.get(k) || 0);
    const dateOrNull = (k: string) => v(k) || null;
    const payload = {
      name: v("name"),
      product_id: v("product_id") || null,
      owner_id: v("owner_id") || null,
      occasion: v("occasion"),
      channel: v("channel"),
      launch_date: v("launch_date"),
      end_date: v("end_date"),
      budget: num("budget"),
      target_orders: num("target_orders"),
      brief: v("brief"),
      stop_condition: v("stop_condition"),
      brief_due: dateOrNull("brief_due"),
      asset_due: dateOrNull("asset_due"),
      postmortem_due: dateOrNull("postmortem_due"),
      cutoff_date: dateOrNull("cutoff_date"),
      support_note: v("support_note"),
    };
    run(
      {
        operation: campaign ? "update" : "create",
        payload,
      } as CampaignCommand,
      onClose,
    );
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset disabled={pending} className="live-fieldset">
        <Field label="Tên campaign">
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={campaign?.name}
            placeholder="Ví dụ: Hẹn nhau ngày trở về"
          />
        </Field>
        <div className="form-grid">
          <Field label="Sản phẩm">
            <select name="product_id" defaultValue={campaign?.product_id ?? ""}>
              <option value="">Chưa gắn sản phẩm</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Người phụ trách">
            <select name="owner_id" defaultValue={campaign?.owner_id ?? ""}>
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
        </div>
        <Field label="Dịp / occasion">
          <input
            name="occasion"
            required
            maxLength={200}
            defaultValue={campaign?.occasion}
            placeholder="Pilot, Tết, Valentine…"
          />
        </Field>
        <div className="form-grid">
          <Field label="Ngày bắt đầu">
            <input
              name="launch_date"
              type="date"
              required
              defaultValue={campaign?.launch}
            />
          </Field>
          <Field label="Ngày kết thúc">
            <input
              name="end_date"
              type="date"
              required
              defaultValue={campaign?.end}
            />
          </Field>
          <Field label="Ngân sách trần (đ)">
            <input
              name="budget"
              type="number"
              min="0"
              required
              defaultValue={campaign?.budget ?? 0}
            />
          </Field>
          <Field label="Số đơn mục tiêu">
            <input
              name="target_orders"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={campaign?.orders ?? 0}
            />
          </Field>
        </div>
        <details className="form-details" open={Boolean(campaign)}>
          <summary>Deadline & vận hành</summary>
          <div className="form-grid">
            <Field label="Hạn chốt brief">
              <input
                name="brief_due"
                type="date"
                defaultValue={
                  campaign?.briefDue ||
                  (campaign ? dayOffset(campaign.launch, -14) : "")
                }
              />
            </Field>
            <Field label="Hạn duyệt asset">
              <input
                name="asset_due"
                type="date"
                defaultValue={
                  campaign?.assetDue ||
                  (campaign ? dayOffset(campaign.launch, -7) : "")
                }
              />
            </Field>
            <Field label="Hạn postmortem">
              <input
                name="postmortem_due"
                type="date"
                defaultValue={
                  campaign?.postmortemDue ||
                  (campaign ? dayOffset(campaign.end, 7) : "")
                }
              />
            </Field>
            <Field label="Cutoff giao hàng">
              <input
                name="cutoff_date"
                type="date"
                defaultValue={campaign?.cutoff}
              />
            </Field>
          </div>
          <Field label="Support script / người trực">
            <textarea
              name="support_note"
              rows={2}
              maxLength={5000}
              defaultValue={campaign?.support}
              placeholder="Ai trực, dùng kịch bản nào, xử lý ngoại lệ ra sao?"
            />
          </Field>
        </details>
        <Field label="Kênh">
          <input
            name="channel"
            required
            maxLength={200}
            defaultValue={campaign?.channel ?? "TikTok"}
          />
        </Field>
        <Field label="Brief">
          <textarea
            name="brief"
            required
            rows={4}
            maxLength={10000}
            defaultValue={campaign?.brief}
          />
        </Field>
        <Field label="Điều kiện dừng">
          <textarea
            name="stop_condition"
            required
            rows={2}
            maxLength={5000}
            defaultValue={campaign?.stop}
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
          <Button type="submit">{pending ? "Đang lưu…" : "Lưu campaign"}</Button>
        </div>
      </fieldset>
    </form>
  );
}
export function ConnectedCampaigns() {
  const { data } = useWorkspace();
  const campaigns = data.campaigns;
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [create, setCreate] = useState(false);
  const [month, setMonth] = useState("2026-11");
  const contributor = data.roles.some((r) => contributors.includes(r));
  const visible = campaigns.filter(
    (c) =>
      (!status || c.status === status) &&
      `${c.name} ${c.occasion}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  const date = new Date(`${month}-01T12:00:00Z`);
  const days = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset = (date.getUTCDay() + 6) % 7;
  function shift(n: number) {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <>
      <PageHeading
        eyebrow="MỖI LẦN MỞ BÁN, MỘT LỜI HỨA"
        title="Những cuộc hẹn sắp tới"
        description="Từ brief đầu tiên đến món quà cuối cùng được giao."
      >
        <Button
          disabled={!data.campaignsReady || !contributor}
          onClick={() => setCreate(true)}
        >
          <Plus size={17} />
          Tạo campaign
        </Button>
      </PageHeading>
      {!data.campaignsReady && (
        <p className="notice">
          Dữ liệu đã kết nối. Cần hoàn tất bước thiết lập Campaigns để bật
          chỉnh sửa.
        </p>
      )}
      <div className="campaign-overview">
        <Flag size={28} />
        <div>
          <strong>Một campaign chính. Cả đội cùng nhịp.</strong>
          <p>Chỉ mở bán khi sản phẩm, nội dung và vận hành đều sẵn sàng.</p>
        </div>
        <span>
          {campaigns.filter((c) => c.status === "live").length} đang chạy
        </span>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "list", label: "Tất cả campaign", count: campaigns.length },
          { value: "calendar", label: "Lịch mở bán" },
        ]}
      />
      <div className="work-toolbar">
        <Search value={query} onChange={setQuery} placeholder="Tìm campaign…" />
        <select
          aria-label="Trạng thái campaign"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(campaignLabels).map(([v, label]) => (
            <option value={v} key={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {tab === "list" ? (
        visible.length ? (
          <div className="campaign-grid">
            {visible.map((c, i) => {
              const done = c.readiness.filter((r) => r.done).length;
              return (
                <Link
                  className={`campaign-card campaign-color-${i % 3}`}
                  href={`/campaigns/${c.id}`}
                  key={c.id}
                >
                  <div className="campaign-card-top">
                    <Badge
                      tone={
                        c.status === "live"
                          ? "green"
                          : c.status === "preparing"
                            ? "blue"
                            : "neutral"
                      }
                    >
                      {campaignLabels[c.status]}
                    </Badge>
                    <ArrowUpRight size={22} />
                  </div>
                  <small>{c.occasion}</small>
                  <h2>{c.name}</h2>
                  <p>{c.brief}</p>
                  <div className="campaign-meta">
                    <span>
                      <Clock size={15} />
                      {shortDate(c.launch)} → {shortDate(c.end)}
                    </span>
                    <span>{c.channel}</span>
                  </div>
                  <div className="campaign-readiness">
                    <span>
                      {done === c.readiness.length ? (
                        <CheckCircle size={17} />
                      ) : (
                        <Flag size={17} />
                      )}{" "}
                      {done}/{c.readiness.length} điều kiện sẵn sàng
                    </span>
                    <strong>{c.orders || "Chưa chốt"} đơn mục tiêu</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty />
        )
      ) : (
        <section className="calendar-surface">
          <div className="calendar-toolbar">
            <h2>
              Tháng {date.getUTCMonth() + 1}, {date.getUTCFullYear()}
            </h2>
            <div className="button-row">
              <Button
                variant="outline"
                onClick={() => shift(-1)}
                aria-label="Tháng trước"
              >
                <ArrowLeft size={17} />
              </Button>
              <Button
                variant="outline"
                onClick={() => shift(1)}
                aria-label="Tháng sau"
              >
                <ArrowRight size={17} />
              </Button>
            </div>
          </div>
          <div className="calendar-scroll">
            <div className="calendar-grid">
              {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(
                (d) => (
                  <div className="calendar-day-label" key={d}>
                    {d}
                  </div>
                ),
              )}
              {Array.from(
                { length: Math.ceil((days + offset) / 7) * 7 },
                (_, i) => {
                  const n = i - offset + 1;
                  const current = `${month}-${String(n).padStart(2, "0")}`;
                  return (
                    <div
                      className={`calendar-cell ${n < 1 || n > days ? "outside" : ""}`}
                      key={i}
                    >
                      {n >= 1 && n <= days && (
                        <>
                          <span>{n}</span>
                          {visible
                            .filter((c) => c.launch === current)
                            .map((c) => (
                              <Link
                                className="calendar-event"
                                key={c.id}
                                href={`/campaigns/${c.id}`}
                              >
                                {c.name}
                                <small>Mở campaign</small>
                              </Link>
                            ))}
                        </>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
          <p className="form-hint">
            Lịch hiển thị ngày bắt đầu campaign. Mở từng campaign để xem thời
            gian và readiness.
          </p>
        </section>
      )}
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Một campaign mới"
      >
        <CampaignForm onClose={() => setCreate(false)} />
      </Modal>
    </>
  );
}
export function ConnectedCampaignDetail({ id }: { id: string }) {
  const { data } = useWorkspace();
  const campaign = data.campaigns.find((c) => c.id === id);
  return campaign ? (
    <LiveCampaign key={id} campaign={campaign} />
  ) : (
    <Empty
      title="Không tìm thấy campaign"
      description="Tải lại danh sách hoặc kiểm tra quyền truy cập."
    >
      <Button asChild variant="outline">
        <Link href="/campaigns">Về Campaigns</Link>
      </Button>
    </Empty>
  );
}
function LiveCampaign({ campaign }: { campaign: Campaign }) {
  const { data } = useWorkspace();
  const router = useRouter();
  const { run, pending, error } = useCampaignMutation(campaign);
  const [tab, setTab] = useState("readiness");
  const [edit, setEdit] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const c = campaign;
  const founder = data.roles.includes("founder");
  const contributor = data.roles.some((r) => contributors.includes(r));
  const planner = data.roles.some((r) => planners.includes(r));
  const unlocked = !!data.campaignsReady && contributor;
  const ready = c.readiness.every((r) => r.done);
  const done = c.readiness.filter((r) => r.done).length;
  const locked = c.status === "live" || c.status === "complete";
  const contentGap = campaignContentGaps([c], data.content).at(0);
  function launchCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = { reason: String(f.get("reason") || "").trim() };
    run({ operation: "launch", payload } as CampaignCommand, () =>
      setLaunchOpen(false),
    );
  }
  const refresh = () => router.refresh();
  return (
    <>
      <Link href="/campaigns" className="back-link">
        ← Tất cả campaign
      </Link>
      <PageHeading eyebrow={c.occasion} title={c.name} description={c.product}>
        <Button
          variant="outline"
          disabled={!unlocked || pending}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa brief
        </Button>
        {c.status !== "live" && c.status !== "complete" ? (
          <Button
            disabled={!unlocked || pending}
            onClick={() => setLaunchOpen(true)}
          >
            Kiểm tra mở bán <ArrowUpRight size={17} />
          </Button>
        ) : c.status === "live" ? (
          <Button
            disabled={!data.campaignsReady || !planner || pending}
            onClick={() =>
              run({ operation: "complete", payload: {} } as CampaignCommand)
            }
          >
            Kết thúc campaign
          </Button>
        ) : (
          <Badge tone="green">Đã kết thúc</Badge>
        )}
      </PageHeading>
      {!data.campaignsReady && (
        <p className="notice">
          Cần hoàn tất bước thiết lập Campaigns để lưu thay đổi.
        </p>
      )}
      {error && (
        <div className="notice" role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={refresh} disabled={pending}>
            Tải lại dữ liệu
          </Button>
        </div>
      )}
      {contentGap && (
        <p className="notice">
          Còn {contentGap.days} ngày tới ngày mở bán mà{" "}
          {contentGap.total === 0
            ? "chưa có nội dung nào gắn vào campaign này"
            : `mới ${contentGap.ready}/${contentGap.total} nội dung đã lên lịch hoặc xuất bản`}
          . Mở{" "}
          <Link className="text-link" href="/content">
            Content Studio
          </Link>{" "}
          để chuẩn bị.
        </p>
      )}
      <div className="summary-strip">
        <div>
          <span>Thời gian</span>
          <strong>
            {shortDate(c.launch)} → {shortDate(c.end)}
          </strong>
        </div>
        <div>
          <span>Ngân sách trần</span>
          <strong>{money(c.budget)}</strong>
        </div>
        <div>
          <span>Mục tiêu</span>
          <strong>
            {c.orders || "Chưa chốt"}
            {c.orders ? " đơn" : ""}
          </strong>
        </div>
        <div>
          <span>Người phụ trách</span>
          <strong>{c.owner}</strong>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "readiness", label: "Sẵn sàng mở bán", count: done },
          { value: "brief", label: "Brief & kế hoạch" },
        ]}
      />
      {tab === "readiness" ? (
        <div className="detail-grid">
          <section className="surface checklist-panel">
            <div className="section-heading">
              <h2>Launch checklist</h2>
              <Badge tone={ready ? "green" : "amber"}>
                {done}/{c.readiness.length} hoàn tất
              </Badge>
            </div>
            {c.readiness.map((r) => (
              <label className="check-row" key={r.id}>
                <input
                  type="checkbox"
                  checked={r.done}
                  disabled={!unlocked || locked || pending}
                  onChange={(e) =>
                    run({
                      operation: "readiness_toggle",
                      payload: { id: r.id!, completed: e.target.checked },
                    } as CampaignCommand)
                  }
                />
                <span>
                  <strong>{r.label}</strong>
                  <small>{r.owner}</small>
                </span>
                {r.done && <CheckCircle size={19} />}
              </label>
            ))}
          </section>
          <aside>
            <section className="surface launch-note">
              <Flag size={28} />
              <h2>
                {ready
                  ? "Sẵn sàng cho cuộc hẹn."
                  : "Còn những điều cần chuẩn bị."}
              </h2>
              <p>
                {ready
                  ? "Các điều kiện đã được đánh dấu hoàn tất. Kiểm tra lần cuối trước khi mở campaign."
                  : "Mỗi điều kiện là một lời hứa với khách hàng. Gỡ từng mục trước ngày mở bán."}
              </p>
              <strong>{c.readiness.length - done} mục còn lại</strong>
            </section>
            <section className="surface">
              <h2>Điều kiện dừng</h2>
              <p>{c.stop}</p>
              <Link className="text-link" href="/content">
                Xem Content Studio →
              </Link>
            </section>
          </aside>
        </div>
      ) : (
        <div className="detail-grid">
          <section className="surface">
            <h2>Brief campaign</h2>
            <p>{c.brief}</p>
            <h2>Kênh triển khai</h2>
            <p>{c.channel}</p>
            <h2>Support & trực launch</h2>
            <p>
              {c.support ||
                "Chưa chốt kịch bản và người trực. Cập nhật trong brief trước khi mở bán."}
            </p>
            <Link href="/content" className="text-link">
              Nội dung & asset trong Content Studio →
            </Link>
          </section>
          <section className="surface">
            <h2>Mốc quan trọng</h2>
            {[
              ["Chốt brief", c.briefDue || dayOffset(c.launch, -14)],
              ["Duyệt asset", c.assetDue || dayOffset(c.launch, -7)],
              ["Cutoff giao hàng", c.cutoff || "Chưa chốt"],
              ["Postmortem", c.postmortemDue || dayOffset(c.end, 7)],
            ].map(([label, date]) => (
              <div className="simple-row" key={label}>
                <span>{label}</span>
                <strong>{date}</strong>
              </div>
            ))}
            <div className="simple-row">
              <span>Bắt đầu</span>
              <strong>{c.launch}</strong>
            </div>
            <div className="simple-row">
              <span>Kết thúc</span>
              <strong>{c.end}</strong>
            </div>
            <p className="form-hint">
              Deadline gợi ý khi chưa tùy chỉnh: brief trước 14 ngày, asset
              trước 7 ngày, postmortem sau 7 ngày.
            </p>
          </section>
        </div>
      )}
      <Modal
        open={edit}
        onClose={() => setEdit(false)}
        title="Chỉnh sửa campaign"
      >
        <CampaignForm campaign={c} onClose={() => setEdit(false)} />
      </Modal>
      <Modal
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        title="Kiểm tra trước khi mở bán"
      >
        <form onSubmit={launchCampaign} className="form-stack">
          <fieldset disabled={pending} className="live-fieldset">
            <Badge tone={ready ? "green" : "amber"}>
              {ready
                ? "Tất cả điều kiện đã hoàn tất"
                : `${c.readiness.length - done} điều kiện chưa hoàn tất`}
            </Badge>
            <p>
              {ready
                ? "Founder hoặc Ops có thể mở campaign này."
                : founder
                  ? "Chỉ Founder được override, kèm lý do chấp nhận rủi ro."
                  : "Cần hoàn tất readiness hoặc nhờ Founder override kèm lý do."}
            </p>
            {!ready && (
              <Field label="Lý do override">
                <textarea name="reason" required rows={4} maxLength={2000} />
              </Field>
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
                onClick={() => setLaunchOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                {pending ? "Đang lưu…" : "Mở campaign"}
              </Button>
            </div>
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
