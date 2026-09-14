"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, PackageCheck, Loader2 } from "lucide-react";
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
import type { CartLine } from "./catalog-client";

export function QuoteCartDialog({
  open,
  onOpenChange,
  cartLines,
  onClearCart,
  defaultName,
  defaultEmail,
  defaultPhone,
  defaultCompany,
  linkCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartLines: CartLine[];
  onClearCart: () => void;
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultCompany: string;
  linkCode?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [company, setCompany] = useState(defaultCompany);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-sync if the saved profile info changes (e.g. after a successful send).
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setEmail(defaultEmail);
      setPhone(defaultPhone);
      setCompany(defaultCompany);
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

  async function handleSubmit() {
    if (cartLines.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thiết bị");
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên, email và số điện thoại");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          companyName: company || undefined,
          note: note || undefined,
          linkCode,
          items: cartLines.map((l) => ({
            productId: l.product.id,
            model: l.product.model,
            name: l.product.name,
            image: l.product.image,
            categoryId: l.product.categoryId,
            categoryName: l.product.categoryName,
            quantity: l.quantity,
            price: l.product.priceUsd,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Có lỗi xảy ra");
      }

      toast.success("Đã gửi yêu cầu báo giá! ZenoGym sẽ liên hệ với bạn sớm nhất.");
      onClearCart();
      setNote("");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" /> Chỉnh sửa
          </Button>
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
  );
}
