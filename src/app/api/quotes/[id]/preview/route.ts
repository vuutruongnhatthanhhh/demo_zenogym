export const dynamic = "force-dynamic";

import { createElement } from "react";
import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getQuoteById } from "@/lib/data/quotes";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import type { QuoteLineItem } from "@/lib/types";

// Renders the exact PDF that would be emailed to the customer, using the
// admin's in-progress edits — but never saves anything or sends an email.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  }

  const body = await req.json();
  const items = body.items as QuoteLineItem[];
  const note = body.note as string | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Danh sách sản phẩm không hợp lệ" }, { status: 400 });
  }

  const previewQuote = { ...quote, quotedItems: items, quotedNote: note };
  const pdfBuffer = await renderToBuffer(
    createElement(QuoteDocument, { quote: previewQuote, items }) as ReactElement<DocumentProps>
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bao-gia-${quote.code}-xem-truoc.pdf"`,
    },
  });
}
