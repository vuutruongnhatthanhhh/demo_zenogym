import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/catalog");
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
