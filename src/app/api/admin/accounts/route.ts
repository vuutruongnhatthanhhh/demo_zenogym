export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminAccount, listAdminAccounts } from "@/lib/data/admin-accounts";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  return NextResponse.json({ accounts: await listAdminAccounts() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");

  if (!fullName || !email) {
    return NextResponse.json({ error: "Vui lòng điền đầy đủ họ tên và email" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  try {
    const account = await createAdminAccount({ fullName, email, password });
    return NextResponse.json({ account });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("already been registered")
        ? "Email này đã được đăng ký"
        : "Tạo tài khoản thất bại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
