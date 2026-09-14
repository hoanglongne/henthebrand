"use client";
import { useState } from "react";
import { Plus, FileText, ArrowUpRight } from "@phosphor-icons/react";
import { useWorkspace, type Evidence } from "../workspace-provider";
import { Button } from "../ui/button";
import { Modal, Field, FormFooter, Badge, Empty } from "../ui/workspace-ui";
import { safeUrl } from "@/lib/preview-data";
export function ProductEvidence({ productId }: { productId: string }) {
  const { evidence, setEvidence, editable, record } = useWorkspace();
  const entries = evidence[productId] ?? [];
  const [selected, setSelected] = useState<Evidence | null | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    if (v("source") && !safeUrl(v("source"))) {
      setError("Nguồn tài liệu cần là đường dẫn http:// hoặc https://.");
      return;
    }
    const item: Evidence = {
      id: selected?.id ?? crypto.randomUUID(),
      title: v("title"),
      summary: v("summary"),
      source: v("source"),
      date: v("date"),
      kind: v("kind"),
    };
    setEvidence((all) => ({
      ...all,
      [productId]: selected
        ? entries.map((e) => (e.id === item.id ? item : e))
        : [item, ...entries],
    }));
    record(`Gắn bằng chứng sản phẩm: ${item.title}`);
    setSelected(undefined);
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Căn cứ để đi tiếp</h2>
          <p className="muted small">
            Insight, tài liệu nghiên cứu và output đã được kiểm tra.
          </p>
        </div>
        <Button
          disabled={!editable}
          onClick={() => {
            setSelected(null);
            setError("");
          }}
        >
          <Plus size={17} />
          Gắn tài liệu
        </Button>
      </div>
      {entries.length ? (
        <div className="evidence-list">
          {entries.map((e) => (
            <article className="surface" key={e.id}>
              <FileText size={25} />
              <div>
                <Badge>{e.kind}</Badge>
                <h3>{e.title}</h3>
                <p>{e.summary}</p>
                <small className="muted">Ghi nhận: {e.date}</small>
                {e.source && (
                  <a
                    href={e.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    Mở nguồn <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={!editable}
                onClick={() => {
                  setSelected(e);
                  setError("");
                }}
              >
                Chỉnh sửa
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Chưa có bằng chứng được ghi lại"
          description="Thêm ghi chú phỏng vấn, prototype hoặc tài liệu nguồn. Để cả đội cùng tham chiếu."
        />
      )}
      <Modal
        open={selected !== undefined}
        onClose={() => setSelected(undefined)}
        title={selected ? "Chỉnh sửa tài liệu" : "Gắn tài liệu & bằng chứng"}
      >
        <form className="form-stack" onSubmit={submit}>
          <Field label="Tên tài liệu / insight">
            <input name="title" required defaultValue={selected?.title} />
          </Field>
          <div className="form-grid">
            <Field label="Loại bằng chứng">
              <select name="kind" defaultValue={selected?.kind}>
                {[
                  "Phỏng vấn",
                  "Prototype",
                  "Usability test",
                  "Tài liệu thiết kế",
                  "Ghi chú vận hành",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Ngày ghi nhận">
              <input
                name="date"
                required
                type="date"
                defaultValue={selected?.date}
              />
            </Field>
          </div>
          <Field label="Điều đã học được">
            <textarea
              name="summary"
              required
              rows={5}
              defaultValue={selected?.summary}
            />
          </Field>
          <Field label="Link nguồn">
            <input
              type="url"
              name="source"
              defaultValue={selected?.source}
              placeholder="https://…"
            />
          </Field>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <FormFooter onClose={() => setSelected(undefined)} />
        </form>
      </Modal>
    </>
  );
}
