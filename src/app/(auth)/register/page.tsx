import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/catalog");
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Đăng ký tài khoản</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạo tài khoản để gửi và theo dõi yêu cầu báo giá của bạn
        </p>
      </div>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
