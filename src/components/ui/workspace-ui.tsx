"use client";
import {
  useEffect,
  useId,
  useRef,
  Children,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { X, MagnifyingGlass, ArrowRight, Tray } from "@phosphor-icons/react";
import { Button } from "./button";
import { useWorkspace } from "../workspace-provider";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading module-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>
          {title}
          <span className="coral">.</span>
        </h1>
        <p className="muted">{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`drawer ${wide ? "drawer-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer-inner">
        <header className="drawer-header">
          <div>
            <span className="small muted">HẸN STUDIO</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Đóng cửa sổ"
            onClick={onClose}
          >
            <X size={23} />
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control = Children.only(children) as ReactElement<{
    id?: string;
    "aria-describedby"?: string;
  }>;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(control, {
        id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="section-tabs" role="group" aria-label="Chọn chế độ xem">
      {items.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Search({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-input">
      <MagnifyingGlass size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Empty({
  title = "Chưa có dữ liệu phù hợp",
  description = "Thử thay đổi bộ lọc hoặc thêm một mục mới.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Tray size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function PreviewHint() {
  const { editable } = useWorkspace();
  return (
    <p className="form-hint">
      {editable
        ? "Bạn đang thử giao diện. Thay đổi chỉ ở phiên hiện tại và mất khi tải lại trang."
        : "Thao tác này chưa được kết nối để lưu vào workspace."}
    </p>
  );
}
export function FormFooter({
  onClose,
  label = "Áp dụng bản thử",
}: {
  onClose: () => void;
  label?: string;
}) {
  const { editable } = useWorkspace();
  return (
    <div className="form-footer">
      <PreviewHint />
      <div className="button-row">
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={!editable}>
          {label}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function ModuleBoundary() {
  const { editable } = useWorkspace();
  return editable ? null : (
    <p className="notice">
      Module này chưa được kết nối nguồn dữ liệu. Không có dữ liệu minh họa trộn
      vào workspace thật.
    </p>
  );
}
