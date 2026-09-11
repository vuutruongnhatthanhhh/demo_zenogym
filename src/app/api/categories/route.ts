export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCategory, getAllCategories } from "@/lib/data/categories";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  return NextResponse.json({ categories: await getAllCategories() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Vui lòng nhập tên loại sản phẩm" }, { status: 400 });

  try {
    const category = await createCategory(name);
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Loại sản phẩm này đã tồn tại" }, { status: 400 });
  }
}
