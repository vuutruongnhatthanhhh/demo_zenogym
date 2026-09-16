"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleIcon } from "@/components/icons/google-icon";
import { createClient } from "@/lib/supabase/client";
import { isSafeRedirectPath } from "@/lib/utils";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTo = isSafeRedirectPath(rawRedirect) ? rawRedirect : null;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email,
        password,
        redirect: redirectTo ?? undefined,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Đăng ký thất bại, vui lòng thử lại");
      return;
    }

    // No session yet — the account stays unconfirmed until the customer
    // clicks the link in the email we just sent.
    setAwaitingConfirmation(true);
  }

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) callbackUrl.searchParams.set("redirect", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error("Đăng ký với Google thất bại");
    }
  }

  if (awaitingConfirmation) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <MailCheck className="h-10 w-10 text-primary" />
          <p className="font-medium">Kiểm tra email của bạn</p>
          <p className="text-sm text-muted-foreground">
            ZenoGym đã gửi một email xác nhận tới <strong>{email}</strong>. Bấm vào đường link trong
            email để hoàn tất đăng ký.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleRegister}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Đăng ký với Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          hoặc
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">Họ và tên</Label>
            <Input
              id="reg-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-phone">Số điện thoại</Label>
            <Input
              id="reg-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-address">Địa chỉ</Label>
            <Input
              id="reg-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@congty.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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
          <Button type="submit" className="w-full" disabled={loading || googleLoading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Đăng ký
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link
            href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
            className="font-medium text-primary hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
