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
        <h1 className="text-2xl font-bold text-primary">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Đăng ký để xem catalog thiết bị và nhận báo giá từ ZenoGym
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
