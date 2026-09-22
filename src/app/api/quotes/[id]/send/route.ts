export const dynamic = "force-dynamic";
// No-op on Vercel Hobby (hard-capped at 10s) but takes effect automatically
// on Pro/Enterprise, where PDF generation + email sending has more room.
export const maxDuration = 60;

import { createElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getQuoteById, markQuoteSent, saveQuotePricing } from "@/lib/data/quotes";
import { getMissingRequiredEnv } from "@/lib/env";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";
import { formatDate, formatVND } from "@/lib/utils";
import { QuoteDocument, type QuoteDocumentItem } from "@/lib/pdf/quote-document";
import { toPdfImageSource } from "@/lib/pdf/pdf-image";
import { DEFAULT_SELLER_PARTY, type QuotePartyInfo } from "@/lib/pdf/party-info";
import type { QuoteLineItem } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length > 0) {
    return NextResponse.json(
      { error: `Thiếu cấu hình email: ${missingEnv.join(", ")}` },
      { status: 500 }
    );
  }

  const { id } = await params;
  const existing = await getQuoteById(id, user.id, user.isSuperAdmin);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });

  const body = await req.json();
  const items = body.items as QuoteLineItem[];
  const note = body.note as string | undefined;
  const partyOverrides = body.party as Partial<QuotePartyInfo> | undefined;
  const customerEmailOverride =
    typeof body.customerEmail === "string" ? body.customerEmail.trim() : undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Danh sách sản phẩm không hợp lệ" }, { status: 400 });
  }

  const finalEmail = customerEmailOverride || existing.customerEmail;
  if (!finalEmail) {
    return NextResponse.json({ error: "Vui lòng nhập email khách hàng để gửi báo giá" }, { status: 400 });
  }

  const party: QuotePartyInfo = {
    ...DEFAULT_SELLER_PARTY,
    buyerName: existing.customerName,
    buyerPhone: existing.customerPhone,
    buyerAddress: existing.address ?? "",
    ...partyOverrides,
  };

  const saved = await saveQuotePricing(id, items, note, party, customerEmailOverride || undefined);
  if (!saved) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });

  const pdfItems: QuoteDocumentItem[] = await Promise.all(
    items.map(async (item) => ({ ...item, image: (await toPdfImageSource(item.image)) ?? item.image }))
  );
  const pdfBuffer = await renderToBuffer(
    createElement(QuoteDocument, { quote: saved, items: pdfItems, party }) as ReactElement<DocumentProps>
  );

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const transporter = getTransporter();

  const sendNumber = existing.sentCount + 1;
  const sentAtLabel = formatDate(new Date().toISOString());

  await transporter.sendMail({
    from: MAIL_FROM,
    to: saved.customerEmail,
    subject: `📄 Báo giá thiết bị gym ${saved.code} từ ZenoGym (Lần ${sendNumber})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">Cảm ơn ${saved.customerName} đã quan tâm ZenoGym!</h2>
        <p>Đính kèm là bản báo giá chi tiết <strong>${saved.code}</strong> cho các thiết bị bạn đã yêu cầu.</p>
        <p><strong>Tổng cộng:</strong> ${formatVND(total)}</p>
        ${note ? `<p><strong>Ghi chú từ ZenoGym:</strong> ${note}</p>` : ""}
        <p style="color:#64748b;">Báo giá này được gửi lần ${sendNumber} lúc ${sentAtLabel}.</p>
        <p>Vui lòng phản hồi email này nếu bạn cần điều chỉnh hoặc có bất kỳ câu hỏi nào.</p>
        <p style="margin-top:24px;color:#64748b;">Trân trọng,<br/>Đội ngũ ZenoGym</p>
      </div>
    `,
    attachments: [
      {
        filename: `bao-gia-${saved.code}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  const finalQuote = await markQuoteSent(id);
  return NextResponse.json({ quote: finalQuote });
}
