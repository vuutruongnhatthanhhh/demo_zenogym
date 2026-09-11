export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProduct, getAllProducts, getAvailableProducts } from "@/lib/data/products";
import type { ProductCategory } from "@/lib/types";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "all") {
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
    return NextResponse.json({ products: await getAllProducts() });
  }
  if (!session) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }
  return NextResponse.json({ products: await getAvailableProducts() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
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

  if (!name || !category || !Number.isFinite(retailPrice) || !Number.isFinite(projectPrice)) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  let imagePath = "/images/placeholder-equipment.svg";
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

  const product = await createProduct({
    name,
    brand: brand || "ZenoGym",
    category,
    image: imagePath,
    costPrice: Number.isFinite(costPrice) ? costPrice : 0,
    retailPrice,
    projectPrice,
    description,
    available,
  });

  return NextResponse.json({ product });
}
