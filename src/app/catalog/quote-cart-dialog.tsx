"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
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
  onUpdateQuantity,
  onClearCart,
  defaultName,
  defaultEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartLines: CartLine[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  defaultName: string;
  defaultEmail: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          items: cartLines.map((l) => ({
            productId: l.product.id,
            name: l.product.name,
            image: l.product.image,
            category: l.product.category,
            quantity: l.quantity,
            retailPrice: l.product.retailPrice,
            projectPrice: l.product.projectPrice,
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Yêu cầu báo giá ({cartLines.length} thiết bị)</DialogTitle>
        </DialogHeader>

        {cartLines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chưa có thiết bị nào trong yêu cầu. Hãy chọn thiết bị từ catalog.
          </p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {cartLines.map((line) => (
              <div key={line.product.id} className="flex items-center gap-3 rounded-md border p-2">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                  <Image src={line.product.image} alt={line.product.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.product.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(line.product.id, line.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(line.product.id, line.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onUpdateQuantity(line.product.id, 0)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cartLines.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="quote-name">Họ tên *</Label>
                <Input id="quote-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quote-phone">Số điện thoại *</Label>
                <Input id="quote-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quote-email">Email *</Label>
                <Input
                  id="quote-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quote-company">Công ty / Phòng gym (không bắt buộc)</Label>
                <Input
                  id="quote-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
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
          </>
        ) : null}

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
