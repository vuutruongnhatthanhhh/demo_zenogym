export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/mail/templates";

// Always responds with the same generic message regardless of whether the
// email exists, so this endpoint can't be used to enumerate accounts.
const GENERIC_MESSAGE = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_URL}/reset-password` },
    });

    if (!error && data.properties?.hashed_token) {
      const resetUrl = `${process.env.NEXT_PUBLIC_URL}/reset-password?token_hash=${data.properties.hashed_token}&type=recovery`;
      const name =
        (data.user?.user_metadata?.full_name as string | undefined) || email;
      await sendPasswordResetEmail(email, name, resetUrl);
    }
  } catch (err) {
    console.error("Không gửi được email đặt lại mật khẩu:", err);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
