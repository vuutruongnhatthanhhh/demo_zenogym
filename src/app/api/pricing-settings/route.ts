export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPricingSettings, updatePricingSettings } from "@/lib/data/pricing-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  return NextResponse.json({ settings: await getPricingSettings() });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const costMarkupPercent = Number(body?.costMarkupPercent);
  const retailMarkupPercent = Number(body?.retailMarkupPercent);
  const wholesaleMarkupPercent = Number(body?.wholesaleMarkupPercent);
  const usdToVndRate = Number(body?.usdToVndRate);
  const roundWholesalePrice = Boolean(body?.roundWholesalePrice);

  if (
    !Number.isFinite(costMarkupPercent) ||
    costMarkupPercent < 0 ||
    !Number.isFinite(retailMarkupPercent) ||
    retailMarkupPercent < 0 ||
    !Number.isFinite(wholesaleMarkupPercent) ||
    wholesaleMarkupPercent < 0 ||
    !Number.isFinite(usdToVndRate) ||
    usdToVndRate <= 0
  ) {
    return NextResponse.json({ error: "Giá trị cấu hình không hợp lệ" }, { status: 400 });
  }

  const settings = await updatePricingSettings({
    costMarkupPercent,
    retailMarkupPercent,
    wholesaleMarkupPercent,
    usdToVndRate,
    roundWholesalePrice,
  });
  return NextResponse.json({ settings });
}
