export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createQuoteRequest, getAllQuotes } from "@/lib/data/quotes";
import { getMissingRequiredEnv } from "@/lib/env";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { QuoteRequestItem } from "@/lib/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const quotes = await getAllQuotes();
  return NextResponse.json({ quotes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
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

  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length === 0) {
    try {
      await sendAdminNotification(quote.id, quote.code, {
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        note,
        items,
      });
    } catch (err) {
      console.error("Không gửi được email thông báo cho admin:", err);
    }
  } else {
    console.warn("Bỏ qua gửi email: thiếu biến môi trường", missingEnv.join(", "));
  }

  return NextResponse.json({ quote });
}

async function sendAdminNotification(
  quoteId: string,
  code: string,
  data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName?: string;
    note?: string;
    items: QuoteRequestItem[];
  }
) {
  const transporter = getTransporter();
  const total = data.items.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${item.name}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${formatCurrency(
          item.retailPrice
        )}</td>
      </tr>`
    )
    .join("");

  const adminUrl = `${process.env.NEXT_PUBLIC_URL ?? ""}/admin/quotes/${quoteId}`;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `🏋️ Yêu cầu báo giá mới ${code} từ ${data.customerName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">Yêu cầu báo giá mới - ${code}</h2>
        <p style="color:#64748b;">${formatDate(new Date().toISOString())}</p>
        <p><strong>Khách hàng:</strong> ${data.customerName}</p>
        <p><strong>Email:</strong> ${data.customerEmail}</p>
        <p><strong>Điện thoại:</strong> ${data.customerPhone}</p>
        ${data.companyName ? `<p><strong>Công ty:</strong> ${data.companyName}</p>` : ""}
        ${data.note ? `<p><strong>Ghi chú:</strong> ${data.note}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Sản phẩm</th>
              <th style="padding:8px;border:1px solid #e2e8f0;">SL</th>
              <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Giá bán lẻ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:12px;"><strong>Tạm tính theo giá bán lẻ:</strong> ${formatCurrency(
          total
        )}</p>
        <p style="margin-top:20px;">
          <a href="${adminUrl}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
            Xem &amp; báo giá cho khách
          </a>
        </p>
      </div>
    `,
  });
}
