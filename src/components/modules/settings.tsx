"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  ShieldCheck,
  ArrowUpRight,
  PlugsConnected,
  Crown,
  Wrench,
  Cube,
  PenNib,
  Rocket,
  Eye,
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
type AccessLevel = "full" | "limited" | "view";
const accessLabel: Record<AccessLevel, string> = {
  full: "Toàn quyền",
  limited: "Có điều kiện",
  view: "Chỉ xem",
};
const accessTone: Record<AccessLevel, string> = {
  full: "green",
  limited: "amber",
  view: "blue",
};
const systemRoles = [
  {
    key: "founder",
    label: "Founder",
    icon: Crown,
    blurb: "Toàn quyền, có thể override khi cần",
  },
  {
    key: "ops",
    label: "Ops",
    icon: Wrench,
    blurb: "Vận hành: task, campaign, kho, sự cố",
  },
  {
    key: "product_designer",
    label: "Product Designer",
    icon: Cube,
    blurb: "Sản phẩm, bằng chứng, task thiết kế",
  },
  {
    key: "brand_designer",
    label: "Brand Designer",
    icon: PenNib,
    blurb: "Campaign, content, asset",
  },
  {
    key: "viewer",
    label: "Viewer",
    icon: Eye,
    blurb: "Chỉ xem, không sửa được gì",
  },
] as const;
type RoleKey = (typeof systemRoles)[number]["key"];
const accessMatrix: Record<string, Record<RoleKey, AccessLevel>> = {
  Work: {
    founder: "full",
    ops: "limited",
    product_designer: "limited",
    brand_designer: "limited",
    viewer: "view",
  },
  Products: {
    founder: "full",
    ops: "limited",
    product_designer: "limited",
    brand_designer: "limited",
    viewer: "view",
  },
  Timeline: {
    founder: "full",
    ops: "full",
    product_designer: "view",
    brand_designer: "view",
    viewer: "view",
  },
  Campaigns: {
    founder: "full",
    ops: "limited",
    product_designer: "view",
    brand_designer: "limited",
    viewer: "view",
  },
  "Content Studio": {
    founder: "full",
    ops: "full",
    product_designer: "view",
    brand_designer: "full",
    viewer: "view",
  },
  Operations: {
    founder: "full",
    ops: "full",
    product_designer: "view",
    brand_designer: "view",
    viewer: "view",
  },
};
const roleDetails: Record<
  RoleKey,
  { module: string; access: AccessLevel; notes: string[] }[]
