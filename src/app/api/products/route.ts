export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createProduct, getAvailableProducts, searchProducts } from "@/lib/data/products";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { uploadProductImage } from "@/lib/images";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const params = req.nextUrl.searchParams;
  const scope = params.get("scope");

  if (scope === "all") {
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    const search = params.get("search") ?? undefined;
    const categoryId = params.get("categoryId") ?? undefined;
    const factoryId = params.get("factoryId") ?? undefined;
    const minPrice = params.has("minPrice") ? Number(params.get("minPrice")) : undefined;
    const maxPrice = params.has("maxPrice") ? Number(params.get("maxPrice")) : undefined;
    const page = params.has("page") ? Number(params.get("page")) : undefined;
    const pageSize = params.has("pageSize") ? Number(params.get("pageSize")) : undefined;

    const [result, pricingSettings] = await Promise.all([
      searchProducts({
        search,
        categoryId,
        factoryId,
        minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
        page,
        pageSize,
      }),
      getPricingSettings(),
    ]);
    return NextResponse.json({ ...result, pricingSettings });
  }

  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const search = params.get("search") ?? undefined;
  const categoryId = params.get("categoryId") ?? undefined;
  return NextResponse.json({ products: await getAvailableProducts({ search, categoryId }) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
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

  if (!model || !name || !categoryId || !factoryId || !Number.isFinite(priceUsd) || priceUsd < 0) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ảnh sản phẩm" }, { status: 400 });
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadProductImage(imageFile);
  } catch (err) {
    console.error("Upload ảnh thất bại:", err);
    return NextResponse.json({ error: "Tải ảnh lên thất bại" }, { status: 500 });
  }

  try {
    const product = await createProduct({
      model,
      name,
      imageUrl,
      priceUsd,
      categoryId,
      factoryId,
      description,
      available,
    });
    return NextResponse.json({ product });
  } catch (err) {
    console.error("Tạo sản phẩm thất bại:", err);
    return NextResponse.json({ error: "Tạo sản phẩm thất bại" }, { status: 500 });
  }
}
