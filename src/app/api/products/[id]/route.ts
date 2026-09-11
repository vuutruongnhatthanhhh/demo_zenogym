export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteProduct, getProductById, updateProduct } from "@/lib/data/products";
import type { ProductCategory } from "@/lib/types";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getProductById(id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const brand = String(form.get("brand") ?? "").trim();
  const category = String(form.get("category") ?? "") as ProductCategory;
  const description = String(form.get("description") ?? "").trim();
  const costPrice = Number(form.get("costPrice"));
  const retailPrice = Number(form.get("retailPrice"));
  const projectPrice = Number(form.get("projectPrice"));
  const available = String(form.get("available") ?? "true") === "true";
  const imageFile = form.get("image");

  let imagePath = existing.image;
  if (imageFile instanceof File && imageFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return NextResponse.json({ error: "Định dạng ảnh không hỗ trợ" }, { status: 400 });
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Ảnh vượt quá 5MB" }, { status: 400 });
    }
    const ext = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    imagePath = `/uploads/${filename}`;
  }

  const product = await updateProduct(id, {
    name: name || existing.name,
    brand: brand || existing.brand,
    category: category || existing.category,
    description,
    costPrice: Number.isFinite(costPrice) ? costPrice : existing.costPrice,
    retailPrice: Number.isFinite(retailPrice) ? retailPrice : existing.retailPrice,
    projectPrice: Number.isFinite(projectPrice) ? projectPrice : existing.projectPrice,
    available,
    image: imagePath,
  });

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  const ok = await deleteProduct(id);
  if (!ok) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
