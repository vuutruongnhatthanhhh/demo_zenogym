export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { createElement } from "react";
import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerQuoteById } from "@/lib/data/quotes";
import { QuoteDocument, type QuoteDocumentItem } from "@/lib/pdf/quote-document";
import { toPdfImageSource } from "@/lib/pdf/pdf-image";
import { DEFAULT_SELLER_PARTY, type QuotePartyInfo } from "@/lib/pdf/party-info";

// Lets a customer download the PDF for their own already-priced quote —
// replaces the old email attachment now that customer accounts have no real
// email to send it to.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const quote = await getCustomerQuoteById(id, user.id);
  if (!quote || !quote.quotedItems || quote.quotedItems.length === 0) {
    return NextResponse.json({ error: "Báo giá chưa sẵn sàng" }, { status: 404 });
  }

  const party: QuotePartyInfo =
    quote.quotedParty ??
    ({
      ...DEFAULT_SELLER_PARTY,
      buyerName: quote.customerName,
      buyerPhone: quote.customerPhone,
      buyerAddress: quote.address ?? "",
    } satisfies QuotePartyInfo);

  const pdfItems: QuoteDocumentItem[] = await Promise.all(
    quote.quotedItems.map(async (item) => ({
      ...item,
      image: (await toPdfImageSource(item.image)) ?? item.image,
    }))
  );
  const pdfBuffer = await renderToBuffer(
    createElement(QuoteDocument, { quote, items: pdfItems, party }) as ReactElement<DocumentProps>
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bao-gia-${quote.code}.pdf"`,
    },
  });
}
