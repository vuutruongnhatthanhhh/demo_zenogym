export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteProduct, getProductById, updateProduct } from "@/lib/data/products";
import { deleteProductImage, uploadProductImage } from "@/lib/images";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getProductById(id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }

  const form = await req.formData();
  const model = String(form.get("model") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const priceUsd = Number(form.get("priceUsd"));
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const factoryId = String(form.get("factoryId") ?? "").trim();
  const available = String(form.get("available") ?? "true") === "true";
  const imageFile = form.get("image");

  let imageUrl = existing.image;
  let previousImageUrl: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await uploadProductImage(imageFile);
      previousImageUrl = existing.image;
    } catch (err) {
      console.error("Upload ảnh thất bại:", err);
      return NextResponse.json({ error: "Tải ảnh lên thất bại" }, { status: 500 });
    }
  }

  const product = await updateProduct(id, {
    model: model || existing.model,
    name: name || existing.name,
    imageUrl,
    priceUsd: Number.isFinite(priceUsd) && priceUsd >= 0 ? priceUsd : existing.priceUsd,
    categoryId: categoryId || existing.categoryId,
    factoryId: factoryId || existing.factoryId,
    description,
    available,
  });

  if (previousImageUrl) {
    deleteProductImage(previousImageUrl).catch((err) =>
      console.error("Xoá ảnh cũ thất bại:", err)
    );
  }

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getProductById(id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }
  const ok = await deleteProduct(id);
  if (!ok) {
    return NextResponse.json({ error: "Xoá sản phẩm thất bại" }, { status: 500 });
  }
  deleteProductImage(existing.image).catch((err) => console.error("Xoá ảnh thất bại:", err));
  return NextResponse.json({ success: true });
}
