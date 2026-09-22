"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Plus, PackageCheck, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { CartLine } from "./catalog-client";

export function QuoteCartDialog({
  open,
  onOpenChange,
  cartLines,
  defaultName,
  defaultEmail,
  defaultPhone,
  defaultCompany,
  defaultAddress,
  linkCode,
  isLoggedIn,
  onUpdateQuantity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartLines: CartLine[];
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultCompany: string;
  defaultAddress: string;
  linkCode?: string;
  isLoggedIn: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [company, setCompany] = useState(defaultCompany);
  const [address, setAddress] = useState(defaultAddress);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  // Re-sync if the saved profile info changes (e.g. after a successful send).
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setEmail(defaultEmail);
      setPhone(defaultPhone);
      setCompany(defaultCompany);
      setAddress(defaultAddress);
    }
    // Only needs to run when the dialog opens with fresh defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Warn if the customer tries to close/reload the tab mid-submit, since the
  // server is generating a PDF and sending an email at that point.
  useEffect(() => {
    if (!submitting) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [submitting]);

  const totalItems = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  // Closes both dialogs and drops back to the full product table so the
  // customer can pick more items — quantity changes/removals on already
  // selected items happen inline in the "Xem" list instead.
  function handleAddMore() {
    setViewOpen(false);
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (cartLines.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thiết bị");
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên, email, số điện thoại và địa chỉ");
      return;
    }

    setSubmitting(true);
    try {
      const items = cartLines.map((l) => ({
        productId: l.product.id,
        model: l.product.model,
        name: l.product.name,
        image: l.product.image,
        categoryId: l.product.categoryId,
        categoryName: l.product.categoryName,
        factoryId: l.product.factoryId,
        factoryName: l.product.factoryName,
        quantity: l.quantity,
        price: l.product.priceUsd,
      }));

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          companyName: company || undefined,
          address,
          note: note || undefined,
          linkCode,
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Có lỗi xảy ra");
      }

      // Best-effort: keep the account's saved profile in sync with whatever
      // the customer just typed, so next time it's pre-filled correctly.
      if (isLoggedIn) {
        const supabase = createClient();
        await supabase.auth
          .updateUser({
            data: {
              full_name: name.trim(),
              phone: phone.trim(),
              company: company.trim(),
              address: address.trim(),
              contact_email: email.trim(),
            },
          })
          .catch(() => {});
      }

      toast.success("Đã gửi yêu cầu báo giá! ZenoGym sẽ liên hệ với bạn sớm nhất.");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Gửi yêu cầu báo giá</DialogTitle>
        </DialogHeader>

        {submitting ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/90 p-6 text-center backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Đang gửi yêu cầu báo giá...</p>
            <p className="text-sm text-muted-foreground">
              Vui lòng không tắt hoặc rời khỏi trang cho đến khi gửi xong.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-md border bg-accent/40 p-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            <p className="text-sm">
              Báo giá cho <span className="font-semibold">{totalItems}</span> thiết bị đã chọn
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setViewOpen(true)}
            >
              <Eye className="mr-1 h-3.5 w-3.5" /> Xem
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Vui lòng nhập <strong>chính xác</strong> họ tên, số điện thoại và địa chỉ — các thông
            tin này sẽ được điền vào hợp đồng báo giá gửi cho bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="quote-name">Họ tên *</Label>
            <Input id="quote-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quote-phone">Số điện thoại *</Label>
            <Input id="quote-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="col-span-full space-y-1">
            <Label htmlFor="quote-email">Email *</Label>
            <Input
              id="quote-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@congty.com"
            />
          </div>
          <div className="col-span-full space-y-1">
            <Label htmlFor="quote-address">Địa chỉ *</Label>
            <Input
              id="quote-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            />
          </div>
          <div className="col-span-full space-y-1">
            <Label htmlFor="quote-company">Công ty / Phòng gym (không bắt buộc)</Label>
            <Input id="quote-company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="col-span-full space-y-1">
            <Label htmlFor="quote-note">Ghi chú</Label>
            <Textarea
              id="quote-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: cần lắp đặt trước 30/9, số lượng phòng tập..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || cartLines.length === 0}
            className="w-full sm:w-auto"
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sản phẩm đã chọn ({totalItems})</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {cartLines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Chưa có sản phẩm nào.</p>
            ) : (
              cartLines.map((line) => (
                <div
                  key={line.product.id}
                  className="flex items-center gap-3 rounded-md border p-2"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                    <Image src={line.product.image} alt={line.product.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.product.name}</p>
                    <p className="text-xs text-muted-foreground">{line.product.model}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(line.product.id, Math.max(1, Number(e.target.value) || 1))
                    }
                    className="h-8 w-16 shrink-0 text-center"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onUpdateQuantity(line.product.id, 0)}
                    title="Bỏ sản phẩm này"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddMore}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm sản phẩm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
