import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(session.user.role === "admin" ? "/admin" : "/catalog");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">ZenoGym</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Đăng nhập để xem catalog thiết bị và gửi yêu cầu báo giá
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 rounded-md border bg-white p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Tài khoản demo</p>
          <p>Admin: vuutruongnhatthanh@gmail.com / 123456</p>
          <p>Khách hàng: nhatthanh28012002@gmail.com / 123456</p>
        </div>
      </div>
    </main>
  );
}
