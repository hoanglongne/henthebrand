import Link from "next/link";
import { signIn } from "./actions";
import { isConfigured } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = isConfigured();
  return (
    <main className="login-wrap">
      <section className="login-card">
        <Link href="/" className="wordmark">
          hẹn<span>®</span>
        </Link>
        <p className="eyebrow">KHÔNG GIAN CỦA ĐỘI MÌNH</p>
        <h1>
          Hẹn nhau
          <br />
          làm điều hay.
        </h1>
        <p className="muted">
          Đăng nhập để tiếp tục những việc đang cùng nhau xây dựng.
        </p>
        {configured ? (
          <form action={signIn} className="form-stack">
            <label>
              Email
              <input required type="email" name="email" autoComplete="email" />
            </label>
            <label>
              Mật khẩu
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p role="alert" className="error-message">
                {error === "membership"
                  ? "Tài khoản chưa được thêm vào workspace HẸN. Liên hệ Founder để được cấp quyền."
                  : "Không đăng nhập được. Kiểm tra email và mật khẩu rồi thử lại."}
              </p>
            )}
            <Button type="submit">Vào workspace</Button>
          </form>
        ) : (
          <div className="notice">
            Chưa kết nối Supabase. Bạn có thể xem giao diện với dữ liệu mẫu.
            <Button asChild>
              <Link href="/">Mở bản xem trước</Link>
            </Button>
          </div>
        )}
        <p className="small muted">
          Workspace riêng tư · Thành viên được mời bởi Founder
        </p>
      </section>
    </main>
  );
}
