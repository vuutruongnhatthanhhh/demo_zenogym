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
import type { Category, Factory, Product } from "@/lib/types";

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  factories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  categories: Category[];
  factories: Factory[];
  onSaved: (product: Product) => void;
}) {
  const isEdit = !!product;
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [description, setDescription] = useState("");
  const [available, setAvailable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setModel(product?.model ?? "");
      setName(product?.name ?? "");
      setCategoryId(product?.categoryId ?? categories[0]?.id ?? "");
      setFactoryId(product?.factoryId ?? factories[0]?.id ?? "");
      setPriceUsd(product ? String(product.priceUsd) : "");
      setDescription(product?.description ?? "");
      setAvailable(product?.available ?? true);
      setImageFile(null);
      setImagePreview(product?.image ?? null);
    }
  }, [open, product, categories, factories]);

  // Show a live preview of the newly picked file; revert to the existing
  // product image (if any) when the file is cleared.
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(product?.image ?? null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, product]);

  const missingTaxonomy = categories.length === 0 || factories.length === 0;

  async function handleSubmit() {
    if (!model.trim() || !name.trim() || !priceUsd || !categoryId || !factoryId) {
      toast.error("Vui lòng nhập đầy đủ model, tên, giá, loại sản phẩm và nhà máy");
      return;
    }
    if (!isEdit && !imageFile) {
      toast.error("Vui lòng chọn ảnh sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("model", model);
      form.set("name", name);
      form.set("categoryId", categoryId);
      form.set("factoryId", factoryId);
      form.set("priceUsd", priceUsd);
      form.set("description", description);
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
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
        </DialogHeader>

        {missingTaxonomy ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Vui lòng tạo ít nhất 1 "Loại sản phẩm" và 1 "Nhà máy" trước khi thêm sản phẩm.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="p-model">Model *</Label>
              <Input id="p-model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-price">Giá nhà máy (USD) *</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
              />
            </div>
            <div className="col-span-full space-y-1">
              <Label htmlFor="p-name">Tên sản phẩm *</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-category">Loại sản phẩm *</Label>
              <select
                id="p-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-factory">Nhà máy *</Label>
              <select
                id="p-factory"
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
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
              {imagePreview ? (
                // Plain <img>, not next/image: previewing a freshly picked file
                // uses a blob: object URL, which the Image optimizer can't fetch.
                <div className="h-32 w-32 overflow-hidden rounded-md border bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Xem trước ảnh sản phẩm"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <Input
                id="p-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Ảnh sẽ được tự động chuyển sang định dạng WebP.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || missingTaxonomy}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
