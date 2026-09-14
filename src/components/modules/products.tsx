"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  NotePencil,
  Archive,
} from "@phosphor-icons/react";
import { useWorkspace } from "../workspace-provider";
import { TaskList } from "../task-list";
import {
  PageHeading,
  Tabs,
  Search,
  Modal,
  Field,
  FormFooter,
  Badge,
  Empty,
  PreviewHint,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
import { ProductEvidence } from "./product-evidence";
import { ConnectedProducts, ConnectedProductDetail } from "./connected-products";
import { stageLabels } from "@/lib/preview-data";
import type { Product } from "@/lib/domain/types";
function ProductForm({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const { setData, setCampaigns, editable, record } = useWorkspace();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const next: Product = {
      id: product?.id ?? crypto.randomUUID(),
      name: v("name"),
      slug: product?.slug ?? v("name").toLowerCase().replaceAll(" ", "-"),
      moment: v("moment"),
      audience: v("audience"),
      promise: v("promise"),
      stage: product?.stage ?? "idea",
    };
    setData((d) => ({
      ...d,
      products: product
        ? d.products.map((p) => (p.id === product.id ? next : p))
        : [...d.products, next],
      tasks: product
        ? d.tasks.map((t) =>
            t.product === product.name ? { ...t, product: next.name } : t,
          )
        : d.tasks,
    }));
    if (product)
      setCampaigns((items) =>
        items.map((c) =>
          c.product === product.name ? { ...c, product: next.name } : c,
        ),
      );
    record(`${product ? "Chỉnh sửa" : "Tạo"} sản phẩm ${next.name}`);
    onClose();
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <Field label="Tên sản phẩm">
        <input name="name" required defaultValue={product?.name} />
      </Field>
      <Field label="Khoảnh khắc / moment">
        <textarea
          name="moment"
          required
          rows={3}
          defaultValue={product?.moment}
          placeholder="Sản phẩm xuất hiện trong khoảnh khắc nào?"
        />
      </Field>
      <Field label="Dành cho ai?">
        <textarea
          name="audience"
          required
          rows={2}
          defaultValue={product?.audience}
        />
      </Field>
      <Field label="Lời hứa sản phẩm">
        <textarea
          name="promise"
          required
          rows={3}
          defaultValue={product?.promise}
        />
      </Field>
      <FormFooter onClose={onClose} />
    </form>
  );
}
export function Products() {
  const { data } = useWorkspace();
  return data.mode === "connected" ? <ConnectedProducts /> : <PreviewProducts />;
}
export function ProductDetail({ id }: { id: string }) {
  const { data } = useWorkspace();
  return data.mode === "connected" ? (
    <ConnectedProductDetail id={id} />
  ) : (
    <PreviewProductDetail id={id} />
  );
}
function PreviewProducts() {
  const { data, editable } = useWorkspace();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [create, setCreate] = useState(false);
  const visible = data.products.filter(
    (p) =>
      (!stage || p.stage === stage) &&
      `${p.name} ${p.moment}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <>
      <PageHeading
        eyebrow="NHỮNG ĐIỀU MÌNH MUỐN TẠO RA"
        title="Mỗi ý tưởng, một cách gần nhau"
        description="Giữ ý tưởng rộng mở. Giữ nguồn lực thật tập trung."
      >
        <Button disabled={!editable} onClick={() => setCreate(true)}>
          <Plus size={17} />
          Thêm ý tưởng
        </Button>
      </PageHeading>
      <div className="work-toolbar">
        <Search
          value={query}
          onChange={setQuery}
          placeholder="Tìm sản phẩm hoặc khoảnh khắc…"
        />
        <select
          aria-label="Lọc giai đoạn sản phẩm"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">Tất cả giai đoạn</option>
          {Object.entries(stageLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <span className="count-label">{visible.length} sản phẩm</span>
      </div>
      {visible.length ? (
        <div className="product-grid">
          {visible.map((p, i) => (
            <Link
              className={`product-card ${p.stage !== "idea" ? "product-featured" : ""}`}
              href={`/products/${p.id}`}
              key={p.id}
            >
              <div className="product-top">
                <span>
                  {p.stage === "idea"
                    ? "TRONG SỔ Ý TƯỞNG"
                    : stageLabels[p.stage].toUpperCase()}
                </span>
                <ArrowUpRight size={22} />
              </div>
              <span className="product-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{p.name}</h2>
              <p>{p.moment}</p>
              <div className="product-stage">
                <span>{stageLabels[p.stage]}</span>
                <small>
                  {data.tasks.filter((t) => t.product === p.name).length} công
                  việc
                </small>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty />
      )}
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Ghi lại một ý tưởng"
      >
        <ProductForm onClose={() => setCreate(false)} />
      </Modal>
    </>
  );
}
function PreviewProductDetail({ id }: { id: string }) {
  const { data, setData, editable, record, stageNotes, setStageNotes } =
    useWorkspace();
  const p = data.products.find((p) => p.id === id);
  const [tab, setTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [stage, setStage] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (!p)
    return (
      <Empty
        title="Không tìm thấy sản phẩm"
        description="Ý tưởng có thể chỉ tồn tại trong phiên thử trước đó."
      >
        <Button asChild>
          <Link href="/products">Về Products</Link>
        </Button>
      </Empty>
    );
  const product = p;
  const linked = data.tasks.filter((t) => t.product === p.name);
  const notes = stageNotes[id] ?? [];
  function changeStage(e: React.FormEvent) {
    e.preventDefault();
    if (!editable) return;
    if (
      stage === "build" &&
      data.products.some((other) => other.id !== id && other.stage === "build")
    ) {
      setError(
        "Đã có một sản phẩm đang Build. Hoàn tất hoặc đổi giai đoạn sản phẩm đó trước.",
      );
      return;
    }
    if (
      ["discovery", "design"].includes(stage) &&
      data.products.some(
        (other) =>
          other.id !== id && ["discovery", "design"].includes(other.stage),
      )
    ) {
      setError(
        "Đội đang có một sản phẩm ở Discovery/Design. Giữ một sản phẩm trong giai đoạn này.",
      );
      return;
    }
    setData((d) => ({
      ...d,
      products: d.products.map((item) =>
        item.id === id ? { ...item, stage } : item,
      ),
    }));
    setStageNotes((items) => ({
      ...items,
      [id]: [
        `${stageLabels[product.stage]} → ${stageLabels[stage]}: ${note.trim()}`,
        ...(items[id] ?? []),
      ],
    }));
    record(`Đổi giai đoạn ${product.name}: ${stageLabels[stage]}`);
    setStageOpen(false);
    setNote("");
  }
  return (
    <>
      <Link className="back-link" href="/products">
        ← Sổ sản phẩm
      </Link>
      <PageHeading
        eyebrow={stageLabels[p.stage]}
        title={p.name}
        description={p.moment}
      >
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa
        </Button>
        <Button
          disabled={!editable}
          onClick={() => {
            setStage(p.stage);
            setError("");
            setStageOpen(true);
          }}
        >
          Chuyển giai đoạn <ArrowRight size={17} />
        </Button>
      </PageHeading>
      <div className="product-progress">
        {[
          "idea",
          "discovery",
          "design",
          "ready_for_build",
          "build",
          "pilot",
          "live",
        ].map((s) => (
          <div className={s === p.stage ? "active" : ""} key={s}>
            <span />
            {stageLabels[s]}
          </div>
        ))}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Tổng quan" },
          { value: "evidence", label: "Tài liệu & bằng chứng" },
          { value: "work", label: "Công việc", count: linked.length },
          { value: "history", label: "Lịch sử giai đoạn", count: notes.length },
        ]}
      />
      {tab === "overview" ? (
        <>
          <div className="detail-grid">
            <section className="surface product-promise">
              <span className="eyebrow">ĐIỀU MÌNH HỨA</span>
              <h2>Lời hứa sản phẩm</h2>
              <p>{p.promise}</p>
            </section>
            <section className="surface">
              <h2>Dành cho ai?</h2>
              <p>{p.audience}</p>
              <h2>Khoảnh khắc</h2>
              <p>{p.moment}</p>
            </section>
          </div>
          <section className="surface">
            <div className="section-heading">
              <h2>Đưa ý tưởng tiến lên</h2>
              <Badge tone="blue">{stageLabels[p.stage]}</Badge>
            </div>
            <p>
              Liên kết output nghiên cứu và thiết kế ngay trong công việc. Khi
              chuyển giai đoạn, ghi rõ căn cứ để đội biết vì sao mình đi tiếp.
            </p>
            <div className="work-summary">
              <span>
                <strong>{linked.length}</strong> công việc liên quan
              </span>
              <span>
                <strong>
                  {linked.filter((t) => t.status === "done").length}
                </strong>{" "}
                đã hoàn tất
              </span>
              <span>
                <strong>
                  {linked.filter((t) => t.status === "blocked").length}
                </strong>{" "}
                đang bị chặn
              </span>
            </div>
            <Button variant="outline" onClick={() => setTab("work")}>
              Xem công việc <ArrowRight size={16} />
            </Button>
          </section>
        </>
      ) : tab === "evidence" ? (
        <ProductEvidence productId={id} />
      ) : tab === "work" ? (
        <TaskList tasks={linked} />
      ) : (
        <section className="surface">
          <h2>Vì sao mình đi tiếp?</h2>
          {notes.length ? (
            <div className="history-list">
              {notes.map((n, i) => (
                <article key={i}>
                  <NotePencil size={22} />
                  <div>
                    <small>Founder · ghi chú trong bản thử</small>
                    <p>{n}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Chưa có thay đổi trong phiên này"
              description="Ghi chú chuyển giai đoạn sẽ xuất hiện ở đây."
            />
          )}
          <PreviewHint />
        </section>
      )}
      <Modal
        open={edit}
        onClose={() => setEdit(false)}
        title="Chỉnh sửa sản phẩm"
      >
        <ProductForm product={p} onClose={() => setEdit(false)} />
      </Modal>
      <Modal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title="Một bước tiếp theo"
      >
        <form className="form-stack" onSubmit={changeStage}>
          <p className="muted">
            Mỗi lần đổi giai đoạn cần một lý do rõ ràng. Bạn đang thử luồng của
            Founder.
          </p>
          <Field label="Giai đoạn tiếp theo">
            <select
              required
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {Object.entries(stageLabels).map(([s, label]) => (
                <option key={s} value={s} disabled={s === p.stage}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lý do & căn cứ">
            <textarea
              required
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Đội đã kiểm chứng điều gì? Vì sao chọn bước này?"
            />
          </Field>
          {["pilot", "live"].includes(stage) && (
            <label className="inline-check">
              <input type="checkbox" required />
              Đã kiểm tra trải nghiệm, người phụ trách support và readiness vận
              hành.
            </label>
          )}
          {stage === "archived" && (
            <p className="notice">
              <Archive size={20} />Ý tưởng sẽ chuyển vào giai đoạn lưu trữ,
              không bị xóa.
            </p>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <FormFooter
            onClose={() => setStageOpen(false)}
            label="Chuyển trong bản thử"
          />
        </form>
      </Modal>
    </>
  );
}
