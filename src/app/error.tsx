"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="state-page">
      <h1>Chưa tải được workspace.</h1>
      <p>
        Kết nối có thể bị gián đoạn. Thử lại hoặc kiểm tra cấu hình Supabase.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </main>
  );
}
