export const dynamic = "force-dynamic";

import { createElement } from "react";
import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createQuoteRequest, getAllQuotes } from "@/lib/data/quotes";
import { getMissingRequiredEnv } from "@/lib/env";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";
import { formatDate } from "@/lib/utils";
import { QuoteRequestDocument } from "@/lib/pdf/quote-request-document";
import type { QuoteRequest, QuoteRequestItem } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const quotes = await getAllQuotes();
  return NextResponse.json({ quotes });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const body = await req.json();
  const { customerName, customerEmail, customerPhone, companyName, note, items } = body as {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName?: string;
    note?: string;
    items: QuoteRequestItem[];
  };

  if (!customerName || !customerEmail || !customerPhone) {
    return NextResponse.json({ error: "Thiếu thông tin khách hàng" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Chưa chọn thiết bị nào" }, { status: 400 });
  }

  const quote = await createQuoteRequest({
    customerName,
    customerEmail,
    customerPhone,
    companyName,
    note,
    items,
  });

  // Remember these contact details on the customer's account so the quote
  // form comes pre-filled next time. Best-effort: never blocks the request.
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin.auth.admin.getUserById(user.id);
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(existing.user?.user_metadata ?? {}),
        full_name: customerName,
        phone: customerPhone,
        company: companyName ?? "",
      },
    });
  } catch (err) {
    console.error("Không lưu được thông tin khách hàng vào hồ sơ:", err);
  }

  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length === 0) {
    try {
      await sendAdminNotification(quote);
    } catch (err) {
      console.error("Không gửi được email thông báo cho admin:", err);
    }
  } else {
    console.warn("Bỏ qua gửi email: thiếu biến môi trường", missingEnv.join(", "));
  }

  return NextResponse.json({ quote });
}

async function sendAdminNotification(quote: QuoteRequest) {
  const pdfBuffer = await renderToBuffer(
    createElement(QuoteRequestDocument, { quote }) as ReactElement<DocumentProps>
  );

  const adminUrl = `${process.env.NEXT_PUBLIC_URL ?? ""}/admin/quotes/${quote.id}`;
  const totalQuantity = quote.items.reduce((sum, item) => sum + item.quantity, 0);

  const transporter = getTransporter();
  await transporter.sendMail({
    from: MAIL_FROM,
    to: process.env.ADMIN_EMAIL,
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
