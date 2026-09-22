export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, normalizeUsername, usernameToAuthEmail } from "@/lib/customer-auth";

// Customer accounts are plain username/password — no email, no confirmation
// step. Supabase Auth still stores an email internally, so we synthesize one
// from the username (see lib/customer-auth.ts) and mark the account
// confirmed immediately.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const address = String(body?.address ?? "").trim();
  const username = normalizeUsername(String(body?.username ?? ""));
  const password = String(body?.password ?? "");

  if (!fullName || !phone || !address || !username) {
    return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin" }, { status: 400 });
  }
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Tên đăng nhập chỉ gồm chữ, số, dấu chấm/gạch dưới, từ 3-32 ký tự" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: usernameToAuthEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, address, username },
  });

  if (error) {
    const message = error.message.toLowerCase();
    return NextResponse.json(
      {
        error: message.includes("already")
          ? "Tên đăng nhập này đã được sử dụng"
          : "Đăng ký thất bại, vui lòng thử lại",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, username });
}
