export const dynamic = "force-dynamic";

import { createElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { getCurrentUser } from "@/lib/auth";
import { markQuoteSent, saveQuotePricing } from "@/lib/data/quotes";
import { getMissingRequiredEnv } from "@/lib/env";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";
import { formatVND } from "@/lib/utils";
import { QuoteDocument } from "@/lib/pdf/quote-document";
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
  const body = await req.json();
  const items = body.items as QuoteLineItem[];
  const note = body.note as string | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Danh sách sản phẩm không hợp lệ" }, { status: 400 });
  }

  const saved = await saveQuotePricing(id, items, note);
  if (!saved) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });

  const pdfBuffer = await renderToBuffer(
    createElement(QuoteDocument, { quote: saved, items }) as ReactElement<DocumentProps>
  );

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: MAIL_FROM,
    to: saved.customerEmail,
    subject: `📄 Báo giá thiết bị gym ${saved.code} từ ZenoGym`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">Cảm ơn ${saved.customerName} đã quan tâm ZenoGym!</h2>
        <p>Đính kèm là bản báo giá chi tiết <strong>${saved.code}</strong> cho các thiết bị bạn đã yêu cầu.</p>
        <p><strong>Tổng cộng:</strong> ${formatVND(total)}</p>
        ${note ? `<p><strong>Ghi chú từ ZenoGym:</strong> ${note}</p>` : ""}
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
