"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  ShieldCheck,
  ArrowUpRight,
  PlugsConnected,
} from "@phosphor-icons/react";
import { useWorkspace } from "../workspace-provider";
import {
  PageHeading,
  Tabs,
  Modal,
  Field,
  FormFooter,
  Badge,
  PreviewHint,
} from "../ui/workspace-ui";
import { Button } from "../ui/button";
const roles = [
  "Founder / Dev",
  "Ops",
  "Product Design",
  "Brand / Content",
  "Viewer",
];
export function Settings() {
  const { data, setData, editable, record } = useWorkspace();
  const [tab, setTab] = useState("workspace");
  const [member, setMember] = useState<number | null | undefined>(undefined);
  const [roleSelection, setRoleSelection] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  function openMember(index: number | null) {
    setMember(index);
    setRoleSelection(
      index === null
        ? ["Product Design"]
        : data.members[index].role
            .split(" + ")
            .filter((r) => roles.includes(r)),
    );
    setFormError("");
  }
  function updateWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    setData((d) => ({
      ...d,
      name: String(f.get("name")).trim(),
      startDate: String(f.get("start")),
    }));
    record("Cập nhật thông tin workspace");
  }
  function updateMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const f = new FormData(e.currentTarget);
    if (!roleSelection.length) {
      setFormError("Chọn ít nhất một vai trò.");
      return;
    }
    const name = String(f.get("name")).trim();
    if (data.members.some((m, i) => i !== member && m.name === name)) {
      setFormError("Tên thành viên đã có trong bản thử.");
      return;
    }
    const next = {
      name,
      role: roleSelection.join(" + "),
      capacity: Number(f.get("capacity")),
    };
    const previous =
      member !== null && member !== undefined
        ? data.members[member].name
        : undefined;
    setData((d) => ({
      ...d,
      members:
        member === null
          ? [...d.members, next]
          : d.members.map((m, i) => (i === member ? next : m)),
      tasks: previous
        ? d.tasks.map((t) => (t.owner === previous ? { ...t, owner: name } : t))
        : d.tasks,
    }));
    record(`${member === null ? "Thêm" : "Cập nhật"} thành viên mẫu ${name}`);
    setMember(undefined);
  }
  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN CỦA ĐỘI"
        title="Thiết lập HẸN"
        description="Một đội nhỏ, rõ vai trò và đủ khoảng trống để sáng tạo."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "workspace", label: "Workspace" },
          { value: "team", label: "Đội hình", count: data.members.length },
          { value: "permissions", label: "Vai trò & quyền" },
        ]}
      />
      {tab === "workspace" ? (
        <div className="settings-layout">
          <section className="surface">
            <h2>Thông tin chung</h2>
            <form className="form-stack" onSubmit={updateWorkspace}>
              <Field label="Tên workspace">
                <input
                  name="name"
                  required
                  defaultValue={data.name}
                  disabled={!editable}
                />
              </Field>
              <div className="form-grid">
                <Field label="Ngày bắt đầu roadmap">
                  <input
                    name="start"
                    type="date"
                    required
                    defaultValue={data.startDate}
                    disabled={!editable}
                  />
                </Field>
                <Field label="Múi giờ">
                  <input readOnly value="Asia/Ho_Chi_Minh" />
                </Field>
              </div>
              <p className="form-hint">
                Đổi ngày bắt đầu sẽ dời mốc roadmap theo tuần. Deadline task và
                lịch campaign giữ nguyên để đội rà soát riêng.
              </p>
              <PreviewHint />
              <Button type="submit" disabled={!editable}>
                Áp dụng vào bản thử
              </Button>
            </form>
          </section>
          <aside>
            <section className="surface connection-card">
              <PlugsConnected size={29} />
              <h2>Nguồn dữ liệu</h2>
              <Badge tone={editable ? "amber" : "green"}>
                {editable ? "Dữ liệu mẫu trong phiên" : "Đã kết nối Supabase"}
              </Badge>
              <p>
                {editable
                  ? "Bạn đang xem thử toàn bộ giao diện. Thay đổi không được lưu hoặc gửi ra ngoài; tải lại trang sẽ trở về dữ liệu mẫu."
                  : "Thiết lập workspace và thành viên đang chỉ đọc. Quyền thao tác Công việc được kiểm tra riêng trên máy chủ."}
              </p>
              <Link href="/login" className="text-link">
                Trang đăng nhập <ArrowUpRight size={17} />
              </Link>
            </section>
            <section className="surface">
              <h2>Nguyên tắc của đội</h2>
              <ul className="principle-list">
                <li>1 sản phẩm đang build</li>
                <li>1 sản phẩm đang discovery/design</li>
                <li>1 campaign chính đang chạy</li>
                <li>Tối đa 2 việc đang làm/người</li>
              </ul>
            </section>
          </aside>
        </div>
      ) : tab === "team" ? (
        <>
          <div className="section-heading">
            <div>
              <h2>Cùng làm, rõ vai</h2>
              <p className="muted small">
                Một người có thể giữ nhiều vai trò. Capacity là phần thời gian
                dành cho HẸN.
              </p>
            </div>
            <Button disabled={!editable} onClick={() => openMember(null)}>
              <Plus size={17} />
              Thêm thành viên mẫu
            </Button>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Vai trò</th>
                  <th>Capacity</th>
                  <th>Đang làm</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.members.map((m, i) => (
                  <tr key={m.name}>
                    <td>
                      <div className="person-cell">
                        <span className={`avatar avatar-${i % 4}`}>
                          {m.name.charAt(0)}
                        </span>
                        <strong>{m.name}</strong>
                      </div>
                    </td>
                    <td>{m.role}</td>
                    <td>{m.capacity}%</td>
                    <td>
                      {
                        data.tasks.filter(
                          (t) =>
                            t.owner === m.name && t.status === "in_progress",
                        ).length
                      }
                      /2
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!editable}
                        onClick={() => openMember(i)}
                      >
                        Chỉnh sửa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice">
            Thành viên thêm ở đây chỉ phục vụ xem thử UI. Không tạo tài khoản
            đăng nhập hoặc gửi lời mời email.
          </p>
        </>
      ) : (
        <section className="surface">
          <div className="section-heading">
            <h2>Quyền theo trách nhiệm</h2>
            <ShieldCheck size={25} />
          </div>
          <p className="muted">
            Ma trận quyền dự kiến khi kết nối luồng ghi. Hiện database chỉ cho
            phép thành viên đọc dữ liệu trong workspace của mình.
          </p>
          <div className="table-scroll">
            <table className="data-table permission-table">
              <thead>
                <tr>
                  <th>Thao tác</th>
                  {roles.map((r) => (
                    <th key={r}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Xem dữ liệu workspace", allowed: [1, 1, 1, 1, 1] },
                  { name: "Cập nhật công việc", allowed: [1, 1, 1, 1, 0] },
                  { name: "Chuyển stage quan trọng", allowed: [1, 0, 0, 0, 0] },
                  {
                    name: "Mở campaign đủ readiness",
                    allowed: [1, 1, 0, 0, 0],
                  },
                  { name: "Override launch / WIP", allowed: [1, 0, 0, 0, 0] },
                  { name: "Quản lý thành viên", allowed: [1, 0, 0, 0, 0] },
                ].map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    {row.allowed.map((v, i) => (
                      <td key={i}>
                        {v ? (
                          <ShieldCheck aria-label="Được phép" size={19} />
                        ) : (
                          <span aria-label="Không được phép">Không</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Modal
        open={member !== undefined}
        onClose={() => setMember(undefined)}
        title={member === null ? "Thêm thành viên mẫu" : "Điều chỉnh vai trò"}
      >
        <form className="form-stack" onSubmit={updateMember}>
          <Field label="Tên hiển thị">
            <input
              name="name"
              required
              defaultValue={
                member !== null && member !== undefined
                  ? data.members[member]?.name
                  : ""
              }
            />
          </Field>
          <fieldset className="role-options">
            <legend>Vai trò (chọn nhiều)</legend>
            {roles.map((r) => (
              <label className="inline-check" key={r}>
                <input
                  type="checkbox"
                  checked={roleSelection.includes(r)}
                  onChange={() =>
                    setRoleSelection((items) =>
                      items.includes(r)
                        ? items.filter((v) => v !== r)
                        : [...items, r],
                    )
                  }
                />
                {r}
              </label>
            ))}
          </fieldset>
          <Field label="Capacity (%)">
            <input
              name="capacity"
              type="number"
              min="0"
              max="100"
              step="1"
              required
              defaultValue={
                member !== null && member !== undefined
                  ? data.members[member]?.capacity
                  : 100
              }
            />
          </Field>
          {formError && (
            <p className="error-message" role="alert">
              {formError}
            </p>
          )}
          <FormFooter onClose={() => setMember(undefined)} />
        </form>
      </Modal>
    </>
  );
}
