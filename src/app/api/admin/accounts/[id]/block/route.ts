export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setAdminAccountBlocked } from "@/lib/data/admin-accounts";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: "Không thể khoá chính tài khoản của bạn" }, { status: 400 });
  }
  await setAdminAccountBlocked(id, true);
  return NextResponse.json({ success: true });
}
