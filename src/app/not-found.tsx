import Link from "next/link";
export default function NotFound() {
  return (
    <main className="state-page">
      <h1>Không tìm thấy trang này.</h1>
      <Link href="/" className="button button-primary">
        Về Today
      </Link>
    </main>
  );
}
