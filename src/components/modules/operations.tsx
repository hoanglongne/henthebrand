"use client";
import { useState } from "react";
import {
  Plus,
  Package,
  WarningCircle,
  ArrowUpRight,
  CheckCircle,
  DownloadSimple,
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
import { money, type Stock, type Vendor, type Issue } from "@/lib/preview-data";
type Selection =
  | { kind: "stock"; item?: Stock }
  | { kind: "vendor"; item?: Vendor }
  | { kind: "issue"; item?: Issue };
function OpsForm({
  selection,
  onClose,
}: {
  selection: Selection;
  onClose: () => void;
}) {
  const { editable, record, setStock, setVendors, setIssues, data } =
    useWorkspace();
  const [error, setError] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const n = (k: string) => Number(v(k));
    const id = selection.item?.id ?? crypto.randomUUID();
    if (selection.kind === "stock") {
      if (n("reserved") > n("onHand")) {
        setError("Số đã giữ không thể lớn hơn tồn thực tế.");
        return;
      }
      const next: Stock = {
        id,
        name: v("name"),
        code: v("code"),
        category: v("category"),
        onHand: n("onHand"),
        reserved: n("reserved"),
        buffer: n("buffer"),
        reorder: n("reorder"),
        cost: n("cost"),
      };
      setStock((items) =>
        selection.item
          ? items.map((i) => (i.id === id ? next : i))
          : [...items, next],
      );
    } else if (selection.kind === "vendor") {
      const next: Vendor = {
        id,
        name: v("name"),
        category: v("category"),
        contact: v("contact"),
        lead: n("lead"),
        moq: n("moq"),
        sample: v("sample"),
        note: v("note"),
      };
      setVendors((items) =>
        selection.item
          ? items.map((i) => (i.id === id ? next : i))
          : [...items, next],
      );
    } else {
      if (v("status") === "Đã xử lý" && !v("resolution")) {
        setError("Ghi cách giải quyết trước khi đóng sự cố.");
        return;
      }
      const next: Issue = {
        id,
        title: v("title"),
        ref: v("ref"),
        severity: v("severity"),
        owner: v("owner"),
        status: v("status"),
        resolution: v("resolution"),
      };
      setIssues((items) =>
        selection.item
          ? items.map((i) => (i.id === id ? next : i))
          : [next, ...items],
      );
    }
    record("Cập nhật bản thử vận hành");
    onClose();
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      {selection.kind === "stock" ? (
        <>
          <Field label="Tên SKU / vật tư">
            <input name="name" required defaultValue={selection.item?.name} />
          </Field>
          <div className="form-grid">
            <Field label="Mã SKU">
              <input name="code" required defaultValue={selection.item?.code} />
            </Field>
            <Field label="Nhóm">
              <select name="category" defaultValue={selection.item?.category}>
                {["Thành phẩm", "Bao bì", "Phụ kiện"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            {(
              [
                { key: "onHand", label: "Tồn thực tế" },
                { key: "reserved", label: "Đã giữ cho đơn" },
                { key: "buffer", label: "Buffer" },
                { key: "reorder", label: "Ngưỡng đặt thêm" },
                { key: "cost", label: "Chi phí mỗi đơn vị (đ)" },
              ] as const
            ).map(({ key, label }) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  name={key}
                  defaultValue={selection.item?.[key] ?? 0}
                />
              </Field>
            ))}
          </div>
        </>
      ) : selection.kind === "vendor" ? (
        <>
          <Field label="Tên đối tác">
            <input name="name" required defaultValue={selection.item?.name} />
          </Field>
          <Field label="Nhóm cung ứng">
            <input
              name="category"
              required
              defaultValue={selection.item?.category}
            />
          </Field>
          <Field label="Thông tin liên hệ">
            <input
              name="contact"
              required
              defaultValue={selection.item?.contact}
              placeholder="Người phụ trách / email / số điện thoại"
            />
          </Field>
          <div className="form-grid">
            <Field label="Lead time (ngày)">
              <input
                name="lead"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={selection.item?.lead ?? 7}
              />
            </Field>
            <Field label="MOQ">
              <input
                name="moq"
                type="number"
                min="1"
                step="1"
                required
                defaultValue={selection.item?.moq ?? 50}
              />
            </Field>
          </div>
          <Field label="Trạng thái mẫu">
            <select name="sample" defaultValue={selection.item?.sample}>
              {[
                "Chưa đặt mẫu",
                "Đang chờ mẫu",
                "Cần chỉnh mẫu",
                "Đã duyệt mẫu",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea
              name="note"
              rows={4}
              defaultValue={selection.item?.note}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Sự cố">
            <input name="title" required defaultValue={selection.item?.title} />
          </Field>
          <Field
            label="Mã đơn / dry run"
            hint="Chỉ dùng mã đối chiếu; không nhập nội dung riêng tư của khách."
          >
            <input name="ref" required defaultValue={selection.item?.ref} />
          </Field>
          <div className="form-grid">
            <Field label="Mức độ">
              <select name="severity" defaultValue={selection.item?.severity}>
                {["Thấp", "Trung bình", "Cao"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select name="status" defaultValue={selection.item?.status}>
                {["Mới ghi nhận", "Đang xử lý", "Đã xử lý"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Người xử lý">
            <select name="owner" defaultValue={selection.item?.owner ?? "Ops"}>
              {data.members.map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Cách giải quyết">
            <textarea
              name="resolution"
              rows={4}
              defaultValue={selection.item?.resolution}
            />
          </Field>
        </>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <FormFooter onClose={onClose} />
    </form>
  );
}
export function Operations() {
  const { stock, vendors, issues, editable } = useWorkspace();
  const [tab, setTab] = useState("inventory");
  const [query, setQuery] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [packed, setPacked] = useState<string[]>([]);
  const low = stock.filter(
    (s) => s.onHand - s.reserved <= Math.max(s.buffer, s.reorder),
  );
  const openIssues = issues.filter((i) => i.status !== "Đã xử lý");
  const match = (value: string) =>
    value.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"));
  const inventory = stock.filter(
    (s) => match(`${s.name} ${s.code}`) && (!onlyAttention || low.includes(s)),
  );
  const vendorRows = vendors.filter((v) => match(v.name));
  const issueRows = issues.filter(
    (i) =>
      match(`${i.title} ${i.ref}`) &&
      (!onlyAttention || i.status !== "Đã xử lý"),
  );
  const checklist = [
    "Kiểm tra đúng sản phẩm và mã đơn",
    "Scan thử card QR trên điện thoại",
    "Kiểm tra ngoại quan hộp và card",
    "Thêm phong bì, lời nhắn và hướng dẫn",
    "Chèn chống sốc, dán tem niêm phong",
    "Đối chiếu lần cuối trước khi bàn giao",
  ];
  function exportInventory() {
    const rows = [
      ["SKU", "Tên", "Tồn", "Đã giữ", "Khả dụng", "Ngưỡng đặt thêm"],
      ...inventory.map((s) => [
        s.code,
        s.name,
        s.onHand,
        s.reserved,
        s.onHand - s.reserved,
        s.reorder,
      ]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((r) =>
          r
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/^[=+@-]/, "'")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = editable ? "hen-ton-kho-du-lieu-mau.csv" : "hen-ton-kho.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow="CHĂM CHÚT TỚI ĐIỀU NHỎ NHẤT"
        title="Món quà tới tay, thật trọn vẹn"
        description="Đối tác, vật tư và từng bước đóng gói ở cùng một nơi."
      >
        <Button
          disabled={!editable}
          onClick={() =>
            setSelection({
              kind:
                tab === "vendors"
                  ? "vendor"
                  : tab === "issues"
                    ? "issue"
                    : "stock",
            })
          }
        >
          <Plus size={17} />
          {tab === "vendors"
            ? "Thêm đối tác"
            : tab === "issues"
              ? "Ghi nhận sự cố"
              : "Thêm vật tư"}
        </Button>
      </PageHeading>
      <ModuleBoundary />
      <div className="ops-overview">
        <div>
          <Package size={25} />
          <span>
            <strong>{stock.length} SKU / vật tư</strong>
            <small>Trong danh mục vận hành</small>
          </span>
        </div>
        <div>
          <WarningCircle size={25} />
          <span>
            <strong>{low.length} vật tư cần chú ý</strong>
            <small>Khả dụng chạm ngưỡng dự phòng</small>
          </span>
        </div>
        <div>
          <span className="ops-number">{openIssues.length}</span>
          <span>
            <strong>Sự cố đang mở</strong>
            <small>Ưu tiên xử lý trước đợt tiếp theo</small>
          </span>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setQuery("");
          setOnlyAttention(false);
        }}
        items={[
          { value: "inventory", label: "Tồn kho", count: stock.length },
          { value: "vendors", label: "Đối tác & mẫu", count: vendors.length },
          {
            value: "issues",
            label: "Sự cố đơn hàng",
            count: openIssues.length,
          },
          { value: "packing", label: "Quy trình đóng gói" },
        ]}
      />
      {tab !== "packing" && (
        <div className="work-toolbar">
          <Search
            value={query}
            onChange={setQuery}
            placeholder={
              tab === "inventory"
                ? "Tìm mã SKU hoặc vật tư…"
                : tab === "vendors"
                  ? "Tìm đối tác…"
                  : "Tìm sự cố hoặc mã đơn…"
            }
          />
          {tab !== "vendors" && (
            <label className="inline-check">
              <input
                type="checkbox"
                checked={onlyAttention}
                onChange={(e) => setOnlyAttention(e.target.checked)}
              />
              Cần chú ý
            </label>
          )}
          {tab === "inventory" && (
            <Button variant="outline" onClick={exportInventory}>
              <DownloadSimple size={17} />
              Xuất CSV
            </Button>
          )}
        </div>
      )}
      {tab === "inventory" ? (
        inventory.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vật tư / SKU</th>
                  <th>Tồn thực tế</th>
                  <th>Đã giữ</th>
                  <th>Khả dụng</th>
                  <th>Chi phí / đơn vị</th>
                  <th>Trạng thái</th>
                  <th>
                    <span className="sr-only">Chi tiết</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>
                        {s.code} · {s.category}
                      </small>
                    </td>
                    <td>{s.onHand}</td>
                    <td>{s.reserved}</td>
                    <td>
                      <strong>{s.onHand - s.reserved}</strong>
                    </td>
                    <td>{money(s.cost)}</td>
                    <td>
                      <Badge tone={low.includes(s) ? "amber" : "green"}>
                        {low.includes(s) ? "Cần đặt thêm" : "Đủ dự phòng"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Chỉnh ${s.code}`}
                        onClick={() => setSelection({ kind: "stock", item: s })}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )
      ) : tab === "vendors" ? (
        vendorRows.length ? (
          <div className="vendor-grid">
            {vendorRows.map((v) => (
              <button
                className="vendor-card surface"
                key={v.id}
                onClick={() => setSelection({ kind: "vendor", item: v })}
              >
                <div className="section-heading">
                  <span className="vendor-monogram">{v.name.charAt(0)}</span>
                  <ArrowUpRight size={20} />
                </div>
                <small>{v.category}</small>
                <h2>{v.name}</h2>
                <Badge tone={v.sample === "Đã duyệt mẫu" ? "green" : "amber"}>
                  {v.sample}
                </Badge>
                <div className="vendor-stats">
                  <div>
                    <strong>{v.lead} ngày</strong>
                    <small>Lead time</small>
                  </div>
                  <div>
                    <strong>{v.moq}</strong>
                    <small>MOQ</small>
                  </div>
                </div>
                <p>{v.note}</p>
              </button>
            ))}
          </div>
        ) : (
          <Empty />
        )
      ) : tab === "issues" ? (
        issueRows.length ? (
          <div className="issue-list">
            {issueRows.map((i) => (
              <button
                className="issue-row surface"
                key={i.id}
                onClick={() => setSelection({ kind: "issue", item: i })}
              >
                <WarningCircle size={25} />
                <div>
                  <small>
                    {i.ref} · {i.owner}
                  </small>
                  <h3>{i.title}</h3>
                  {i.resolution && <p>{i.resolution}</p>}
                </div>
                <Badge tone={i.severity === "Cao" ? "coral" : "amber"}>
                  {i.severity}
                </Badge>
                <Badge tone={i.status === "Đã xử lý" ? "green" : "neutral"}>
                  {i.status}
                </Badge>
                <ArrowUpRight size={20} />
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="Không có sự cố cần xử lý"
            description="Các sự cố mới sẽ xuất hiện ở đây."
          />
        )
      ) : (
        <div className="detail-grid">
          <section className="surface">
            <div className="section-heading">
              <h2>Only When We Meet · Gift</h2>
              <Badge
                tone={packed.length === checklist.length ? "green" : "neutral"}
              >
                {packed.length}/{checklist.length}
              </Badge>
            </div>
            <p className="muted">
              Checklist dry run mẫu. Chạy thử từng bước trước khi đóng gói cho
              khách.
            </p>
            {checklist.map((step, i) => (
              <label className="check-row" key={step}>
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={packed.includes(step)}
                  onChange={() =>
                    setPacked((items) =>
                      items.includes(step)
                        ? items.filter((s) => s !== step)
                        : [...items, step],
                    )
                  }
                />
                <span>
                  <strong>{step}</strong>
                  <small>Bước {i + 1}</small>
                </span>
              </label>
            ))}
            {packed.length === checklist.length && (
              <p className="success-note">
                <CheckCircle size={20} />
                Dry run trong bản thử đã hoàn tất.
              </p>
            )}
            <PreviewHint />
          </section>
          <aside className="surface packing-note">
            <Package size={42} />
            <h2>Mở hộp là một phần của cuộc hẹn.</h2>
            <p>
              Hộp sạch, card quét được, lời nhắn đúng. Nếu một bước chưa đạt,
              dừng và ghi nhận sự cố.
            </p>
            <Button
              disabled={!editable}
              variant="outline"
              onClick={() => setSelection({ kind: "issue" })}
            >
              Ghi nhận sự cố
            </Button>
          </aside>
        </div>
      )}
      <Modal
        open={selection !== null}
        onClose={() => setSelection(null)}
        title={
          selection?.kind === "stock"
            ? "Chi tiết vật tư"
            : selection?.kind === "vendor"
              ? "Đối tác & mẫu"
              : "Sự cố vận hành"
        }
      >
        {selection && (
          <OpsForm selection={selection} onClose={() => setSelection(null)} />
        )}
      </Modal>
    </>
  );
}
