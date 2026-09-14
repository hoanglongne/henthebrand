"use client";
import Link from "next/link";
import { useState } from "react";
import {
  MagnifyingGlass,
  Rows,
  SquaresFour,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { statuses, statusLabels, type Task } from "@/lib/domain/types";
export function TaskList({
  tasks,
  compact = false,
}: {
  tasks: Task[];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [view, setView] = useState("list");
  const [status, setStatus] = useState("");
  const visible = tasks.filter(
    (t) =>
      (!owner || t.owner === owner) &&
      (!status || t.status === status) &&
      `${t.title} ${t.code}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <>
      {!compact && (
        <div className="work-toolbar">
          <label className="search-input">
            <MagnifyingGlass size={19} />
            <input
              aria-label="Tìm công việc"
              placeholder="Tìm theo tên hoặc mã công việc…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Lọc người phụ trách"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">Tất cả thành viên</option>
            {[...new Set(tasks.map((t) => t.owner))].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái công việc"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
          <div className="view-switch">
            <button
              aria-label="Dạng danh sách"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <Rows size={20} />
            </button>
            <button
              aria-label="Dạng bảng"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
            >
              <SquaresFour size={20} />
            </button>
          </div>
        </div>
      )}
      {!visible.length ? (
        <div className="empty-state">
          <h3>Chưa có công việc phù hợp.</h3>
          <p>Thử tên khác hoặc đổi bộ lọc người phụ trách.</p>
        </div>
      ) : view === "board" ? (
        <div className="kanban">
          {statuses.map((s) => (
            <section className="kanban-column" key={s}>
              <h3>
                {statusLabels[s]}{" "}
                <span>{visible.filter((t) => t.status === s).length}</span>
              </h3>
              {visible
                .filter((t) => t.status === s)
                .map((t) => (
                  <Link
                    className="kanban-task"
                    href={`/work/${t.id}`}
                    key={t.id}
                  >
                    <small>
                      {t.code} · {t.priority}
                    </small>
                    <strong>{t.title}</strong>
                    <span>{t.owner}</span>
                  </Link>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="task-list">
          {visible.map((t) => (
            <Link href={`/work/${t.id}`} className="task-row" key={t.id}>
              <span className={`task-check ${t.status}`} aria-hidden="true" />
              <div className="task-title">
                <strong>{t.title}</strong>
                <small>
                  {t.code} <span>·</span> {t.owner}
                </small>
              </div>
              <span className={`status status-${t.status}`}>
                {statusLabels[t.status]}
              </span>
              <time dateTime={t.due_date}>
                {t.due_date
                  ? `${t.due_date.slice(8, 10)}.${t.due_date.slice(5, 7)}`
                  : "Chưa có hạn"}
              </time>
              <ArrowUpRight className="row-arrow" size={18} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
