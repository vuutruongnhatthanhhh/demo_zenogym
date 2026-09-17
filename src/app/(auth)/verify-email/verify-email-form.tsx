"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { isSafeRedirectPath } from "@/lib/utils";

type Status = "verifying" | "success" | "invalid";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    async function verify() {
      if (!tokenHash || type !== "signup") {
        setStatus("invalid");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
      if (error || !data.session) {
        setStatus("invalid");
        return;
      }

      setStatus("success");
      const rawRedirect = searchParams.get("redirect");
      const redirectTo = isSafeRedirectPath(rawRedirect) ? rawRedirect : null;
      const role = data.user?.app_metadata?.role as string | undefined;
      setTimeout(() => {
        router.push(role === "admin" ? "/admin" : redirectTo || "/catalog");
        router.refresh();
      }, 1500);
    }

    verify();
    // Only needs to run once on mount with the URL's initial query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "verifying") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Đang xác nhận email...
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <XCircle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Link không hợp lệ hoặc đã hết hạn</h2>
          <p className="text-sm text-muted-foreground">
            Vui lòng đăng ký lại hoặc liên hệ hỗ trợ nếu bạn cho rằng đây là lỗi.
          </p>
          <Link href="/register" className="text-sm font-medium text-primary hover:underline">
            Quay lại đăng ký
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <h2 className="text-lg font-semibold">Xác nhận email thành công</h2>
        <p className="text-sm text-muted-foreground">Đang chuyển đến ZenoGym...</p>
      </CardContent>
    </Card>
  );
}
