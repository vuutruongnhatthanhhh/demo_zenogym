"use client";

import { useEffect, useState } from "react";
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
import { PRODUCT_CATEGORIES, type Product } from "@/lib/types";

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSaved: (product: Product) => void;
}) {
  const isEdit = !!product;
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [projectPrice, setProjectPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setBrand(product?.brand ?? "");
      setCategory(product?.category ?? PRODUCT_CATEGORIES[0]);
      setDescription(product?.description ?? "");
      setCostPrice(product ? String(product.costPrice) : "");
      setRetailPrice(product ? String(product.retailPrice) : "");
      setProjectPrice(product ? String(product.projectPrice) : "");
      setAvailable(product?.available ?? true);
      setImageFile(null);
    }
  }, [open, product]);

  async function handleSubmit() {
    if (!name.trim() || !retailPrice || !projectPrice) {
      toast.error("Vui lòng nhập đầy đủ tên, giá bán lẻ và giá dự án");
      return;
    }
    if (!isEdit && !imageFile) {
      toast.error("Vui lòng chọn ảnh sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("name", name);
      form.set("brand", brand);
      form.set("category", category);
      form.set("description", description);
      form.set("costPrice", costPrice || "0");
      form.set("retailPrice", retailPrice);
      form.set("projectPrice", projectPrice);
      form.set("available", String(available));
      if (imageFile) form.set("image", imageFile);

      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Có lỗi xảy ra");
      }

      const data = await res.json();
      toast.success(isEdit ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới");
      onSaved(data.product);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu sản phẩm thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="col-span-full space-y-1">
            <Label htmlFor="p-name">Tên sản phẩm *</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-brand">Thương hiệu</Label>
            <Input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-category">Danh mục</Label>
            <select
              id="p-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-cost">Giá vốn (VNĐ)</Label>
            <Input
              id="p-cost"
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-project">Giá dự án (VNĐ) *</Label>
            <Input
              id="p-project"
              type="number"
              value={projectPrice}
              onChange={(e) => setProjectPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-retail">Giá bán lẻ (VNĐ) *</Label>
            <Input
              id="p-retail"
              type="number"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-available">Trạng thái</Label>
            <select
              id="p-available"
              value={available ? "true" : "false"}
              onChange={(e) => setAvailable(e.target.value === "true")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="true">Đang bán</option>
              <option value="false">Ngừng bán</option>
            </select>
          </div>
          <div className="col-span-full space-y-1">
            <Label htmlFor="p-description">Mô tả</Label>
            <Textarea
              id="p-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="col-span-full space-y-1">
            <Label htmlFor="p-image">
              Hình ảnh {isEdit ? "(để trống nếu giữ ảnh cũ)" : "*"}
            </Label>
            <Input
              id="p-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
