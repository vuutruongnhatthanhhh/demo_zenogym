export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createQuoteCode, getQuoteCodesByAdmin } from "@/lib/data/quote-codes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  return NextResponse.json({ codes: await getQuoteCodesByAdmin(user.id) });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const code = await createQuoteCode(user.id);
  return NextResponse.json({ code });
}
