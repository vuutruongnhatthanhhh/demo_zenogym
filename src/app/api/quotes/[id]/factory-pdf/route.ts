export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { createElement } from "react";
import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getQuoteById } from "@/lib/data/quotes";
import { QuoteRequestDocument } from "@/lib/pdf/quote-request-document";
import { toPdfImageSource } from "@/lib/pdf/pdf-image";
import { slugify } from "@/lib/utils";

// Same PDF format as the "yêu cầu báo giá" the admin gets by email (no
// prices, just No./Model/Name/Photo/Qty) — but scoped to one factory's
// items, so it can be handed straight to that factory.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const { id } = await params;
  const quote = await getQuoteById(id, user.id, user.isSuperAdmin);
  if (!quote) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  }

  const factoryId = req.nextUrl.searchParams.get("factoryId");
  const items =
    factoryId && factoryId !== "all"
      ? quote.items.filter((item) => item.factoryId === factoryId)
      : quote.items;

  if (items.length === 0) {
    return NextResponse.json({ error: "Không có sản phẩm nào thuộc nhà máy này" }, { status: 400 });
  }

  const images = await Promise.all(items.map((item) => toPdfImageSource(item.image)));
  const pdfBuffer = await renderToBuffer(
    createElement(QuoteRequestDocument, {
      quote: { ...quote, items },
      images,
    }) as ReactElement<DocumentProps>
  );

  const factoryName = items[0]?.factoryName;
  const suffix = factoryId && factoryId !== "all" && factoryName ? `-${slugify(factoryName)}` : "";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bao-gia-nha-may${suffix}-${quote.code}.pdf"`,
    },
  });
}
