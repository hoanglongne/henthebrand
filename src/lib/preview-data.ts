export type Readiness = {
  id?: string;
  label: string;
  done: boolean;
  owner: string;
};
export type Campaign = {
  briefDue?: string;
  assetDue?: string;
  postmortemDue?: string;
  cutoff?: string;
  support?: string;
  id: string;
  name: string;
  occasion: string;
  product: string;
  product_id?: string | null;
  status: string;
  channel: string;
  owner: string;
  owner_id?: string | null;
  launch: string;
  end: string;
  budget: number;
  orders: number;
  brief: string;
  stop: string;
  readiness: Readiness[];
  updated_at?: string;
};
export type ContentItem = {
  id: string;
  title: string;
  hook: string;
  format: string;
  channel: string;
  status: string;
  owner: string;
  owner_id?: string | null;
  publish: string;
  campaign: string;
  url: string;
  learning: string;
  updated_at?: string;
};
export type Stock = {
  id: string;
  code: string;
  name: string;
  category: string;
  onHand: number;
  reserved: number;
  buffer: number;
  reorder: number;
  cost: number;
};
export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  lead: number;
  moq: number;
  sample: string;
  note: string;
};
export type Issue = {
  id: string;
  ref: string;
  title: string;
  severity: string;
  owner: string;
  status: string;
  resolution: string;
};
export const campaignStates = [
  "draft",
  "preparing",
  "ready",
  "live",
  "complete",
] as const;
export const campaignLabels: Record<string, string> = {
  draft: "Bản nháp",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng",
  live: "Đang chạy",
  complete: "Đã kết thúc",
};
export const contentStates = [
  "Idea",
  "Script",
  "Design/Edit",
  "Review",
  "Scheduled",
  "Published",
  "Learned",
];
export const stageLabels: Record<string, string> = {
  idea: "Ý tưởng",
  discovery: "Đang tìm hiểu",
  design: "Đang thiết kế",
  ready_for_build: "Sẵn sàng build",
  build: "Đang build",
  pilot: "Pilot",
  live: "Đang bán",
  learned: "Đã lưu bài học",
  archived: "Đã lưu trữ",
};
export const readinessTemplate: Readiness[] = [
  { label: "Product journey đã QA", done: false, owner: "Founder / Dev" },
  { label: "Tracking đã kiểm tra", done: false, owner: "Founder / Dev" },
  { label: "Asset cuối đã duyệt", done: false, owner: "Brand / Content" },
  { label: "Tồn kho đủ target + buffer", done: false, owner: "Ops" },
  { label: "Cutoff giao hàng đã chốt", done: false, owner: "Ops" },
  { label: "Support script & người trực", done: false, owner: "Ops" },
  {
    label: "Ngân sách trần & điều kiện dừng",
    done: false,
    owner: "Founder / Dev",
  },
];
export const demoCampaigns: Campaign[] = [
  {
    id: "pilot-reaction",
    name: "First Reveal",
    occasion: "Pilot kín · 10 cặp",
    product: "Only When We Meet",
    status: "preparing",
    channel: "Community",
    owner: "Brand / Content",
    launch: "2026-11-09",
    end: "2026-11-22",
    budget: 2000000,
    orders: 10,
    brief:
      "Ghi lại cảm xúc của 10 cặp sau khoảnh khắc mở quà. Chỉ dùng reaction khi có consent riêng.",
    stop: "Tạm dừng nếu phát hiện lỗi quyền truy cập hoặc sai cặp.",
    readiness: readinessTemplate.map((r, i) => ({ ...r, done: i === 6 })),
  },
  {
    id: "paid-pilot",
    name: "Những cuộc hẹn đầu tiên",
    occasion: "Paid pilot · 60 đơn",
    product: "Only When We Meet",
    status: "draft",
    channel: "TikTok + Landing",
    owner: "Founder / Dev",
    launch: "2026-11-23",
    end: "2026-12-20",
    budget: 3900000,
    orders: 60,
    brief:
      "Mở bán giới hạn để kiểm tra trải nghiệm và năng lực giao quà. Digital 99.000đ, gift 299.000đ.",
    stop: "Dừng nhận đơn khi đủ 60 đơn hoặc chạm ngân sách trần.",
    readiness: readinessTemplate.map((r) => ({ ...r })),
  },
  {
    id: "tet",
    name: "Tết, mình gặp lại",
    occasion: "Tết gặp lại",
    product: "Only When We Meet",
    status: "draft",
    channel: "Organic",
    owner: "Brand / Content",
    launch: "2027-01-18",
    end: "2027-02-01",
    budget: 0,
    orders: 0,
    brief:
      "Góc kể chuyện về trở về và gặp lại. Target và cutoff sẽ chốt sau paid pilot.",
    stop: "Chưa mở bán nếu chưa xác nhận cutoff với vendor.",
    readiness: readinessTemplate.map((r) => ({ ...r })),
  },
  {
    id: "valentine",
    name: "Hẹn nhau ngày 14",
    occasion: "Valentine waitlist",
    product: "Only When We Meet",
    status: "draft",
    channel: "Instagram",
    owner: "Brand / Content",
    launch: "2027-02-01",
    end: "2027-02-14",
    budget: 0,
    orders: 0,
    brief: "Thu thập quan tâm từ các cặp đôi, chưa cam kết ngày giao.",
    stop: "Chỉ mở waitlist; chưa nhận thanh toán.",
    readiness: readinessTemplate.map((r) => ({ ...r })),
  },
];
export const demoContent: ContentItem[] = [
  {
    id: "c1",
    title: "Có những điều chỉ muốn nói khi gặp nhau",
    hook: "Nếu một lời nhắn chỉ mở được khi hai người ở cạnh nhau?",
    format: "Video ngắn",
    channel: "TikTok",
    status: "Script",
    owner: "Brand / Content",
    publish: "2026-11-10",
    campaign: "pilot-reaction",
    url: "",
    learning: "",
  },
  {
    id: "c2",
    title: "Một chiếc card, giữ một cuộc hẹn",
    hook: "Từ tờ giấy đầu tiên đến món quà của hai người.",
    format: "Behind the scenes",
    channel: "Instagram",
    status: "Design/Edit",
    owner: "Brand / Content",
    publish: "2026-11-12",
    campaign: "pilot-reaction",
    url: "",
    learning: "",
  },
  {
    id: "c3",
    title: "Khoảnh khắc mở quà đầu tiên",
    hook: "Đợi đến lúc gặp nhau, rồi mình cùng mở.",
    format: "Reaction",
    channel: "TikTok",
    status: "Idea",
    owner: "Product Design",
    publish: "2026-11-16",
    campaign: "pilot-reaction",
    url: "",
    learning: "",
  },
  {
    id: "c4",
    title: "Yêu xa, mình giữ điều gì?",
    hook: "Một câu hỏi dành cho những người đang đếm ngày.",
    format: "Carousel",
    channel: "Instagram",
    status: "Review",
    owner: "Brand / Content",
    publish: "2026-11-09",
    campaign: "pilot-reaction",
    url: "",
    learning: "",
  },
  {
    id: "c5",
    title: "60 cuộc hẹn đầu tiên",
    hook: "Một đợt quà nhỏ, dành cho những cuộc hẹn thật.",
    format: "Video ngắn",
    channel: "TikTok",
    status: "Idea",
    owner: "Brand / Content",
    publish: "2026-11-23",
    campaign: "paid-pilot",
    url: "",
    learning: "",
  },
  {
    id: "c6",
    title: "Gửi một lời cho ngày gặp lại",
    hook: "Bạn sẽ viết gì cho người mình sắp gặp?",
    format: "Story",
    channel: "Instagram",
    status: "Scheduled",
    owner: "Brand / Content",
    publish: "2026-11-11",
    campaign: "pilot-reaction",
    url: "",
    learning: "",
  },
];
export const demoStock: Stock[] = [
  {
    id: "s1",
    code: "HEN-QR-01",
    name: "Card QR · Only When We Meet",
    category: "Thành phẩm",
    onHand: 15,
    reserved: 10,
    buffer: 5,
    reorder: 5,
    cost: 12000,
  },
  {
    id: "s2",
    code: "HEN-BOX-01",
    name: "Hộp quà coral",
    category: "Bao bì",
    onHand: 12,
    reserved: 10,
    buffer: 5,
    reorder: 5,
    cost: 28000,
  },
  {
    id: "s3",
    code: "HEN-ENV-01",
    name: "Phong bì kèm lời nhắn",
    category: "Bao bì",
    onHand: 25,
    reserved: 10,
    buffer: 5,
    reorder: 10,
    cost: 4500,
  },
  {
    id: "s4",
    code: "HEN-SEAL-01",
    name: "Tem niêm phong HẸN",
    category: "Phụ kiện",
    onHand: 40,
    reserved: 15,
    buffer: 10,
    reorder: 15,
    cost: 1500,
  },
];
export const demoVendors: Vendor[] = [
  {
    id: "v1",
    name: "Đối tác in card A",
    category: "In ấn",
    contact: "Chưa xác nhận liên hệ",
    lead: 7,
    moq: 50,
    sample: "Đang chờ mẫu",
    note: "Tên minh họa. Cần test scan QR trên giấy và lớp phủ thực tế.",
  },
  {
    id: "v2",
    name: "Xưởng hộp B",
    category: "Packaging",
    contact: "Chưa xác nhận liên hệ",
    lead: 12,
    moq: 100,
    sample: "Cần chỉnh mẫu",
    note: "Tên minh họa. Kiểm tra kích thước lòng hộp và phương án reprint.",
  },
  {
    id: "v3",
    name: "Đối tác giấy C",
    category: "Phụ kiện",
    contact: "Chưa xác nhận liên hệ",
    lead: 5,
    moq: 50,
    sample: "Đã duyệt mẫu",
    note: "Tên minh họa. Xin báo giá trước khi đặt số lượng lớn.",
  },
];
export const demoIssues: Issue[] = [
  {
    id: "i1",
    ref: "DRY-RUN-01",
    title: "Mép hộp bị móp khi vận chuyển thử",
    severity: "Trung bình",
    owner: "Ops",
    status: "Đang xử lý",
    resolution: "Thử thêm lớp chèn và chạy lại bài test giao hàng.",
  },
  {
    id: "i2",
    ref: "DRY-RUN-02",
    title: "QR khó quét dưới ánh sáng yếu",
    severity: "Cao",
    owner: "Founder / Dev",
    status: "Mới ghi nhận",
    resolution: "",
  },
];
export function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
export function shortDate(value: string) {
  if (!value) return "Chưa đặt lịch";
  return `${value.slice(8, 10)}/${value.slice(5, 7)}`;
}
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}
