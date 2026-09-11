"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { ProductFormDialog } from "./product-form-dialog";

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  function handleSaved(product: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx === -1) return [product, ...prev];
      const next = [...prev];
      next[idx] = product;
      return next;
    });
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Xóa sản phẩm "${product.name}"?`)) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Xóa sản phẩm thất bại");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success("Đã xóa sản phẩm");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm</h1>
          <p className="text-sm text-muted-foreground">{products.length} thiết bị trong hệ thống</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Thêm sản phẩm
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="relative aspect-video w-full bg-slate-100">
              <Image src={product.image} alt={product.name} fill className="object-cover" />
              {!product.available ? (
                <Badge variant="secondary" className="absolute left-2 top-2">
                  Ngừng bán
                </Badge>
              ) : null}
            </div>
            <CardContent className="space-y-1.5 p-3">
              <Badge variant="outline" className="text-[10px]">
                {product.category}
              </Badge>
              <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">
                {product.name}
              </p>
              <div className="space-y-0.5 text-xs">
                <p className="text-muted-foreground">
                  Giá vốn: <span className="font-medium text-foreground">{formatCurrency(product.costPrice)}</span>
                </p>
                <p className="text-muted-foreground">
                  Giá dự án: <span className="font-medium text-foreground">{formatCurrency(product.projectPrice)}</span>
                </p>
                <p className="font-semibold text-primary">
                  Giá bán lẻ: {formatCurrency(product.retailPrice)}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(product)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(product)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
