export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerQuoteById, resubmitQuoteRequest } from "@/lib/data/quotes";
import { getQuoteCodeByCode } from "@/lib/data/quote-codes";
import { getMissingRequiredEnv } from "@/lib/env";
import { sendQuoteRequestNotification } from "@/lib/notifications/quote-request-email";
import type { QuoteRequestItem } from "@/lib/types";

// The customer edits the item selection on their own request and resends it
// — only the account that originally submitted the request can do this.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để tiếp tục" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getCustomerQuoteById(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu báo giá" }, { status: 404 });
  }

  const body = await req.json();
  const { items, note } = body as { items: QuoteRequestItem[]; note?: string };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Chưa chọn thiết bị nào" }, { status: 400 });
  }

  const quote = await resubmitQuoteRequest(id, user.id, items, note);
  if (!quote) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu báo giá" }, { status: 404 });
  }

  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length === 0) {
    try {
      const quoteCode = quote.linkCode ? await getQuoteCodeByCode(quote.linkCode) : undefined;
      await sendQuoteRequestNotification(quote, quote.requestCount, quoteCode?.createdBy);
    } catch (err) {
      console.error("Không gửi được email thông báo cho admin:", err);
    }
  } else {
    console.warn("Bỏ qua gửi email: thiếu biến môi trường", missingEnv.join(", "));
  }

  return NextResponse.json({ quote });
}
