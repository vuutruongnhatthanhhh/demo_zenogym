"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Status = "verifying" | "ready" | "invalid" | "success";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    async function verify() {
      const supabase = createClient();

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        setStatus(error ? "invalid" : "ready");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setStatus(session ? "ready" : "invalid");
    }

    verify();
    // Only needs to run once on mount with the URL's initial query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error("Không thể đặt lại mật khẩu, vui lòng thử lại");
      return;
    }

    await supabase.auth.signOut();
    setStatus("success");
    setTimeout(() => router.push("/login"), 1800);
  }

  if (status === "verifying") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Đang xác thực link đặt lại mật khẩu...
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <h2 className="text-lg font-semibold">Link không hợp lệ hoặc đã hết hạn</h2>
          <p className="text-sm text-muted-foreground">
            Vui lòng yêu cầu gửi lại link đặt lại mật khẩu mới.
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Gửi lại link
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <h2 className="text-lg font-semibold">Đặt lại mật khẩu thành công</h2>
          <p className="text-sm text-muted-foreground">Đang chuyển đến trang đăng nhập...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                minLength={6}
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Đặt lại mật khẩu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
