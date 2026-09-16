import { Suspense } from "react";
import { VerifyEmailForm } from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Xác nhận email</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kích hoạt tài khoản ZenoGym của bạn</p>
      </div>
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
