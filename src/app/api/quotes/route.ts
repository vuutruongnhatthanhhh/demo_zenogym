export const dynamic = "force-dynamic";
// No-op on Vercel Hobby (hard-capped at 10s) but takes effect automatically
// on Pro/Enterprise, where PDF generation + email sending has more room.
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createQuoteRequest, getAllQuotes, isQuoteSubmissionRateLimited } from "@/lib/data/quotes";
import { getQuoteCodeByCode } from "@/lib/data/quote-codes";
import { getMissingRequiredEnv } from "@/lib/env";
import { sendQuoteRequestNotification } from "@/lib/notifications/quote-request-email";
import type { QuoteRequestItem } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const quotes = await getAllQuotes(user.id, user.isSuperAdmin);
  return NextResponse.json({ quotes });
}

// Customers must be logged in to submit a quote request (browsing the
// catalog itself stays public — only this action requires an account).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để gửi yêu cầu báo giá" }, { status: 401 });
  }

  const body = await req.json();
  const { customerName, customerEmail, customerPhone, companyName, address, note, items, linkCode } =
    body as {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      companyName?: string;
      address: string;
      note?: string;
      items: QuoteRequestItem[];
      linkCode?: string;
    };

  if (!customerName || !customerEmail || !customerPhone || !address) {
    return NextResponse.json({ error: "Thiếu thông tin khách hàng" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Chưa chọn thiết bị nào" }, { status: 400 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const rateLimited = await isQuoteSubmissionRateLimited({
    email: customerEmail,
    phone: customerPhone,
    ip: clientIp,
  });
  if (rateLimited) {
    return NextResponse.json(
      { error: "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút" },
      { status: 429 }
    );
  }

  let quoteCode;
  if (linkCode) {
    quoteCode = await getQuoteCodeByCode(linkCode);
    if (!quoteCode) {
      return NextResponse.json({ error: "Link báo giá không hợp lệ" }, { status: 400 });
    }
  }

  const quote = await createQuoteRequest({
    customerName,
    customerEmail: user.email,
    customerPhone,
    companyName,
    address,
    note,
    items,
    linkCode: quoteCode?.code,
    ip: clientIp,
    customerId: user.id,
  });

  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length === 0) {
    try {
      await sendQuoteRequestNotification(quote, quote.requestCount, quoteCode?.createdBy);
    } catch (err) {
      console.error("Không gửi được email thông báo cho admin:", err);
    }
  } else {
    console.warn("Bỏ qua gửi email: thiếu biến môi trường", missingEnv.join(", "));
  }

  return NextResponse.json({ quote });
}
