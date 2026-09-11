export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Thiếu token xác nhận" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: record, error } = await admin
    .from("email_verifications")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !record) {
    return NextResponse.json({ error: "Link xác nhận không hợp lệ" }, { status: 400 });
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await admin.from("email_verifications").delete().eq("token", token);
    return NextResponse.json({ error: "Link xác nhận đã hết hạn" }, { status: 400 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(record.user_id, {
    email_confirm: true,
  });

  if (updateError) {
    return NextResponse.json({ error: "Không thể xác nhận email, vui lòng thử lại" }, { status: 500 });
  }

  await admin.from("email_verifications").delete().eq("token", token);

  return NextResponse.json({ message: "Xác nhận email thành công" });
}
