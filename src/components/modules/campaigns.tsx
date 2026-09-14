"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Flag,
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
  PreviewHint,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
import { dayOffset } from "@/lib/domain/rules";
import {
  campaignLabels,
  readinessTemplate,
  money,
  shortDate,
  type Campaign,
} from "@/lib/preview-data";
function CampaignForm({
  campaign,
  onClose,
}: {
  campaign?: Campaign;
  onClose: () => void;
}) {
  const { data, setCampaigns, editable, record } = useWorkspace();
  const [error, setError] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    const v = (key: string) => String(f.get(key) || "");
    const launch = v("launch"),
      end = v("end");
    if (end < launch) {
      e.currentTarget
        .querySelector<HTMLInputElement>("[name=end]")
        ?.setCustomValidity("Ngày kết thúc phải sau ngày mở bán.");
      e.currentTarget.reportValidity();
      return;
    }
    if (
      (v("briefDue") && v("briefDue") > launch) ||
      (v("assetDue") && v("assetDue") > launch)
    ) {
      setError("Hạn brief và asset không thể sau ngày mở campaign.");
      return;
    }
    if (v("postmortemDue") && v("postmortemDue") < end) {
      setError("Postmortem cần nằm sau ngày kết thúc campaign.");
      return;
    }
    const item: Campaign = {
      briefDue: v("briefDue"),
      assetDue: v("assetDue"),
      postmortemDue: v("postmortemDue"),
      cutoff: v("cutoff"),
      support: v("support"),
      id: campaign?.id ?? crypto.randomUUID(),
      name: v("name"),
      occasion: v("occasion"),
      product: v("product"),
      status: campaign?.status ?? "draft",
      channel: v("channel"),
      owner: v("owner"),
      launch,
      end,
      budget: Number(v("budget")),
      orders: Number(v("orders")),
      brief: v("brief"),
      stop: v("stop"),
      readiness:
        campaign?.readiness ?? readinessTemplate.map((r) => ({ ...r })),
    };
    setCampaigns((items) =>
      campaign
        ? items.map((c) => (c.id === campaign.id ? item : c))
        : [item, ...items],
    );
    record(`${campaign ? "Cập nhật" : "Tạo"} campaign ${item.name}`);
    onClose();
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <Field label="Tên campaign">
        <input
          name="name"
          required
          defaultValue={campaign?.name}
          placeholder="Ví dụ: Hẹn nhau ngày trở về"
        />
      </Field>
      <div className="form-grid">
        <Field label="Sản phẩm">
          <select name="product" defaultValue={campaign?.product}>
            {data.products.map((p) => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Người phụ trách">
          <select name="owner" defaultValue={campaign?.owner}>
            {data.members.map((m) => (
              <option key={m.name}>{m.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Dịp / occasion">
        <input
          name="occasion"
          required
          defaultValue={campaign?.occasion}
          placeholder="Pilot, Tết, Valentine…"
        />
      </Field>
      <div className="form-grid">
        <Field label="Ngày bắt đầu">
          <input
            name="launch"
            type="date"
            required
            defaultValue={campaign?.launch}
          />
        </Field>
        <Field label="Ngày kết thúc">
          <input
            name="end"
            type="date"
            required
            defaultValue={campaign?.end}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
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
            name="orders"
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
              name="briefDue"
              type="date"
              defaultValue={
                campaign?.briefDue ||
                (campaign ? dayOffset(campaign.launch, -14) : "")
              }
            />
          </Field>
          <Field label="Hạn duyệt asset">
            <input
              name="assetDue"
              type="date"
              defaultValue={
                campaign?.assetDue ||
                (campaign ? dayOffset(campaign.launch, -7) : "")
              }
            />
          </Field>
          <Field label="Hạn postmortem">
            <input
              name="postmortemDue"
              type="date"
              defaultValue={
                campaign?.postmortemDue ||
                (campaign ? dayOffset(campaign.end, 7) : "")
              }
            />
          </Field>
          <Field label="Cutoff giao hàng">
            <input name="cutoff" type="date" defaultValue={campaign?.cutoff} />
          </Field>
        </div>
        <Field label="Support script / người trực">
          <textarea
            name="support"
            rows={2}
            defaultValue={campaign?.support}
            placeholder="Ai trực, dùng kịch bản nào, xử lý ngoại lệ ra sao?"
          />
        </Field>
      </details>
      <Field label="Kênh">
        <input
          name="channel"
          required
          defaultValue={campaign?.channel ?? "TikTok"}
        />
      </Field>
      <Field label="Brief">
        <textarea
          name="brief"
          required
          rows={4}
          defaultValue={campaign?.brief}
        />
      </Field>
      <Field label="Điều kiện dừng">
        <textarea name="stop" required rows={2} defaultValue={campaign?.stop} />
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
export function Campaigns() {
  const { campaigns, editable } = useWorkspace();
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [create, setCreate] = useState(false);
  const [month, setMonth] = useState("2026-11");
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
        <Button disabled={!editable} onClick={() => setCreate(true)}>
          <Plus size={17} />
          Tạo campaign
        </Button>
      </PageHeading>
      <ModuleBoundary />
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
              {[
                "Thứ 2",
                "Thứ 3",
                "Thứ 4",
                "Thứ 5",
                "Thứ 6",
                "Thứ 7",
                "Chủ nhật",
              ].map((d) => (
                <div className="calendar-day-label" key={d}>
                  {d}
                </div>
              ))}
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
export function CampaignDetail({ id }: { id: string }) {
  const { campaigns, setCampaigns, editable, record, data } = useWorkspace();
  const campaign = campaigns.find((c) => c.id === id);
  const [tab, setTab] = useState("readiness");
  const [edit, setEdit] = useState(false);
  const [launch, setLaunch] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!campaign)
    return (
      <Empty
        title="Không tìm thấy campaign"
        description="Campaign có thể chỉ tồn tại trong phiên xem thử trước đó."
      >
        <Button asChild variant="outline">
          <Link href="/campaigns">Về Campaigns</Link>
        </Button>
      </Empty>
    );
  const c = campaign;
  const ready = c.readiness.every((r) => r.done);
  const done = c.readiness.filter((r) => r.done).length;
  const allowOverride = editable || data.roles.includes("founder");
  function toggle(index: number) {
    if (!editable) return;
    setCampaigns((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              readiness: item.readiness.map((r, i) =>
                i === index ? { ...r, done: !r.done } : r,
              ),
            }
          : item,
      ),
    );
    record(`Cập nhật readiness: ${c.readiness[index].label}`);
  }
  function launchCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    if (campaigns.some((other) => other.id !== id && other.status === "live")) {
      setError("Đã có một campaign đang chạy. Kết thúc campaign đó trước.");
      return;
    }
    if (!ready && (!allowOverride || !reason.trim())) {
      setError("Cần hoàn thành readiness hoặc ghi lý do override của Founder.");
      return;
    }
    setCampaigns((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: "live" } : item,
      ),
    );
    record(`Mở campaign ${c.name}${reason ? `: ${reason}` : ""}`);
    setLaunch(false);
  }
  return (
    <>
      <Link href="/campaigns" className="back-link">
        ← Tất cả campaign
      </Link>
      <PageHeading eyebrow={c.occasion} title={c.name} description={c.product}>
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa brief
        </Button>
        {c.status !== "live" && c.status !== "complete" ? (
          <Button disabled={!editable} onClick={() => setLaunch(true)}>
            Kiểm tra mở bán <ArrowUpRight size={17} />
          </Button>
        ) : c.status === "live" ? (
          <Button
            disabled={!editable}
            onClick={() => {
              setCampaigns((items) =>
                items.map((item) =>
                  item.id === id ? { ...item, status: "complete" } : item,
                ),
              );
              record(`Kết thúc campaign ${c.name}`);
            }}
          >
            Kết thúc bản thử
          </Button>
        ) : (
          <Badge tone="green">Đã kết thúc</Badge>
        )}
      </PageHeading>
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
            {c.readiness.map((r, i) => (
              <label className="check-row" key={r.label}>
                <input
                  type="checkbox"
                  checked={r.done}
                  disabled={
                    !editable || c.status === "live" || c.status === "complete"
                  }
                  onChange={() => toggle(i)}
                />
                <span>
                  <strong>{r.label}</strong>
                  <small>{r.owner}</small>
                </span>
                {r.done && <CheckCircle size={19} />}
              </label>
            ))}
            <PreviewHint />
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
        open={launch}
        onClose={() => setLaunch(false)}
        title="Kiểm tra trước khi mở bán"
      >
        <form onSubmit={launchCampaign} className="form-stack">
          <Badge tone={ready ? "green" : "amber"}>
            {ready
              ? "Tất cả điều kiện đã hoàn tất"
              : `${c.readiness.length - done} điều kiện chưa hoàn tất`}
          </Badge>
          <p>
            {ready
              ? "Bạn có thể thử chuyển campaign sang Đang chạy."
              : "Chỉ Founder được override, kèm lý do chấp nhận rủi ro. Trong bản thử, bạn có thể xem trước luồng Founder này."}
          </p>
          {!ready && (
            <Field label="Lý do override">
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </Field>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <FormFooter
            onClose={() => setLaunch(false)}
            label="Mở campaign trong bản thử"
          />
        </form>
      </Modal>
    </>
  );
}
