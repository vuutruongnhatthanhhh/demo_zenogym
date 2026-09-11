import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/catalog");
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Đăng nhập</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Đăng nhập để xem catalog thiết bị và gửi yêu cầu báo giá
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
