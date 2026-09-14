import type { Snapshot, Task } from "./domain/types";
import { dayOffset } from "./domain/rules";
export const previewStart = "2026-09-15";
const productNames = [
  "Only When We Meet",
  "Reunion Box",
  "One Photo Only",
  "Relationship Achievements",
  "Our Lore",
  "The Last Night",
  "Friendship Side Quest",
  "Our Map",
  "Unsent Letter",
  "Future Us",
];
const moments = [
  "Một cuộc hẹn, một điều chỉ hai người biết.",
  "Một món quà cho ngày gặp lại.",
  "Giữ lại đúng một khoảnh khắc.",
  "Những cột mốc của hai người.",
  "Câu chuyện chỉ chúng mình hiểu.",
  "Lời muốn nói trước lúc chia xa.",
  "Một nhiệm vụ nhỏ, một tình bạn lớn.",
  "Những nơi mình đã đi cùng nhau.",
  "Gửi điều còn chưa nói.",
  "Một lời nhắn cho chúng mình mai sau.",
];
const titles = [
  "Chốt chân dung cặp đôi đầu tiên",
  "Viết giả thuyết người mua & khoảnh khắc",
  "Tuyển 10 người phỏng vấn",
  "Phân vai và capacity của đội",
  "Dựng nền HẸN Admin",
  "Lập ngân sách trần cho pilot",
  "Soạn kịch bản phỏng vấn",
  "Phỏng vấn 10 người yêu xa",
  "Test ba mức giá 99k / 199k / 299k",
  "Tổng hợp insight và lý do không mua",
  "Chốt lời hứa Only When We Meet",
  "Vẽ flow từ tạo cặp đến reveal",
  "Làm prototype mobile",
  "Test prototype với 7 người",
  "Làm mẫu card QR bằng giấy",
  "Chốt bộ nhận diện tối thiểu",
  "Thiết kế hai hướng packaging",
  "Lấy báo giá từ 3 vendor",
  "Tính chi phí digital và gift",
  "Review scope trước khi build",
];
const owners = [
  "Product Design",
  "Founder / Dev",
  "Brand / Content",
  "Founder / Dev",
  "Founder / Dev",
  "Ops",
  "Product Design",
  "Product Design",
  "Founder / Dev",
  "Product Design",
  "Founder / Dev",
  "Product Design",
  "Product Design",
  "Product Design",
  "Ops",
  "Brand / Content",
  "Brand / Content",
  "Ops",
  "Ops",
  "Founder / Dev",
];
export const preview: Snapshot = {
  mode: "preview",
  name: "HẸN",
  roles: [],
  startDate: previewStart,
  campaigns: [],
  members: [
    { name: "Founder / Dev", role: "Sản phẩm & kỹ thuật", capacity: 100 },
    { name: "Ops", role: "Vận hành & đối tác", capacity: 100 },
    { name: "Product Design", role: "Trải nghiệm sản phẩm", capacity: 100 },
    { name: "Brand / Content", role: "Thương hiệu & nội dung", capacity: 100 },
  ],
  products: productNames.map((name, i) => ({
    id: `product-${i}`,
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    moment: moments[i],
    promise:
      i === 0
        ? "Kỷ niệm chỉ mở khi chúng mình gặp nhau."
        : "Chưa chốt promise; cần tìm hiểu người mua.",
    stage: i === 0 ? "discovery" : "idea",
    audience:
      i === 0 ? "Cặp đôi yêu xa, chuẩn bị gặp lại" : "Chưa chọn phân khúc",
  })),
  tasks: titles.map((title, i): Task => ({
    id: `task-${i + 1}`,
    code: `HEN-${String(i + 1).padStart(3, "0")}`,
    title,
    owner: owners[i],
    status:
      i === 0 || i === 4
        ? "in_progress"
        : i === 1
          ? "review"
          : i === 2
            ? "blocked"
            : i < 7
              ? "ready"
              : "backlog",
    priority: i < 6 ? "P0" : i < 14 ? "P1" : "P2",
    effort: [3, 2, 3, 1, 5, 2, 2, 5, 3, 3, 2, 3, 5, 3, 2, 3, 5, 3, 2, 2][i],
    due_date: dayOffset(
      previewStart,
      i < 7 ? (i % 5) + 1 : i < 11 ? 11 : i < 15 ? 18 : 25,
    ),
    definition_of_done: `Có tài liệu/output cho “${title.toLowerCase()}”, được người phụ trách duyệt và gắn link vào task.`,
    workstream:
      owners[i] === "Ops"
        ? "Operations"
        : owners[i] === "Brand / Content"
          ? "Brand"
          : owners[i] === "Product Design"
            ? "Product"
            : "Dev",
    product: "Only When We Meet",
  })),
  milestones: [
    {
      id: "m1",
      name: "Hiểu người mua",
      start_week: 1,
      end_week: 2,
      description: "10 cuộc phỏng vấn, một lời hứa rõ ràng.",
    },
    {
      id: "m2",
      name: "Prototype Day",
      start_week: 3,
      end_week: 4,
      description: "Test trải nghiệm và mẫu quà đầu tiên.",
    },
    {
      id: "m3",
      name: "Sẵn sàng gặp nhau",
      start_week: 5,
      end_week: 8,
      description: "Build MVP và hoàn tất 10 dry run.",
    },
    {
      id: "m4",
      name: "First Reveal",
      start_week: 9,
      end_week: 10,
      description: "10 cặp, những khoảnh khắc đầu tiên.",
    },
    {
      id: "m5",
      name: "Paid Pilot",
      start_week: 11,
      end_week: 14,
      description: "60 đơn đầu tiên, học từ vận hành thực tế.",
    },
    {
      id: "m6",
      name: "Ổn định nền",
      start_week: 15,
      end_week: 18,
      description: "Cải thiện vận hành và tìm hiểu sản phẩm tiếp theo.",
    },
    {
      id: "m7",
      name: "Cuộc hẹn tiếp theo",
      start_week: 19,
      end_week: 23,
      description: "Thiết kế và pilot sản phẩm thứ hai.",
    },
    {
      id: "m8",
      name: "Nhìn lại sáu tháng",
      start_week: 24,
      end_week: 24,
      description: "Chọn một mục tiêu cho quý tiếp theo.",
    },
  ],
};
