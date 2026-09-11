"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Status = "verifying" | "success" | "error";

export function VerifyEmailStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Thiếu token xác nhận");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xác nhận thất bại");
        setStatus("success");
        setTimeout(() => router.push("/login"), 2500);
      })
      .catch((err: Error) => {
        setStatus("error");
        setMessage(err.message);
      });
    // Only needs to run once on mount with the URL's initial query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "verifying") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Đang xác nhận email của bạn...
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Xác nhận email thành công</h2>
          <p className="text-sm text-muted-foreground">Đang chuyển đến trang đăng nhập...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Xác nhận thất bại</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </CardContent>
    </Card>
  );
}
