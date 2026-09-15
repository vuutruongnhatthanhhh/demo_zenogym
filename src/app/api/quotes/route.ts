export const dynamic = "force-dynamic";
// No-op on Vercel Hobby (hard-capped at 10s) but takes effect automatically
// on Pro/Enterprise, where PDF generation + email sending has more room.
export const maxDuration = 60;

import { createElement } from "react";
import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createQuoteRequest, getAllQuotes, isQuoteSubmissionRateLimited } from "@/lib/data/quotes";
import { getQuoteCodeByCode } from "@/lib/data/quote-codes";
import { getMissingRequiredEnv } from "@/lib/env";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";
import { formatDate } from "@/lib/utils";
import { QuoteRequestDocument } from "@/lib/pdf/quote-request-document";
import { toPdfImageSource } from "@/lib/pdf/pdf-image";
import type { QuoteRequest, QuoteRequestItem } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const quotes = await getAllQuotes(user.id, user.isSuperAdmin);
  return NextResponse.json({ quotes });
}

// Public: customers submit a quote request without being logged in.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, customerEmail, customerPhone, companyName, note, items, linkCode } = body as {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName?: string;
    note?: string;
    items: QuoteRequestItem[];
    linkCode?: string;
  };

  if (!customerName || !customerEmail || !customerPhone) {
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
    customerEmail,
    customerPhone,
    companyName,
    note,
    items,
    linkCode: quoteCode?.code,
    ip: clientIp,
  });

  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length === 0) {
    try {
      await sendAdminNotification(quote, quoteCode?.createdBy);
    } catch (err) {
      console.error("Không gửi được email thông báo cho admin:", err);
    }
  } else {
    console.warn("Bỏ qua gửi email: thiếu biến môi trường", missingEnv.join(", "));
  }

  return NextResponse.json({ quote });
}

// When the quote came in through an admin's personal link, notify only that
// admin's own email — not the shared ADMIN_EMAIL inbox other admins watch.
async function resolveNotificationRecipient(ownerAdminId?: string): Promise<string | undefined> {
  if (!ownerAdminId) return process.env.ADMIN_EMAIL;
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(ownerAdminId);
    return data.user?.email ?? process.env.ADMIN_EMAIL;
  } catch (err) {
    console.error("Không lấy được email của admin sở hữu link:", err);
    return process.env.ADMIN_EMAIL;
  }
}

async function sendAdminNotification(quote: QuoteRequest, ownerAdminId?: string) {
  const images = await Promise.all(quote.items.map((item) => toPdfImageSource(item.image)));
  const pdfBuffer = await renderToBuffer(
    createElement(QuoteRequestDocument, { quote, images }) as ReactElement<DocumentProps>
  );

  const adminUrl = `${process.env.NEXT_PUBLIC_URL ?? ""}/admin/quotes/${quote.id}`;
  const totalQuantity = quote.items.reduce((sum, item) => sum + item.quantity, 0);
  const recipient = await resolveNotificationRecipient(ownerAdminId);

  const transporter = getTransporter();
  await transporter.sendMail({
    from: MAIL_FROM,
    to: recipient,
    subject: `🏋️ Yêu cầu báo giá của ${quote.customerName} - ${formatDate(quote.createdAt)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">Yêu cầu báo giá mới - ${quote.code}</h2>
        <p style="color:#64748b;">${formatDate(quote.createdAt)}</p>
        <p><strong>Khách hàng:</strong> ${quote.customerName}</p>
        <p><strong>Điện thoại:</strong> ${quote.customerPhone}</p>
        <p><strong>Email:</strong> ${quote.customerEmail}</p>
        ${quote.companyName ? `<p><strong>Công ty:</strong> ${quote.companyName}</p>` : ""}
        ${quote.note ? `<p><strong>Ghi chú:</strong> ${quote.note}</p>` : ""}
        <p><strong>Số lượng thiết bị yêu cầu:</strong> ${totalQuantity}</p>
        <p>Xem danh sách thiết bị chi tiết trong file PDF đính kèm.</p>
        <p style="margin-top:20px;">
          <a href="${adminUrl}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
            Xem &amp; báo giá cho khách
          </a>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `yeu-cau-bao-gia-${quote.code}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
