export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/mail/templates";
import { isSafeRedirectPath } from "@/lib/utils";

// Creates the account via the admin API (unconfirmed) and sends our own
// branded confirmation email instead of Supabase's built-in one — the same
// "generateLink + custom email" pattern already used for password resets.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const address = String(body?.address ?? "").trim();
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  const rawRedirect = typeof body?.redirect === "string" ? body.redirect : null;
  const redirect = isSafeRedirectPath(rawRedirect) ? rawRedirect : null;

  if (!fullName || !phone || !address || !email) {
    return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { full_name: fullName, phone, address },
      redirectTo: `${process.env.NEXT_PUBLIC_URL}/verify-email`,
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    return NextResponse.json(
      { error: message.includes("already") ? "Email này đã được đăng ký" : "Đăng ký thất bại, vui lòng thử lại" },
      { status: 400 }
    );
  }

  const hashedToken = data.properties?.hashed_token;
  if (hashedToken) {
    let verifyUrl = `${process.env.NEXT_PUBLIC_URL}/verify-email?token_hash=${hashedToken}&type=signup`;
    if (redirect) verifyUrl += `&redirect=${encodeURIComponent(redirect)}`;
    try {
      await sendVerificationEmail(email, fullName, verifyUrl);
    } catch (err) {
      console.error("Không gửi được email xác nhận:", err);
    }
  }

  return NextResponse.json({ success: true });
}
