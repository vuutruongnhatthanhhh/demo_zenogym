"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { AdminAccount } from "@/lib/data/admin-accounts";

export function AccountsClient({
  initialAccounts,
  currentUserId,
}: {
  initialAccounts: AdminAccount[];
  currentUserId: string;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminAccount | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleCreate() {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên và email");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setAccounts((prev) => [data.account, ...prev]);
      setFullName("");
      setEmail("");
      setPassword("");
      toast.success("Đã tạo tài khoản admin mới");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleBlock(account: AdminAccount) {
    const action = account.isBlocked ? "unblock" : "block";
    if (
      !confirm(
        account.isBlocked
          ? `Mở khoá tài khoản "${account.email}"?`
          : `Khoá tài khoản "${account.email}"? Tài khoản này sẽ không đăng nhập được nữa.`
      )
    ) {
      return;
    }
    setTogglingId(account.id);
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, isBlocked: !account.isBlocked } : a))
      );
      toast.success(account.isBlocked ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setTogglingId(null);
    }
  }

  function openResetDialog(account: AdminAccount) {
    setResetTarget(account);
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
      const res = await fetch(`/api/admin/accounts/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      toast.success(`Đã đặt lại mật khẩu cho ${resetTarget.email}`);
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
        <h1 className="text-2xl font-bold">Quản lý nhân viên</h1>
        <p className="text-sm text-muted-foreground">{accounts.length} tài khoản admin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tạo tài khoản admin mới</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="acc-name">Họ và tên</Label>
            <Input id="acc-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="acc-email">Email</Label>
            <Input
              id="acc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="acc-password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="acc-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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
          <div className="sm:col-span-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tạo tài khoản
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có tài khoản admin nào.</p>
        ) : (
          accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {account.fullName || account.email}
                    {account.id === currentUserId ? (
                      <span className="ml-2 text-xs text-muted-foreground">(bạn)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{account.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tạo lúc {formatDate(account.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={account.isBlocked ? "destructive" : "success"}>
                    {account.isBlocked ? "Đã khoá" : "Đang hoạt động"}
                  </Badge>
                  {account.id !== currentUserId ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openResetDialog(account)}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" />
                        Đặt lại mật khẩu
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={togglingId === account.id}
                        onClick={() => handleToggleBlock(account)}
                      >
                        {togglingId === account.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : account.isBlocked ? (
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <Ban className="mr-1 h-3.5 w-3.5" />
                        )}
                        {account.isBlocked ? "Mở khoá" : "Khoá"}
                      </Button>
                    </>
                  ) : null}
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
              Đặt mật khẩu mới cho tài khoản <strong>{resetTarget?.email}</strong>.
            </p>
            <div className="space-y-1">
              <Label htmlFor="reset-password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="reset-password"
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
