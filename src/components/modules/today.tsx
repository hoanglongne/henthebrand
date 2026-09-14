"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Flag,
  CheckCircle,
  ArrowBendDownRight,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useWorkspace } from "../workspace-provider";
import { Modal, Field, FormFooter, Badge } from "../ui/workspace-ui";
import { TaskList } from "@/components/task-list";
import { Button } from "@/components/ui/button";
export function Today() {
  const { data, editable, checkins, setCheckins, record, activity, campaigns } =
    useWorkspace();
  const [checkin, setCheckin] = useState(false);
  const [member, setMember] = useState("");
  function submitCheckin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const form = new FormData(e.currentTarget);
    setCheckins((items) => [
      `${form.get("owner")}: Hôm qua ${form.get("yesterday")}. Hôm nay ${form.get("today")}. Cần hỗ trợ: ${form.get("blocked") || "không có"}.`,
      ...items,
    ]);
    record("Thêm check-in của đội");
    setCheckin(false);
  }

  const focus = data.tasks.filter(
    (t) =>
      ["in_progress", "review", "blocked"].includes(t.status) &&
      (!member || t.owner === member),
  );
  const blocked = data.tasks.filter((t) => t.status === "blocked");
  const review = data.tasks.filter((t) => t.status === "review");
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            TODAY AT HẸN <span className="tiny-line" />{" "}
            {data.mode === "preview" ? "TUẦN ĐẦU TIÊN" : "WORKSPACE"}
          </div>
          <h1>
            Một ngày, gần hơn
            <br />
            một cuộc hẹn<span className="coral">.</span>
          </h1>
          <p className="muted">
            Ít việc hơn. Rõ ưu tiên hơn. Cùng làm cho tới nơi.
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="outline"
            disabled={!editable}
            onClick={() => setCheckin(true)}
          >
            Check-in hôm nay <ArrowUpRight size={18} />
          </Button>
          <Button asChild>
            <Link href="/work">Mở bảng công việc</Link>
          </Button>
        </div>
      </div>
      <section className="mission-panel">
        <div className="mission-copy">
          <span className="section-kicker">
            <Flag size={17} /> ĐÍCH ĐẾN CỦA ĐỘI MÌNH
          </span>
          <h2>
            60 món quà.
            <br />
            60 cuộc hẹn đáng nhớ.
          </h2>
          <p>Đưa Only When We Meet tới paid pilot đầu tiên.</p>
          <Button asChild>
            <Link href="/timeline">
              Xem hành trình <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="mission-ticket">
          <div className="ticket-top">
            <span>
              ONLY WHEN
              <br />
              WE MEET
            </span>
            <ArrowUpRight size={29} />
          </div>
          <div className="ticket-middle">
            <span>01</span>
            <div>
              HIỂU
              <br />
              NGƯỜI MUA
            </div>
          </div>
          <div className="ticket-bottom">
            <span>CHẶNG ĐẦU TIÊN</span>
            <span>TUẦN 1–2</span>
          </div>
        </div>
      </section>
      <div className="dashboard-columns">
        <section className="focus-section">
          <div className="section-heading">
            <h2>Đang cần mình</h2>
            <Link className="text-link" href="/work">
              Tất cả công việc <ArrowRight size={16} />
            </Link>
          </div>
          <div className="focus-toolbar">
            <p className="section-description">
              Những việc đang làm, cần duyệt hoặc cần gỡ.
            </p>
            <select
              aria-label="Việc theo thành viên"
              value={member}
              onChange={(e) => setMember(e.target.value)}
            >
              <option value="">Cả đội</option>
              {data.members.map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <TaskList tasks={focus.slice(0, 5)} compact />
          <div className="attention-strip">
            <ArrowBendDownRight size={20} />
            <span>
              <strong>{blocked.length} việc bị chặn</strong> và{" "}
              <strong>{review.length} việc chờ duyệt.</strong> Gỡ vướng trước
              khi bắt đầu việc mới.
            </span>
          </div>
        </section>
        <aside className="team-panel">
          <div className="section-heading">
            <h2>Nhịp của đội</h2>
            <span className="small muted">WIP ≤ 2</span>
          </div>
          {data.members.map((member, i) => {
            const count = data.tasks.filter(
              (t) => t.owner === member.name && t.status === "in_progress",
            ).length;
            return (
              <div className="team-member" key={member.name}>
                <span className={`avatar avatar-${i}`}>
                  {["F", "O", "P", "B"][i] ?? "H"}
                </span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
                <span className={`wip ${count >= 2 ? "full" : ""}`}>
                  {count}/2
                </span>
              </div>
            );
          })}
          <p className="team-footnote">
            <CheckCircle size={17} /> Mỗi người tập trung tối đa hai việc.
          </p>
        </aside>
      </div>
      <section className="journey-section">
        <div className="section-heading">
          <h2>Những cuộc hẹn phía trước</h2>
          <Link className="text-link" href="/timeline">
            Roadmap 24 tuần <ArrowRight size={16} />
          </Link>
        </div>
        <div className="journey-track">
          {data.milestones.slice(0, 5).map((m, i) => (
            <Link
              href="/timeline"
              className={`journey-stop ${i === 0 ? "current" : ""}`}
              key={m.id}
            >
              <span className="journey-marker">
                {i === 0 ? "↗" : String(i + 1).padStart(2, "0")}
              </span>
              <small>
                Tuần {m.start_week}–{m.end_week}
              </small>
              <strong>{m.name}</strong>
              <p>{m.description}</p>
            </Link>
          ))}
        </div>
      </section>
      <div className="today-lower">
        <section className="surface">
          <div className="section-heading">
            <h2>Nhịp hôm nay</h2>
            <Badge>{checkins.length} check-in</Badge>
          </div>
          {checkins.length ? (
            checkins.slice(0, 4).map((c, i) => (
              <p className="checkin-entry" key={i}>
                {c}
              </p>
            ))
          ) : (
            <>
              <p className="muted">
                Hôm qua đã tiến được gì? Hôm nay sẽ hoàn tất điều gì? Có gì đang
                chặn?
              </p>
              <Button
                variant="outline"
                disabled={!editable}
                onClick={() => setCheckin(true)}
              >
                Viết check-in đầu tiên
              </Button>
            </>
          )}
        </section>
        <section className="surface">
          <h2>Vừa diễn ra trong bản thử</h2>
          {activity.length ? (
            <ul className="activity-list">
              {activity.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <CheckCircle size={16} />
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Các thay đổi bạn thử ở Work, Products và Campaigns sẽ xuất hiện
              tại đây.
            </p>
          )}
          {campaigns[0] && (
            <Link href={`/campaigns/${campaigns[0].id}`} className="text-link">
              {campaigns[0].name}:{" "}
              {campaigns[0].readiness.filter((r) => r.done).length}/
              {campaigns[0].readiness.length} điều kiện launch{" "}
              <ArrowRight size={16} />
            </Link>
          )}
        </section>
      </div>
      <Modal
        open={checkin}
        onClose={() => setCheckin(false)}
        title="Hôm nay, mình làm gì?"
      >
        <form className="form-stack" onSubmit={submitCheckin}>
          <Field label="Thành viên">
            <select name="owner">
              {data.members.map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Hôm qua đã có output gì?">
            <textarea name="yesterday" required rows={2} />
          </Field>
          <Field label="Hôm nay sẽ hoàn tất điều gì?">
            <textarea name="today" required rows={2} />
          </Field>
          <Field label="Có gì đang chặn và cần ai hỗ trợ?">
            <textarea name="blocked" rows={2} />
          </Field>
          <FormFooter
            onClose={() => setCheckin(false)}
            label="Thêm check-in vào bản thử"
          />
        </form>
      </Modal>
      <footer className="page-footer">
        <span>Làm những điều nhỏ, để có những khoảnh khắc lớn.</span>
        <span>HẸN STUDIO</span>
      </footer>
    </>
  );
}
