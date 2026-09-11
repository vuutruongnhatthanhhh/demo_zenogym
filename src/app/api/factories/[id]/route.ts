export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteFactory, updateFactory } from "@/lib/data/factories";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const country = String(body?.country ?? "").trim();
  if (!name) return NextResponse.json({ error: "Vui lòng nhập tên nhà máy" }, { status: 400 });

  try {
    const factory = await updateFactory(id, name, country);
    if (!factory) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json({ factory });
  } catch {
    return NextResponse.json({ error: "Tên nhà máy này đã tồn tại" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  const result = await deleteFactory(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
