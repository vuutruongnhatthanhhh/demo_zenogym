export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createQuoteRequest } from "@/lib/data/quotes";
import { getOrCreateQuoteCodeForAdmin } from "@/lib/data/quote-codes";
import type { QuoteRequestItem } from "@/lib/types";

// Lets an admin build a quote for a customer directly (picking products
// themselves) instead of waiting for the customer to submit a request —
// created with no email yet (the admin can add one later, right when they
// actually send the PDF), tagged with the admin's own personal link code so
// it shows up under "my quotes" the same way a customer-submitted one would.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const customerName = String(body?.customerName ?? "").trim();
  const customerPhone = String(body?.customerPhone ?? "").trim();
  const address = String(body?.address ?? "").trim();
  const items = body?.items as QuoteRequestItem[];

  if (!customerName || !customerPhone || !address) {
    return NextResponse.json({ error: "Thiếu thông tin khách hàng" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Chưa chọn sản phẩm nào" }, { status: 400 });
  }

  const linkCode = user.isSuperAdmin
    ? undefined
    : (await getOrCreateQuoteCodeForAdmin(user.id)).code;

  const quote = await createQuoteRequest({
    customerName,
    customerEmail: "",
    customerPhone,
    address,
    items,
    linkCode,
  });

  return NextResponse.json({ quote });
}
