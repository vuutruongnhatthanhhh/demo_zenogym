export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resetCustomerAccountPassword } from "@/lib/data/customer-accounts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const password = body.password as string | undefined;
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  await resetCustomerAccountPassword(id, password);
  return NextResponse.json({ success: true });
}
