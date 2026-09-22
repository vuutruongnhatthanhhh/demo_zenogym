export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuoteById, saveQuotePricing } from "@/lib/data/quotes";
import type { QuoteLineItem } from "@/lib/types";

// Persists the admin's in-progress edits (added/removed products, quantities,
// prices) without generating a PDF or sending anything — a plain draft save.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getQuoteById(id, user.id, user.isSuperAdmin);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });

  const body = await req.json();
  const items = body.items as QuoteLineItem[];
  const note = body.note as string | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Danh sách sản phẩm không hợp lệ" }, { status: 400 });
  }

  const saved = await saveQuotePricing(id, items, note);
  if (!saved) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  return NextResponse.json({ quote: saved });
}
