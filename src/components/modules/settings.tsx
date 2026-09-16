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
  Compass,
  LockSimple,
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
type OnboardingStep = {
  title: string;
  detail: string;
  href?: string;
  linkLabel?: string;
};
type OnboardingPhase = {
  key: "orient" | "first" | "limits";
  label: string;
  icon: typeof Compass;
  steps: OnboardingStep[];
};
const phaseMeta: Record<
  OnboardingPhase["key"],
  { label: string; icon: typeof Compass; tone: string }
> = {
  orient: { label: "Làm quen", icon: Compass, tone: "blue" },
  first: { label: "Việc đầu tiên", icon: Rocket, tone: "coral" },
  limits: { label: "Giới hạn cần nhớ", icon: LockSimple, tone: "amber" },
};
const onboardingJourneys: Record<RoleKey, OnboardingPhase[]> = {
  founder: [
    {
      key: "orient",
      label: phaseMeta.orient.label,
      icon: phaseMeta.orient.icon,
      steps: [
        {
          title: "Đăng nhập và xem toàn cảnh",
          detail:
            "Đăng nhập tại /login bằng email đã được cấp quyền Founder. Trang Today cho bạn cái nhìn nhanh về task quá hạn, campaign đang chạy và hoạt động gần đây.",
          href: "/",
          linkLabel: "Mở Today",
        },
        {
          title: "Rà lại thông tin workspace",
          detail:
            "Vào tab Workspace bên cạnh kiểm tra tên và ngày bắt đầu roadmap. Hai trường này hiện chỉ đọc — nhờ kỹ thuật chỉnh trực tiếp trong database nếu cần đổi.",
        },
      ],
    },
    {
      key: "first",
      label: phaseMeta.first.label,
      icon: phaseMeta.first.icon,
      steps: [
        {
          title: "Đưa một ý tưởng vào Discovery",
          detail:
            "Vào Products, chọn một sản phẩm và bấm “Chuyển giai đoạn” để đưa nó sang Discovery. Lưu ý: chỉ một sản phẩm được ở Discovery/Design cùng lúc.",
          href: "/products",
          linkLabel: "Mở Products",
        },
        {
          title: "Tạo một task đầy đủ điều kiện",
          detail:
            "Vào Work, tạo task đầu tiên: gán owner, approver, hạn hoàn thành và Definition of Done. Thiếu một trong bốn điều này, task sẽ kẹt ở Backlog cho mọi role.",
          href: "/work",
          linkLabel: "Mở Work",
        },
        {
          title: "Mở campaign đầu tiên",
          detail:
            "Khi readiness của một campaign đã tick đủ, vào Campaigns và bấm “Kiểm tra mở bán” để chuyển nó sang Đang chạy.",
          href: "/campaigns",
          linkLabel: "Mở Campaigns",
        },
      ],
    },
    {
      key: "limits",
      label: phaseMeta.limits.label,
      icon: phaseMeta.limits.icon,
      steps: [
        {
          title: "Override luôn cần một lý do",
          detail:
            "Vượt giới hạn 2 việc/người, mở campaign khi readiness chưa đủ, hay chuyển sản phẩm sang Build/Pilot/Live/Learned/Archived — bạn là người duy nhất làm được, nhưng hệ thống luôn bắt ghi lý do và lưu vào nhật ký hoạt động.",
        },
        {
          title: "Thêm thành viên mới cần thao tác thủ công",
          detail:
            "App chưa có nút mời thành viên. Cần cấp tài khoản Supabase Auth rồi thêm thủ công vào bảng admin_memberships — xem chi tiết ở tab Vai trò & quyền.",
        },
      ],
    },
  ],
  ops: [
    {
      key: "orient",
      label: phaseMeta.orient.label,
      icon: phaseMeta.orient.icon,
      steps: [
        {
          title: "Xem việc đang chờ lên kế hoạch",
          detail:
            "Vào Work, lọc theo trạng thái Backlog để thấy những task chưa có owner/hạn hoàn thành cần xử lý trước.",
          href: "/work",
          linkLabel: "Mở Work",
        },
        {
          title: "Rà lại roadmap 24 tuần",
          detail:
            "Vào Timeline xem các mốc hiện có. Bạn có toàn quyền chỉnh mốc ở đây, ngang với Founder.",
          href: "/timeline",
          linkLabel: "Mở Timeline",
        },
      ],
    },
    {
      key: "first",
      label: phaseMeta.first.label,
      icon: phaseMeta.first.icon,
      steps: [
        {
          title: "Thêm một SKU vào tồn kho",
          detail:
            "Vào Operations → tab Tồn kho, bấm “Thêm vật tư” và nhập mã SKU, số lượng thực tế, ngưỡng đặt thêm.",
          href: "/operations",
          linkLabel: "Mở Operations",
        },
        {
          title: "Thêm một đối tác cung ứng",
          detail:
            "Cũng ở Operations, chuyển sang tab Đối tác & mẫu để ghi lại lead time và trạng thái mẫu của nhà cung cấp.",
        },
        {
          title: "Mở một campaign đã sẵn sàng",
          detail:
            "Khi tất cả mục readiness của một campaign đã tick xong, bấm “Kiểm tra mở bán” là mở được ngay — không cần chờ Founder.",
          href: "/campaigns",
          linkLabel: "Mở Campaigns",
        },
      ],
    },
    {
      key: "limits",
      label: phaseMeta.limits.label,
      icon: phaseMeta.limits.icon,
      steps: [
        {
          title: "Không tự override được",
          detail:
            "Vượt giới hạn 2 việc/người, hay mở campaign khi readiness chưa đủ — cả hai đều cần Founder, không có ngoại lệ cho Ops.",
        },
        {
          title: "Không đổi được owner/approver sau khi tạo task",
          detail:
            "Một khi task đã có owner và approver, chỉ Founder mới đổi lại được hai trường này.",
        },
      ],
    },
  ],
  product_designer: [
    {
      key: "orient",
      label: phaseMeta.orient.label,
      icon: phaseMeta.orient.icon,
      steps: [
        {
          title: "Xem sổ ý tưởng hiện có",
          detail:
            "Vào Products để thấy toàn bộ ý tưởng, từ giai đoạn Idea đến Live, cùng số công việc đang gắn với từng sản phẩm.",
          href: "/products",
          linkLabel: "Mở Products",
        },
        {
          title: "Xem việc đang mở của đội",
          detail: "Vào Work để biết ai đang làm gì trước khi nhận việc mới.",
          href: "/work",
          linkLabel: "Mở Work",
        },
      ],
    },
    {
      key: "first",
      label: phaseMeta.first.label,
      icon: phaseMeta.first.icon,
      steps: [
        {
          title: "Ghi lại một ý tưởng mới",
          detail:
            "Bấm “Thêm ý tưởng” trong Products, điền moment, đối tượng và lời hứa sản phẩm.",
        },
        {
          title: "Gắn bằng chứng nghiên cứu",
          detail:
            "Mở một sản phẩm, sang tab “Tài liệu & bằng chứng”, gắn một ghi chú phỏng vấn hoặc kết quả usability test.",
        },
        {
          title: "Đưa sản phẩm đi tiếp",
          detail:
            "Khi đã đủ căn cứ, dùng “Chuyển giai đoạn” để đưa sản phẩm từ Discovery → Design → Ready for build.",
        },
        {
          title: "Tạo task nghiên cứu hoặc thiết kế",
          detail:
            "Vào Work, tạo task và tự nhận làm owner — nhớ điền Definition of Done trước khi chuyển khỏi Backlog.",
          href: "/work",
          linkLabel: "Mở Work",
        },
      ],
    },
    {
      key: "limits",
      label: phaseMeta.limits.label,
      icon: phaseMeta.limits.icon,
      steps: [
        {
          title: "Không vào được các giai đoạn quan trọng",
          detail:
            "Build, Pilot, Live, Learned, Archived — cả năm giai đoạn này chỉ Founder chuyển được, dù bạn đã đủ căn cứ.",
        },
        {
          title: "Timeline, Campaigns, Content, Operations chỉ để xem",
          detail:
            "Bạn thấy toàn bộ dữ liệu ở bốn module này nhưng không có nút tạo/sửa nào hoạt động.",
        },
      ],
    },
  ],
  brand_designer: [
    {
      key: "orient",
      label: phaseMeta.orient.label,
      icon: phaseMeta.orient.icon,
      steps: [
        {
          title: "Xem pipeline nội dung",
          detail:
            "Vào Content Studio để thấy toàn bộ nội dung theo từng giai đoạn, từ Idea đến Published.",
          href: "/content",
          linkLabel: "Mở Content Studio",
        },
        {
          title: "Xem campaign đang chuẩn bị",
          detail:
            "Vào Campaigns để biết campaign nào cần asset hoặc brief từ bạn trước ngày mở bán.",
          href: "/campaigns",
          linkLabel: "Mở Campaigns",
        },
      ],
    },
    {
      key: "first",
      label: phaseMeta.first.label,
      icon: phaseMeta.first.icon,
      steps: [
        {
          title: "Tạo một ý tưởng nội dung",
          detail:
            "Trong Content Studio, bấm “Ý tưởng mới”, điền hook, chọn format và kênh đăng.",
        },
        {
          title: "Hoàn thành phần readiness của bạn",
          detail:
            "Mở một campaign, sang tab readiness và tick các mục thuộc trách nhiệm Brand — ví dụ “Asset cuối đã duyệt”.",
        },
        {
          title: "Cập nhật brief khi cần",
          detail:
            "Trong trang chi tiết campaign, dùng nút “Chỉnh sửa brief” để sửa kênh, hook hoặc lịch trình.",
        },
      ],
    },
    {
      key: "limits",
      label: phaseMeta.limits.label,
      icon: phaseMeta.limits.icon,
      steps: [
        {
          title: "Không mở hoặc kết thúc được campaign",
          detail:
            "Hai nút “Kiểm tra mở bán” và “Kết thúc campaign” chỉ hoạt động với Founder hoặc Ops, kể cả khi readiness đã đủ.",
        },
        {
          title: "Timeline và Operations chỉ để xem",
          detail:
            "Bạn xem được roadmap và tồn kho nhưng không chỉnh sửa được ở hai module này.",
        },
      ],
    },
  ],
  viewer: [
    {
      key: "orient",
      label: phaseMeta.orient.label,
      icon: phaseMeta.orient.icon,
      steps: [
        {
          title: "Bắt đầu từ Today",
          detail:
            "Xem nhanh task quá hạn, campaign đang chạy và hoạt động gần đây của cả đội.",
          href: "/",
          linkLabel: "Mở Today",
        },
        {
          title: "Duyệt qua từng module",
          detail:
            "Work, Products, Timeline, Campaigns, Content Studio, Operations — bạn đọc được toàn bộ dữ liệu thật của workspace.",
        },
      ],
    },
    {
      key: "first",
      label: "Việc bạn có thể làm",
      icon: phaseMeta.first.icon,
      steps: [
        {
          title: "Tìm nhanh bằng ô search",
          detail:
            "Dùng ô “Tìm trong workspace” ở đầu trang (hoặc phím tắt ⌘K) để nhảy thẳng tới một task, sản phẩm hay campaign.",
        },
        {
          title: "Theo dõi một sản phẩm hoặc campaign cụ thể",
          detail:
            "Mở chi tiết để xem lịch sử chuyển giai đoạn, readiness, hoặc bằng chứng nghiên cứu đã gắn.",
        },
      ],
    },
    {
      key: "limits",
      label: phaseMeta.limits.label,
      icon: phaseMeta.limits.icon,
      steps: [
        {
          title: "Không có nút tạo/sửa nào hoạt động",
          detail:
            "Đây là thiết kế đúng, không phải lỗi hiển thị — mọi thao tác ghi đều bị database từ chối cho role Viewer.",
        },
        {
          title: "Cần thay đổi gì, nhờ đúng người",
          detail:
            "Xem tab Vai trò & quyền để biết ai đang giữ quyền cho từng module.",
        },
      ],
    },
  ],
};
function Onboarding() {
  const [role, setRole] = useState<RoleKey>("founder");
  const active = systemRoles.find((r) => r.key === role)!;
  return (
    <>
      <div className="onboarding-intro">
        <p className="eyebrow">HƯỚNG DẪN THEO VAI TRÒ</p>
        <h2>Ngày đầu tiên của bạn ở HẸN</h2>
        <p>
          Chọn đúng vai trò bạn đang giữ để biết việc nên làm trước, và những
          gì role đó chưa làm được — tránh mất thời gian bấm thử.
        </p>
      </div>
      <div className="role-picker">
        {systemRoles.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`role-picker-card${role === r.key ? " active" : ""}`}
            aria-pressed={role === r.key}
            onClick={() => setRole(r.key)}
          >
            <span className="role-picker-icon">
              <r.icon size={20} />
            </span>
            <strong>{r.label}</strong>
            <span>{r.blurb}</span>
          </button>
        ))}
      </div>
      <section className="surface">
        <div className="onboarding-journey-head">
          <span className="role-picker-icon">
            <active.icon size={24} />
          </span>
          <div>
            <h3>Hành trình của {active.label}</h3>
            <p>{active.blurb}</p>
          </div>
        </div>
        {onboardingJourneys[role].map((phase) => (
          <div className="onboarding-phase" key={phase.key}>
            <span className={`onboarding-phase-head tone-${phaseMeta[phase.key].tone}`}>
              <phase.icon size={15} />
              {phase.label}
            </span>
            <div className="onboarding-phase-steps">
              {phase.steps.map((step, i) => (
                <div className="onboarding-step" key={step.title}>
                  <span className="onboarding-step-index">{i + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                    {step.href && (
                      <Link className="onboarding-step-link" href={step.href}>
                        {step.linkLabel}
                        <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <div className="onboarding-footer">
        <ShieldCheck size={18} />
        <p>
          Muốn xem đầy đủ ma trận quyền của cả 5 role cùng lúc? Qua tab “Vai
          trò & quyền” bên trên.
        </p>
      </div>
    </>
  );
}
export function Settings() {
  const { data, setData, editable, record } = useWorkspace();
  const [tab, setTab] = useState("onboarding");
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
          { value: "onboarding", label: "Bắt đầu" },
          { value: "workspace", label: "Workspace" },
          { value: "team", label: "Đội hình", count: data.members.length },
          { value: "permissions", label: "Vai trò & quyền" },
        ]}
      />
      {tab === "onboarding" ? (
        <Onboarding />
      ) : tab === "workspace" ? (
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
            <h2>Chi tiết theo role</h2>
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
