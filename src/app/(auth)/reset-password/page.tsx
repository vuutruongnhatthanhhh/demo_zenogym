import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
