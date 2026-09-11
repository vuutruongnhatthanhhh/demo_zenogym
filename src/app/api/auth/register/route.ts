export const dynamic = "force-dynamic";

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/mail/templates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Máy chủ chưa cấu hình Supabase" }, { status: 500 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const message = createError?.message.includes("already been registered")
      ? "Email này đã được đăng ký"
      : "Không thể tạo tài khoản, vui lòng thử lại";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = created.user.id;
  const token = randomBytes(32).toString("hex");

  const { error: tokenError } = await admin
    .from("email_verifications")
    .insert({ user_id: userId, token });

  if (tokenError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Không thể tạo tài khoản, vui lòng thử lại" }, { status: 500 });
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_URL}/verify-email?token=${token}`;

  try {
    await sendVerificationEmail(email, fullName, verifyUrl);
  } catch (err) {
    console.error("Không gửi được email xác nhận:", err);
    await admin.auth.admin.deleteUser(userId);
    await admin.from("email_verifications").delete().eq("token", token);
    return NextResponse.json(
      { error: "Không gửi được email xác nhận, vui lòng thử lại sau" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Đăng ký thành công, vui lòng kiểm tra email để xác nhận tài khoản",
  });
}
