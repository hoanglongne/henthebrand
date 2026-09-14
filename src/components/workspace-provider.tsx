"use client";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Snapshot, Task } from "@/lib/domain/types";
import {
  demoCampaigns,
  demoContent,
  demoStock,
  demoVendors,
  demoIssues,
  type Campaign,
  type ContentItem,
  type Stock,
  type Vendor,
  type Issue,
} from "@/lib/preview-data";
export type TaskExtras = {
  approver: string;
  checklist: { id: string; label: string; done: boolean }[];
  links: { label: string; url: string }[];
  comments: { author: string; body: string }[];
  dependencies: string[];
  blockedReason: string;
};
export type Evidence = {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  kind: string;
};
type Context = {
  evidence: Record<string, Evidence[]>;
  setEvidence: Dispatch<SetStateAction<Record<string, Evidence[]>>>;
  data: Snapshot;
  setData: Dispatch<SetStateAction<Snapshot>>;
  editable: boolean;
  campaigns: Campaign[];
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>;
  content: ContentItem[];
  setContent: Dispatch<SetStateAction<ContentItem[]>>;
  stock: Stock[];
  setStock: Dispatch<SetStateAction<Stock[]>>;
  vendors: Vendor[];
  setVendors: Dispatch<SetStateAction<Vendor[]>>;
  issues: Issue[];
  setIssues: Dispatch<SetStateAction<Issue[]>>;
  extras: Record<string, TaskExtras>;
  setExtras: Dispatch<SetStateAction<Record<string, TaskExtras>>>;
  activity: string[];
  record: (message: string) => void;
  notify: (message: string) => void;
  checkins: string[];
  setCheckins: Dispatch<SetStateAction<string[]>>;
  stageNotes: Record<string, string[]>;
  setStageNotes: Dispatch<SetStateAction<Record<string, string[]>>>;
};
const WorkspaceContext = createContext<Context | null>(null);
export function defaultExtras(task: Task): TaskExtras {
  return {
    approver: "Founder / Dev",
    checklist: [
      {
        id: "acceptance",
        label: "Kết quả đáp ứng Definition of Done",
        done: task.status === "done",
      },
      {
        id: "review",
        label: "Output đã được approver kiểm tra",
        done: task.status === "done",
      },
    ],
    links: [],
    comments: [],
    dependencies: [],
    blockedReason:
      task.status === "blocked"
        ? "Chưa đủ người tham gia; cần hỗ trợ tuyển từ cộng đồng."
        : "",
  };
}
export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: Snapshot;
  children: React.ReactNode;
}) {
  const editable = initial.mode === "preview";
  const [draft, setData] = useState(initial);
  const data = editable ? draft : initial;
  const [campaigns, setCampaigns] = useState(editable ? demoCampaigns : []);
  const [content, setContent] = useState(editable ? demoContent : []);
  const [stock, setStock] = useState(editable ? demoStock : []);
  const [vendors, setVendors] = useState(editable ? demoVendors : []);
  const [issues, setIssues] = useState(editable ? demoIssues : []);
  const [extras, setExtras] = useState<Record<string, TaskExtras>>({});
  const [activity, setActivity] = useState<string[]>([]);
  const [checkins, setCheckins] = useState<string[]>([]);
  const [stageNotes, setStageNotes] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [evidence, setEvidence] = useState<Record<string, Evidence[]>>({});
  function record(message: string) {
    if (!editable) return;
    setActivity((items) => [message, ...items].slice(0, 30));
    setMessage("Đã cập nhật bản thử trong phiên này. Chưa lưu database.");
  }
  return (
    <WorkspaceContext.Provider
      value={{
        data,
        evidence,
        setEvidence,
        setData,
        editable,
        campaigns,
        setCampaigns,
        content,
        setContent,
        stock,
        setStock,
        vendors,
        setVendors,
        issues,
        setIssues,
        extras,
        setExtras,
        activity,
        record,
        notify: setMessage,
        checkins,
        setCheckins,
        stageNotes,
        setStageNotes,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Missing WorkspaceProvider");
  return value;
}
