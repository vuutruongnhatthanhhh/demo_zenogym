"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { CustomerAccount } from "@/lib/data/customer-accounts";

export function CustomersClient({ initialCustomers }: { initialCustomers: CustomerAccount[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<CustomerAccount | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleToggleBlock(customer: CustomerAccount) {
    const label = customer.username || customer.email;
    const action = customer.isBlocked ? "unblock" : "block";
    if (
      !confirm(
        customer.isBlocked
          ? `Mở khoá tài khoản "${label}"?`
          : `Khoá tài khoản "${label}"? Tài khoản này sẽ không đăng nhập được nữa.`
      )
    ) {
      return;
    }
    setTogglingId(customer.id);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isBlocked: !customer.isBlocked } : c))
      );
      toast.success(customer.isBlocked ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setTogglingId(null);
    }
  }

  function openResetDialog(customer: CustomerAccount) {
    setResetTarget(customer);
    setResetPassword("");
    setShowResetPassword(false);
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    if (resetPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/customers/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      toast.success(`Đã đặt lại mật khẩu cho ${resetTarget.username || resetTarget.email}`);
      setResetTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
        <p className="text-sm text-muted-foreground">{customers.length} khách hàng</p>
      </div>

      <div className="space-y-2">
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có khách hàng nào.</p>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{customer.fullName || customer.username || customer.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.username ? `Tên đăng nhập: ${customer.username}` : customer.email || "—"}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                  {customer.address ? (
                    <p className="text-xs text-muted-foreground">{customer.address}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tạo lúc {formatDate(customer.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={customer.isBlocked ? "destructive" : "success"}>
                    {customer.isBlocked ? "Đã khoá" : "Đang hoạt động"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openResetDialog(customer)}>
                    <KeyRound className="mr-1 h-3.5 w-3.5" />
                    Đặt lại mật khẩu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglingId === customer.id}
                    onClick={() => handleToggleBlock(customer)}
                  >
                    {togglingId === customer.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : customer.isBlocked ? (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Ban className="mr-1 h-3.5 w-3.5" />
                    )}
                    {customer.isBlocked ? "Mở khoá" : "Khoá"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Đặt mật khẩu mới cho tài khoản{" "}
              <strong>{resetTarget?.username || resetTarget?.email}</strong>.
            </p>
            <div className="space-y-1">
              <Label htmlFor="cust-reset-password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="cust-reset-password"
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
              Đặt lại mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
