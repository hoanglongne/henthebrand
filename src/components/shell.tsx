"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useWorkspace } from "./workspace-provider";
import { Modal, Search } from "./ui/workspace-ui";
import {
  Sun,
  Path,
  SquaresFour,
  Cube,
  Flag,
  PencilLine,
  Package,
  GearSix,
  ArrowUpRight,
  List,
  X,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { signOut } from "@/app/login/actions";
export const navigation = [
  { href: "/", name: "Today", icon: Sun },
  { href: "/timeline", name: "Timeline", icon: Path },
  { href: "/work", name: "Work", icon: SquaresFour },
  { href: "/products", name: "Products", icon: Cube },
  { href: "/campaigns", name: "Campaigns", icon: Flag },
  { href: "/content", name: "Content Studio", icon: PencilLine },
  { href: "/operations", name: "Operations", icon: Package },
];
export function Shell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "preview" | "connected";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data, campaigns } = useWorkspace();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const links = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    links()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = links();
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
  const results = [
    ...navigation.map((n) => ({ label: n.name, href: n.href, kind: "Trang" })),
    ...data.tasks.map((t) => ({
      label: t.title,
      href: `/work/${t.id}`,
      kind: t.code,
    })),
    ...data.products.map((p) => ({
      label: p.name,
      href: `/products/${p.id}`,
      kind: "Sản phẩm",
    })),
    ...campaigns.map((c) => ({
      label: c.name,
      href: `/campaigns/${c.id}`,
      kind: "Campaign",
    })),
  ]
    .filter((r) =>
      r.label.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")),
    )
    .slice(0, 12);
  const current =
    navigation.find((n) =>
      n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
    )?.name ?? "Settings";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Đi tới nội dung
      </a>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="wordmark" onClick={() => setOpen(false)}>
            hẹn<span>®</span>
          </Link>
          <button
            className="mobile-close icon-button"
            aria-label="Đóng điều hướng"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        <p className="brand-caption">MỘT CHÚT GẦN NHAU HƠN.</p>
        <div className="workspace-label">
          <span className="workspace-avatar">H</span>
          <div>
            <strong>HẸN Studio</strong>
            <small>Không gian làm việc</small>
          </div>
        </div>
        <nav aria-label="Điều hướng chính">
          {navigation.map(({ href, name, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                (href === "/" ? pathname === "/" : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
              className="nav-link"
            >
              <Icon size={21} weight="regular" />
              {name}
              {name === "Today" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-note">
            <span>Giữ một điều trong tâm.</span>
            <strong>
              Một sản phẩm.
              <br />
              Một cuộc hẹn thật tốt.
            </strong>
            <Link href="/products">
              Only When We Meet <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link
            href="/settings"
            className="nav-link"
            onClick={() => setOpen(false)}
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <GearSix size={21} />
            Settings
          </Link>
          <div className="profile-row">
            <span className="avatar navy">H</span>
            <div>
              <strong>
                {mode === "preview" ? "Đội HẸN" : "Thành viên HẸN"}
              </strong>
              <small>
                {mode === "preview" ? "Bản xem trước" : "Workspace nội bộ"}
              </small>
            </div>
            {mode === "connected" && (
              <form action={signOut}>
                <button className="text-link" type="submit">
                  Thoát
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="mobile-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
        />
      )}
      <div className="main-column" inert={open}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              aria-label="Mở điều hướng"
              aria-expanded={open}
              className="mobile-menu icon-button"
              onClick={() => setOpen(true)}
            >
              <List size={24} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{current}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="search-shortcut"
            aria-label="Tìm trong workspace"
          >
            <MagnifyingGlass size={17} />
            <span>Tìm trong workspace</span>
            <kbd>⌘ K</kbd>
          </button>
        </header>
        {mode === "preview" && (
          <div className="preview-banner">
            Dữ liệu mẫu · Thử UI{" "}
            <span>Thay đổi chỉ trong phiên, tải lại sẽ reset.</span>
            <Link href="/settings">
              Thiết lập kết nối <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <main id="main" className="page-content">
          {children}
        </main>
      </div>
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Tìm trong workspace"
      >
        <Search
          value={query}
          onChange={setQuery}
          placeholder="Tìm trang, sản phẩm hoặc công việc…"
        />
        <div className="command-results">
          {results.length ? (
            results.map((r) => (
              <Link
                href={r.href}
                key={r.href}
                onClick={() => {
                  setSearchOpen(false);
                  setOpen(false);
                }}
              >
                <span>{r.label}</span>
                <small>{r.kind}</small>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <p className="muted">Không tìm thấy kết quả. Thử từ khóa khác.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