> = {
  founder: [
    {
      module: "Work",
      access: "full",
      notes: [
        "Tạo, sửa, phân công owner/approver cho bất kỳ task nào.",
        "Là người duy nhất duyệt Done nếu không phải approver được chỉ định.",
        "Vượt giới hạn 2 việc “Đang làm”/người khi cần, miễn có lý do.",
      ],
    },
    {
      module: "Products",
      access: "full",
      notes: [
        "Là role duy nhất chuyển sản phẩm sang Build, Pilot, Live, Learned, Archived.",
        "Vẫn phải tuân giới hạn 1 sản phẩm Build, 1 sản phẩm Discovery/Design cùng lúc.",
      ],
    },
    {
      module: "Timeline",
      access: "full",
      notes: ["Tạo, sửa, xoá mốc hành trình — ngang quyền với Ops."],
    },
    {
      module: "Campaigns",
      access: "full",
      notes: [
        "Là role duy nhất mở campaign khi readiness chưa đủ (bắt buộc ghi lý do override).",
        "Khi readiness đã đủ, mở/kết thúc campaign như Ops.",
      ],
    },
    {
      module: "Content Studio",
      access: "full",
      notes: ["Ngang quyền với Ops và Brand Designer."],
    },
    {
      module: "Operations",
      access: "full",
      notes: ["Ngang quyền với Ops trong quản lý kho, đối tác, sự cố."],
    },
  ],
  ops: [
    {
      module: "Work",
      access: "limited",
      notes: [
        "Tạo task mới, sửa task mình đang là owner.",
        "Không đổi được owner/approver sau khi task đã tạo.",
        "Không tự vượt giới hạn WIP — chỉ Founder override được.",
      ],
    },
    {
      module: "Products",
      access: "limited",
      notes: [
        "Tạo/sửa sản phẩm, chuyển giai đoạn Idea → Discovery → Design → Ready for build.",
        "Không chuyển được sang Build/Pilot/Live/Learned/Archived.",
      ],
    },
    {
      module: "Timeline",
      access: "full",
      notes: ["Tạo, sửa, xoá mốc hành trình — ngang quyền Founder."],
    },
    {
      module: "Campaigns",
      access: "limited",
      notes: [
        "Tạo/sửa campaign, tick readiness, mở campaign khi readiness đã đủ, kết thúc campaign đang chạy.",
        "Không override được khi readiness chưa đủ.",
      ],
    },
    {
      module: "Content Studio",
      access: "full",
      notes: ["Tạo/sửa mọi nội dung — ngang quyền Founder, Brand Designer."],
    },
    {
      module: "Operations",
      access: "full",
      notes: ["Quản lý tồn kho, đối tác, ghi nhận và đóng sự cố đơn hàng."],
    },
  ],
  product_designer: [
    {
      module: "Work",
      access: "limited",
      notes: [
        "Tạo task, sửa task mình phụ trách, thêm checklist/link/bình luận.",
        "Không đổi owner/approver, không vượt WIP, không duyệt Done trừ khi là approver.",
      ],
    },
    {
      module: "Products",
      access: "limited",
      notes: [
        "Tạo/sửa sản phẩm, gắn bằng chứng nghiên cứu, chuyển giai đoạn tới Ready for build.",
        "Không chuyển được sang Build/Pilot/Live/Learned/Archived.",
      ],
    },
    {
      module: "Timeline",
      access: "view",
      notes: ["Xem roadmap; nút chỉnh mốc bị khoá."],
    },
    {
      module: "Campaigns",
      access: "view",
      notes: ["Xem danh sách và readiness; nút tạo/sửa/mở bị khoá."],
    },
    {
      module: "Content Studio",
      access: "view",
      notes: ["Xem pipeline nội dung; không tạo/sửa được."],
    },
    {
      module: "Operations",
      access: "view",
      notes: ["Xem tồn kho, đối tác, sự cố; không thêm/sửa được."],
    },
  ],
  brand_designer: [
    {
      module: "Work",
      access: "limited",
      notes: [
        "Tạo task, sửa task mình phụ trách, thêm checklist/link/bình luận.",
        "Không đổi owner/approver, không vượt WIP, không duyệt Done trừ khi là approver.",
      ],
    },
    {
      module: "Products",
      access: "limited",
      notes: [
        "Tạo/sửa sản phẩm, gắn bằng chứng, chuyển giai đoạn tới Ready for build.",
        "Không vào được Build/Pilot/Live/Learned/Archived.",
      ],
    },
    {
      module: "Timeline",
      access: "view",
      notes: ["Xem roadmap; không chỉnh được mốc."],
    },
    {
      module: "Campaigns",
      access: "limited",
      notes: [
        "Tạo/sửa brief campaign, tick từng mục readiness.",
        "Không mở (launch) và không kết thúc campaign — chỉ Founder/Ops làm được.",
      ],
    },
    {
      module: "Content Studio",
      access: "full",
      notes: ["Tạo/sửa mọi nội dung, đổi trạng thái, gắn link asset và campaign."],
    },
    {
      module: "Operations",
      access: "view",
      notes: ["Xem tồn kho, đối tác, sự cố; không thêm/sửa được."],
    },
  ],
  viewer: [
    {
      module: "Toàn bộ module",
      access: "view",
      notes: [
        "Mọi nút tạo/sửa/xoá đều bị khoá; gọi thẳng API cũng bị database từ chối.",
        "Không thể được gán làm owner hoặc approver của một task.",
      ],
    },
  ],
};
const onboardingSteps: Record<RoleKey, string[]> = {
  founder: [
    "Đăng nhập tại /login bằng email đã được cấp quyền Founder.",
    "Vào Products, đưa 1 ý tưởng vào Discovery/Design đầu tiên — chỉ được 1 sản phẩm ở Discovery/Design cùng lúc.",
    "Vào Work, tạo task đầu tiên: gán owner, approver, hạn hoàn thành và Definition of Done.",
    "Khi sản phẩm sẵn sàng, dùng “Chuyển giai đoạn” để đưa sang Build — chỉ Founder làm được bước này.",
    "Khi cần mở campaign gấp dù chưa đủ readiness, hoặc vượt giới hạn 2 việc/người, luôn ghi rõ lý do — mọi override đều lưu vào nhật ký hoạt động.",
    "Thêm thành viên mới: hiện chưa có nút trong app, xem mục “Thêm thành viên mới” bên dưới.",
  ],
  ops: [
    "Đăng nhập, vào Work xem các task đang ở Backlog cần lên kế hoạch.",
    "Vào Timeline, rà lại roadmap 24 tuần — bạn có toàn quyền chỉnh mốc, ngang Founder.",
    "Vào Operations, thêm SKU đầu tiên vào Tồn kho và thêm một đối tác cung ứng.",
    "Vào Campaigns: khi một campaign đã tick đủ readiness, bạn bấm “Kiểm tra mở bán” là mở được luôn, không cần chờ Founder.",
    "Vào Content Studio, tạo hoặc lên lịch một nội dung.",
  ],
  product_designer: [
    "Đăng nhập, vào Products xem sổ ý tưởng hiện có.",
    "Bấm “Thêm ý tưởng”, điền moment / đối tượng / lời hứa sản phẩm.",
    "Mở một sản phẩm, vào tab “Tài liệu & bằng chứng”, gắn một ghi chú phỏng vấn hoặc nghiên cứu.",
    "Khi đủ căn cứ, dùng “Chuyển giai đoạn” để đưa sản phẩm tới Discovery → Design → Ready for build.",
    "Vào Work, tạo task nghiên cứu/thiết kế và tự nhận làm owner.",
    "Timeline, Campaigns, Content Studio, Operations bạn chỉ xem được — cần đổi gì, nhờ đúng người theo bảng quyền ở trên.",
  ],
  brand_designer: [
    "Đăng nhập, vào Content Studio, tạo một ý tưởng nội dung đầu tiên (hook, format, kênh đăng).",
    "Vào Campaigns, mở một campaign, sang tab readiness và tick các mục thuộc trách nhiệm của bạn (ví dụ “Asset cuối đã duyệt”).",
    "Cần sửa brief campaign thì dùng nút “Chỉnh sửa brief” ngay trong trang chi tiết.",
    "Muốn mở hoặc kết thúc campaign, nhờ Founder hoặc Ops — hai nút đó khoá với Brand Designer.",
    "Vào Work, tạo hoặc nhận task liên quan tới nội dung và asset.",
  ],
  viewer: [
    "Đăng nhập, vào Today để nắm tình hình chung của workspace.",
    "Xem qua Work, Products, Timeline, Campaigns, Content Studio, Operations — toàn bộ đều chỉ đọc.",
    "Không thấy nút tạo/sửa nào hoạt động là đúng thiết kế, không phải lỗi hiển thị.",
    "Cần thay đổi điều gì, liên hệ người giữ role phù hợp theo ma trận ở trên.",
  ],
};
export function Settings() {
  const { data, setData, editable, record } = useWorkspace();
  const [tab, setTab] = useState("workspace");
  const [permRole, setPermRole] = useState<RoleKey>("founder");
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
        <>
          <section className="surface">
            <div className="section-heading">
              <h2>Quyền theo trách nhiệm</h2>
              <ShieldCheck size={25} />
            </div>
            <p className="muted">
              Quyền dưới đây được thực thi ngay trong database (kiểm tra role
              trước mỗi lần ghi dữ liệu) — không chỉ ẩn nút trên giao diện. Ai
              không đủ quyền sẽ bị chặn kể cả khi gọi thẳng API.
            </p>
            <div className="role-legend">
              {systemRoles.map((r) => (
                <div className="role-legend-item" key={r.key}>
                  <r.icon size={20} />
                  <div>
                    <strong>{r.label}</strong>
                    <span>{r.blurb}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="table-scroll">
              <table className="data-table permission-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    {systemRoles.map((r) => (
                      <th key={r.key}>{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(accessMatrix).map(([module, perRole]) => (
                    <tr key={module}>
                      <td>
                        <strong>{module}</strong>
                      </td>
                      {systemRoles.map((r) => (
                        <td key={r.key}>
                          <Badge tone={accessTone[perRole[r.key]]}>
                            {accessLabel[perRole[r.key]]}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-hint">
              Today và Settings chưa nối luồng ghi cho bất kỳ role nào — kể cả
              Founder. Check-in, hoạt động và chỉnh workspace/thành viên hiện
              chỉ là bản xem trước, mất khi tải lại trang.
            </p>
          </section>
          <section className="surface">
            <h2>Chọn role để xem hướng dẫn</h2>
            <div className="role-switch" aria-label="Chọn role">
              {systemRoles.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={permRole === r.key}
                  onClick={() => setPermRole(r.key)}
                >
                  <r.icon size={16} />
                  {r.label}
                </button>
              ))}
            </div>
          </section>
          <section className="surface">
            <div className="section-heading">
              <h2>
                Lần đầu dùng? Bắt đầu từ đây nếu bạn là{" "}
                {systemRoles.find((r) => r.key === permRole)?.label}
              </h2>
              <Rocket size={22} />
            </div>
            <ol className="onboarding-steps">
              {onboardingSteps[permRole].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section className="surface">
            <h2>Chi tiết quyền theo module</h2>
            <div className="permission-cards">
              {roleDetails[permRole].map((row) => (
                <article className="permission-card" key={row.module}>
                  <div className="permission-card-head">
                    <strong>{row.module}</strong>
                    <Badge tone={accessTone[row.access]}>
                      {accessLabel[row.access]}
                    </Badge>
                  </div>
                  <ul>
                    {row.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
          <section className="surface">
            <h2>Thêm thành viên mới</h2>
            <p className="muted">
              Tab “Đội hình” ở trên hiện chỉ là bản xem trước — thêm ở đó
              không tạo tài khoản thật. Vì đã tắt đăng ký công khai, một
              thành viên mới cần được cấp tài khoản Supabase Auth rồi thêm
              thủ công vào bảng admin_memberships (workspace, user_id, danh
              sách role) — việc này hiện chỉ làm được qua Supabase Dashboard,
              chưa có màn hình riêng trong app.
            </p>
            <p className="muted">
              Ai đăng nhập mà chưa có dòng trong admin_memberships sẽ thấy
              thông báo “Tài khoản chưa được thêm vào workspace HẸN. Liên hệ
              Founder để được cấp quyền” và không vào được workspace.
            </p>
          </section>
        </>
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
