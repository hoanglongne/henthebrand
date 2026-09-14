export const statuses = [
  "backlog",
  "ready",
  "in_progress",
  "review",
  "blocked",
  "done",
] as const;
export type TaskStatus = (typeof statuses)[number];
export const statusLabels: Record<TaskStatus, string> = {
  backlog: "Chờ lên kế hoạch",
  ready: "Sẵn sàng",
  in_progress: "Đang làm",
  review: "Chờ duyệt",
  blocked: "Đang bị chặn",
  done: "Hoàn tất",
};
export type Task = {
  id: string;
  code: string;
  title: string;
  owner: string;
  product_id?: string | null;
  blocked_reason?: string | null;
  owner_id?: string | null;
  approver_id?: string | null;
  status: TaskStatus;
  priority: string;
  effort: number;
  due_date: string;
  definition_of_done: string;
  workstream: string;
  product: string;
  updated_at?: string;
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  moment: string;
  promise: string;
  stage: string;
  audience: string;
};
export type Milestone = {
  id: string;
  name: string;
  start_week: number;
  end_week: number;
  description: string;
};
export type Snapshot = {
  workspaceId?: string;
  userId?: string;
  workReady?: boolean;
  mode: "preview" | "connected";
  name: string;
  roles: string[];
  tasks: Task[];
  products: Product[];
  milestones: Milestone[];
  startDate: string;
  members: {
    id?: string;
    roles?: string[];
    name: string;
    role: string;
    capacity: number;
  }[];
};
