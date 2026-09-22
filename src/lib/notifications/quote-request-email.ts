import { createElement } from "react";
import type { ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";
import { formatDate } from "@/lib/utils";
import { QuoteRequestDocument } from "@/lib/pdf/quote-request-document";
import { toPdfImageSource } from "@/lib/pdf/pdf-image";
import type { QuoteRequest } from "@/lib/types";

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

// requestNumber matches quote.requestCount at send time — shown as "(Lần N)"
// so the admin can tell an edited resend apart from the original request.
export async function sendQuoteRequestNotification(
  quote: QuoteRequest,
  requestNumber: number,
  ownerAdminId?: string
) {
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
    subject: `🏋️ Yêu cầu báo giá của ${quote.customerName} - ${formatDate(quote.createdAt)} (Lần ${requestNumber})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">Yêu cầu báo giá ${requestNumber > 1 ? "cập nhật" : "mới"} - ${quote.code}</h2>
        <p style="color:#64748b;">${formatDate(quote.createdAt)} · Lần ${requestNumber}</p>
        <p><strong>Khách hàng:</strong> ${quote.customerName}</p>
        <p><strong>Điện thoại:</strong> ${quote.customerPhone}</p>
        ${quote.customerEmail ? `<p><strong>Email:</strong> ${quote.customerEmail}</p>` : ""}
        ${quote.address ? `<p><strong>Địa chỉ:</strong> ${quote.address}</p>` : ""}
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
