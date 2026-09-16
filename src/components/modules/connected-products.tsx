"use client";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  FileText,
  Archive,
  ArrowsLeftRight,
  Hourglass,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react";
import { mutateProduct, readProductDetails } from "@/app/actions/products";
import { type ProductCommand, type ProductDetails } from "@/lib/domain/live-products";
import { evidenceKinds, type Product } from "@/lib/domain/types";
import { stageLabels } from "@/lib/preview-data";
import { useWorkspace } from "../workspace-provider";
import { TaskList } from "../task-list";
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
function useProductMutation(product?: Product) {
  const { data } = useWorkspace();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function run(command: ProductCommand, onSuccess?: () => void) {
    setError("");
    startTransition(async () => {
      try {
        const result = await mutateProduct({
          workspaceId: data.workspaceId,
          productId: product?.id ?? null,
          expected: product?.updated_at ?? null,
          ...command,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess?.();
        if (!product) router.push(`/products/${result.productId}`);
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
function ProductForm({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const { run, pending, error } = useProductMutation(product);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const payload = {
      name: v("name"),
      moment: v("moment"),
      audience: v("audience"),
      promise: v("promise"),
      impact_score: Number(v("impact_score")) || null,
      effort_score: Number(v("effort_score")) || null,
    };
    run(
      { operation: product ? "update" : "create", payload } as ProductCommand,
      onClose,
    );
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset disabled={pending} className="live-fieldset">
        <Field label="Tên sản phẩm">
          <input name="name" required maxLength={200} defaultValue={product?.name} />
        </Field>
        <Field label="Khoảnh khắc / moment">
          <textarea
            name="moment"
            rows={3}
            defaultValue={product?.moment}
            placeholder="Sản phẩm xuất hiện trong khoảnh khắc nào?"
          />
        </Field>
        <Field label="Dành cho ai?">
          <textarea name="audience" rows={2} defaultValue={product?.audience} />
        </Field>
        <Field label="Lời hứa sản phẩm">
          <textarea name="promise" rows={3} defaultValue={product?.promise} />
        </Field>
        <div className="form-grid">
          <Field label="Tác động" hint="1 = nhỏ, 5 = đổi cuộc chơi">
            <select name="impact_score" defaultValue={product?.impact_score ?? ""}>
              <option value="">Chưa chấm</option>
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Công sức" hint="1 = làm nhanh, 5 = rất nặng">
            <select name="effort_score" defaultValue={product?.effort_score ?? ""}>
              <option value="">Chưa chấm</option>
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="button-row">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit">{pending ? "Đang lưu…" : "Lưu sản phẩm"}</Button>
        </div>
      </fieldset>
    </form>
  );
}
const STALE_DAYS = 21;
const movingStages = [
  "idea",
  "discovery",
  "design",
  "ready_for_build",
  "build",
  "pilot",
];
function daysInStage(product: Product) {
  if (!product.stage_since) return null;
  const started = Date.parse(product.stage_since);
  if (!Number.isFinite(started)) return null;
  return Math.max(0, Math.floor((Date.now() - started) / 86400000));
}
function isStalled(product: Product) {
  const days = daysInStage(product);
  return (
    days !== null && days >= STALE_DAYS && movingStages.includes(product.stage)
  );
}
function priorityScore(product: Product) {
  if (!product.impact_score || !product.effort_score) return null;
  return Math.round((product.impact_score / product.effort_score) * 10) / 10;
}
export function ConnectedProducts() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("stage");
  const [compare, setCompare] = useState(false);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [create, setCreate] = useState(false);
  const contributor = data.roles.some((r) =>
    ["founder", "ops", "product_designer", "brand_designer"].includes(r),
  );
  const stalled = data.products.filter(isStalled);
  const visible = data.products
    .filter(
      (p) =>
        (!stage || p.stage === stage) &&
        `${p.name} ${p.moment}`
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi")),
    )
    .sort((a, b) => {
      if (sort === "priority")
        return (priorityScore(b) ?? -1) - (priorityScore(a) ?? -1);
      if (sort === "stalled")
        return (daysInStage(b) ?? -1) - (daysInStage(a) ?? -1);
      return 0;
    });
  const leftProduct = data.products.find((p) => p.id === left);
  const rightProduct = data.products.find((p) => p.id === right);
  return (
    <>
      <PageHeading
        eyebrow="NHỮNG ĐIỀU MÌNH MUỐN TẠO RA"
        title="Mỗi ý tưởng, một cách gần nhau"
        description="Giữ ý tưởng rộng mở. Giữ nguồn lực thật tập trung."
      >
        <Button
          disabled={!data.catalogReady || !contributor}
          onClick={() => setCreate(true)}
        >
          <Plus size={17} />
          Thêm ý tưởng
        </Button>
      </PageHeading>
      {!data.catalogReady && (
        <p className="notice">
          Dữ liệu đã kết nối. Cần hoàn tất bước thiết lập Products để bật chỉnh
          sửa.
        </p>
      )}
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
        <select
          aria-label="Sắp xếp sản phẩm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="stage">Thứ tự mặc định</option>
          <option value="priority">Ưu tiên: tác động / công sức</option>
          <option value="stalled">Nằm lâu nhất một giai đoạn</option>
        </select>
        <Button variant="outline" onClick={() => setCompare((v) => !v)}>
          <ArrowsLeftRight size={16} />
          {compare ? "Đóng so sánh" : "So sánh 2 sản phẩm"}
        </Button>
        <span className="count-label">{visible.length} sản phẩm</span>
      </div>
      {stalled.length > 0 && (
        <p className="notice">
          <Hourglass size={18} />
          {stalled.length} ý tưởng đã ở yên một giai đoạn hơn {STALE_DAYS} ngày:{" "}
          {stalled.map((p) => p.name).join(", ")}. Đẩy đi tiếp hoặc chuyển vào
          lưu trữ để đội khỏi phải nhớ.
        </p>
      )}
      {compare && (
        <section className="surface">
          <div className="section-heading">
            <h2>So sánh hai hướng đi</h2>
            <ArrowsLeftRight size={22} />
          </div>
          <div className="form-grid">
            <Field label="Sản phẩm A">
              <select value={left} onChange={(e) => setLeft(e.target.value)}>
                <option value="">Chọn sản phẩm</option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sản phẩm B">
              <select value={right} onChange={(e) => setRight(e.target.value)}>
                <option value="">Chọn sản phẩm</option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {leftProduct && rightProduct ? (
            <div className="table-scroll">
              <table className="data-table compare-table">
                <thead>
                  <tr>
                    <th />
                    <th>{leftProduct.name}</th>
                    <th>{rightProduct.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "Giai đoạn",
                        (p: Product) => stageLabels[p.stage] ?? p.stage,
                      ],
                      [
                        "Đã ở giai đoạn này",
                        (p: Product) => {
                          const d = daysInStage(p);
                          return d === null ? "—" : `${d} ngày`;
                        },
                      ],
                      [
                        "Tác động / công sức",
                        (p: Product) =>
                          p.impact_score && p.effort_score
                            ? `${p.impact_score} / ${p.effort_score} (điểm ${priorityScore(p)})`
                            : "Chưa chấm",
                      ],
                      ["Bằng chứng", (p: Product) => `${p.evidenceCount ?? 0} mục`],
                      [
                        "Công việc gắn kèm",
                        (p: Product) =>
                          `${data.tasks.filter((t) => t.product === p.name).length} việc`,
                      ],
                      ["Khoảnh khắc", (p: Product) => p.moment || "—"],
                      ["Dành cho ai", (p: Product) => p.audience || "—"],
                      ["Lời hứa", (p: Product) => p.promise || "—"],
                    ] as [string, (p: Product) => string][]
                  ).map(([label, render]) => (
                    <tr key={label}>
                      <td>
                        <strong>{label}</strong>
                      </td>
                      <td>{render(leftProduct)}</td>
                      <td>{render(rightProduct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Chọn hai sản phẩm để đặt cạnh nhau.</p>
          )}
        </section>
      )}
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
              <div className="product-signals">
                {priorityScore(p) !== null && (
                  <span className="signal">
                    Ưu tiên {priorityScore(p)} · tác động {p.impact_score}/công
                    sức {p.effort_score}
                  </span>
                )}
                {daysInStage(p) !== null && (
                  <span className={`signal${isStalled(p) ? " signal-warn" : ""}`}>
                    <Hourglass size={13} />
                    {daysInStage(p)} ngày ở giai đoạn này
                  </span>
                )}
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
export function ConnectedProductDetail({ id }: { id: string }) {
  const { data } = useWorkspace();
  const product = data.products.find((p) => p.id === id);
  return product ? (
    <LiveProduct key={id} product={product} />
  ) : (
    <Empty
      title="Không tìm thấy sản phẩm"
      description="Tải lại danh sách hoặc kiểm tra quyền truy cập."
    >
      <Button asChild>
        <Link href="/products">Về Products</Link>
      </Button>
    </Empty>
  );
}
function LiveProduct({ product }: { product: Product }) {
  const { data } = useWorkspace();
  const router = useRouter();
  const { run, pending, error } = useProductMutation(product);
  const [tab, setTab] = useState("overview");
  const [edit, setEdit] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [stage, setStage] = useState("");
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const founder = data.roles.includes("founder");
  const contributor = data.roles.some((r) =>
    ["founder", "ops", "product_designer", "brand_designer"].includes(r),
  );
  const unlocked = !!data.catalogReady && contributor;
  const linked = data.tasks.filter((t) => t.product === product.name);
  const privilegedStages = ["build", "pilot", "live", "learned", "archived"];
  const evidenceCount = details?.evidence.length ?? product.evidenceCount ?? 0;
  const stageDays = daysInStage(product);
  const gates = [
    {
      label: "Đã rõ khoảnh khắc, đối tượng và lời hứa",
      hint: "Ba câu trả lời này là nền của mọi brief sau đó.",
      done: Boolean(product.moment && product.audience && product.promise),
    },
    {
      label: "Có ít nhất một bằng chứng",
      hint: `Đang có ${evidenceCount} tài liệu trong tab Bằng chứng.`,
      done: evidenceCount > 0,
    },
    {
      label: "Có việc đã hoàn tất cho sản phẩm này",
      hint: `${linked.filter((t) => t.status === "done").length}/${linked.length} công việc đã xong.`,
      done: linked.some((t) => t.status === "done"),
    },
    {
      label: "Đã chấm tác động và công sức",
      hint: product.impact_score
        ? `Tác động ${product.impact_score}, công sức ${product.effort_score}.`
        : "Chấm điểm giúp xếp thứ tự khi có nhiều ý tưởng cùng lúc.",
      done: Boolean(product.impact_score && product.effort_score),
    },
  ];
  const gatesDone = gates.filter((g) => g.done).length;
  useEffect(() => {
    let active = true;
    if (!data.catalogReady || !data.workspaceId) return;
    readProductDetails(data.workspaceId, product.id)
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
  }, [data.workspaceId, data.catalogReady, product.id, product.updated_at, reload]);
  function changeStage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      stage,
      note: String(f.get("note") || "").trim(),
      readiness_confirmed: f.get("readiness_confirmed") === "on",
    };
    run({ operation: "stage_change", payload } as ProductCommand, () => {
      setStageOpen(false);
      setReload((v) => v + 1);
    });
  }
  function addEvidence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      kind: String(f.get("kind") || ""),
      title: String(f.get("title") || "").trim(),
      summary: String(f.get("summary") || "").trim(),
      source_url: String(f.get("source_url") || "").trim(),
      observed_at: String(f.get("observed_at") || ""),
    };
    run({ operation: "evidence_add", payload } as ProductCommand, () => {
      setEvidenceOpen(false);
      setReload((v) => v + 1);
    });
  }
  const refresh = () => {
    router.refresh();
    setReload((v) => v + 1);
  };
  return (
    <>
      <Link className="back-link" href="/products">
        ← Sổ sản phẩm
      </Link>
      <PageHeading
        eyebrow={stageLabels[product.stage]}
        title={product.name}
        description={product.moment}
      >
        <Button
          variant="outline"
          disabled={!unlocked || pending}
          onClick={() => setEdit(true)}
        >
          Chỉnh sửa
        </Button>
        <Button
          disabled={!unlocked || pending}
          onClick={() => {
            setStage(product.stage);
            setStageOpen(true);
          }}
        >
          Chuyển giai đoạn <ArrowRight size={17} />
        </Button>
      </PageHeading>
      {!data.catalogReady && (
        <p className="notice">
          Cần hoàn tất bước thiết lập Products để xem bằng chứng và lưu thay
          đổi.
        </p>
      )}
      {(error || loadError) && (
        <div className="notice" role="alert">
          <p>{error || loadError}</p>
          <Button variant="outline" onClick={refresh} disabled={pending}>
            Tải lại dữ liệu
          </Button>
        </div>
      )}
      {stageDays !== null && (
        <p className={`stage-age${isStalled(product) ? " stage-age-warn" : ""}`}>
          <Hourglass size={16} />
          Đang ở {stageLabels[product.stage]} được {stageDays} ngày
          {isStalled(product)
            ? " — quá lâu so với nhịp 21 ngày của đội, cân nhắc đẩy tiếp hoặc lưu trữ."
            : "."}
        </p>
      )}
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
          <div className={s === product.stage ? "active" : ""} key={s}>
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
          {
            value: "evidence",
            label: "Tài liệu & bằng chứng",
            count: details?.evidence.length,
          },
          { value: "work", label: "Công việc", count: linked.length },
          {
            value: "history",
            label: "Lịch sử giai đoạn",
            count: details?.stageChanges.length,
          },
        ]}
      />
      {tab === "overview" ? (
        <>
          <section className="surface">
            <div className="section-heading">
              <h2>Sẵn sàng đi tiếp?</h2>
              <Badge tone={gatesDone === gates.length ? "green" : "amber"}>
                {gatesDone}/{gates.length} điều kiện
              </Badge>
            </div>
            <p className="muted">
              Không phải luật cứng — đây là những thứ đội thường tiếc khi bỏ qua
              trước lúc đẩy một ý tưởng sang giai đoạn sau.
            </p>
            <div className="gate-list">
              {gates.map((gate) => (
                <div
                  className={`gate-row${gate.done ? " gate-done" : ""}`}
                  key={gate.label}
                >
                  {gate.done ? (
                    <CheckCircle size={19} weight="fill" />
                  ) : (
                    <Circle size={19} />
                  )}
                  <div>
                    <strong>{gate.label}</strong>
                    <small>{gate.hint}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div className="detail-grid">
            <section className="surface product-promise">
              <span className="eyebrow">ĐIỀU MÌNH HỨA</span>
              <h2>Lời hứa sản phẩm</h2>
              <p>{product.promise}</p>
            </section>
            <section className="surface">
              <h2>Dành cho ai?</h2>
              <p>{product.audience}</p>
              <h2>Khoảnh khắc</h2>
              <p>{product.moment}</p>
            </section>
          </div>
          <section className="surface">
            <div className="section-heading">
              <h2>Đưa ý tưởng tiến lên</h2>
              <Badge tone="blue">{stageLabels[product.stage]}</Badge>
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
        <>
          <div className="section-heading">
            <div>
              <h2>Căn cứ để đi tiếp</h2>
              <p className="muted small">
                Insight, tài liệu nghiên cứu và output đã được kiểm tra.
              </p>
            </div>
            <Button disabled={!unlocked} onClick={() => setEvidenceOpen(true)}>
              <Plus size={17} />
              Gắn tài liệu
            </Button>
          </div>
          {!details && !loadError && <p role="status">Đang tải chi tiết…</p>}
          {details?.evidence.length === 0 && (
            <Empty
              title="Chưa có bằng chứng được ghi lại"
              description="Thêm ghi chú phỏng vấn, prototype hoặc tài liệu nguồn. Để cả đội cùng tham chiếu."
            />
          )}
          {details && details.evidence.length > 0 && (
            <div className="evidence-list">
              {details.evidence.map((e) => (
                <article className="surface" key={e.id}>
                  <FileText size={25} />
                  <div>
                    <Badge>{e.kind}</Badge>
                    <h3>{e.title}</h3>
                    <p>{e.summary}</p>
                    <small className="muted">Ghi nhận: {e.observed_at}</small>
                    {e.source_url && (
                      <a
                        href={e.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        Mở nguồn <ArrowUpRight size={16} />
                      </a>
                    )}
                  </div>
                  {unlocked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        run(
                          {
                            operation: "evidence_remove",
                            payload: { id: e.id },
                          } as ProductCommand,
                          () => setReload((v) => v + 1),
                        )
                      }
                    >
                      Xóa
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      ) : tab === "work" ? (
        <TaskList tasks={linked} />
      ) : (
        <section className="surface">
          <h2>Vì sao mình đi tiếp?</h2>
          {details?.stageChanges.length === 0 && (
            <Empty
              title="Chưa có thay đổi giai đoạn"
              description="Ghi chú chuyển giai đoạn sẽ xuất hiện ở đây."
            />
          )}
          {details && details.stageChanges.length > 0 && (
            <div className="history-list">
              {details.stageChanges.map((n) => (
                <article key={n.id}>
                  <FileText size={22} />
                  <div>
                    <small>
                      {new Date(n.created_at).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </small>
                    <p>
                      {stageLabels[n.from_stage] ?? n.from_stage} →{" "}
                      {stageLabels[n.to_stage] ?? n.to_stage}: {n.note}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <Modal
        open={edit}
        onClose={() => setEdit(false)}
        title="Chỉnh sửa sản phẩm"
      >
        <ProductForm product={product} onClose={() => setEdit(false)} />
      </Modal>
      <Modal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title="Một bước tiếp theo"
      >
        <form className="form-stack" onSubmit={changeStage}>
          <fieldset disabled={pending} className="live-fieldset">
            <p className="muted">
              Mỗi lần đổi giai đoạn cần một lý do rõ ràng.
              {privilegedStages.includes(stage) && !founder
                ? " Chỉ Founder được chuyển sang giai đoạn này."
                : ""}
            </p>
            <Field label="Giai đoạn tiếp theo">
              <select
                required
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {Object.entries(stageLabels).map(([s, label]) => (
                  <option key={s} value={s} disabled={s === product.stage}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lý do & căn cứ">
              <textarea
                name="note"
                required
                rows={4}
                placeholder="Đội đã kiểm chứng điều gì? Vì sao chọn bước này?"
              />
            </Field>
            {["pilot", "live"].includes(stage) && (
              <label className="inline-check">
                <input type="checkbox" name="readiness_confirmed" required />
                Đã kiểm tra trải nghiệm, người phụ trách support và readiness
                vận hành.
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
            <div className="button-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStageOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                {pending ? "Đang lưu…" : "Chuyển giai đoạn"}
              </Button>
            </div>
          </fieldset>
        </form>
      </Modal>
      <Modal
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        title="Gắn tài liệu & bằng chứng"
      >
        <form className="form-stack" onSubmit={addEvidence}>
          <fieldset disabled={pending} className="live-fieldset">
            <Field label="Tên tài liệu / insight">
              <input name="title" required maxLength={200} />
            </Field>
            <div className="form-grid">
              <Field label="Loại bằng chứng">
                <select name="kind">
                  {evidenceKinds.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ngày ghi nhận">
                <input name="observed_at" required type="date" />
              </Field>
            </div>
            <Field label="Điều đã học được">
              <textarea name="summary" required rows={5} maxLength={5000} />
            </Field>
            <Field label="Link nguồn">
              <input
                type="url"
                name="source_url"
                placeholder="https://…"
                maxLength={2048}
              />
            </Field>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEvidenceOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">{pending ? "Đang lưu…" : "Gắn tài liệu"}</Button>
            </div>
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
