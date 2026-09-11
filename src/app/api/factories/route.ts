export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createFactory, getAllFactories } from "@/lib/data/factories";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  return NextResponse.json({ factories: await getAllFactories() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const country = String(body?.country ?? "").trim();
  if (!name) return NextResponse.json({ error: "Vui lòng nhập tên nhà máy" }, { status: 400 });

  try {
    const factory = await createFactory(name, country);
    return NextResponse.json({ factory });
  } catch {
    return NextResponse.json({ error: "Nhà máy này đã tồn tại" }, { status: 400 });
  }
}
