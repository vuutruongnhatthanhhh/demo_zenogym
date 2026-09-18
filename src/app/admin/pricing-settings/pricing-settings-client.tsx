"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD, formatVND } from "@/lib/utils";
import { computePricesUsd, roundWholesaleVnd, usdToVnd, type PricingSettings } from "@/lib/pricing";

const SAMPLE_FACTORY_PRICE_USD = 100;

export function PricingSettingsClient({ initialSettings }: { initialSettings: PricingSettings }) {
  const [costMarkupPercent, setCostMarkupPercent] = useState(String(initialSettings.costMarkupPercent));
  const [retailMarkupPercent, setRetailMarkupPercent] = useState(
    String(initialSettings.retailMarkupPercent)
  );
  const [wholesaleMarkupPercent, setWholesaleMarkupPercent] = useState(
    String(initialSettings.wholesaleMarkupPercent)
  );
  const [usdToVndRate, setUsdToVndRate] = useState(String(initialSettings.usdToVndRate));
  const [roundWholesalePrice, setRoundWholesalePrice] = useState(initialSettings.roundWholesalePrice);
  const [saving, setSaving] = useState(false);

  const draftSettings: PricingSettings = {
    costMarkupPercent: Number(costMarkupPercent) || 0,
    retailMarkupPercent: Number(retailMarkupPercent) || 0,
    wholesaleMarkupPercent: Number(wholesaleMarkupPercent) || 0,
    usdToVndRate: Number(usdToVndRate) || 0,
    roundWholesalePrice,
  };
  const preview = computePricesUsd(SAMPLE_FACTORY_PRICE_USD, draftSettings);
  const rate = Number(usdToVndRate) || 0;
  const wholesaleVnd = usdToVnd(preview.wholesaleUsd, rate);
  const roundedWholesaleVnd = roundWholesaleVnd(wholesaleVnd, draftSettings);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/pricing-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costMarkupPercent: Number(costMarkupPercent),
          retailMarkupPercent: Number(retailMarkupPercent),
          wholesaleMarkupPercent: Number(wholesaleMarkupPercent),
          usdToVndRate: Number(usdToVndRate),
          roundWholesalePrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      toast.success("Đã lưu cấu hình giá");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu cấu hình thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cấu hình tính giá</h1>
        <p className="text-sm text-muted-foreground">
          Giá vốn, giá lẻ, giá sỉ được tính tự động bằng giá nhà máy cộng thêm % dưới đây.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tỷ lệ cộng thêm (%)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cost-percent">Giá vốn = Giá nhà máy +</Label>
            <div className="relative">
              <Input
                id="cost-percent"
                type="number"
                min={0}
                step="0.1"
                value={costMarkupPercent}
                onChange={(e) => setCostMarkupPercent(e.target.value)}
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retail-percent">Giá lẻ = Giá nhà máy +</Label>
            <div className="relative">
              <Input
                id="retail-percent"
                type="number"
                min={0}
                step="0.1"
                value={retailMarkupPercent}
                onChange={(e) => setRetailMarkupPercent(e.target.value)}
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wholesale-percent">Giá sỉ = Giá nhà máy +</Label>
            <div className="relative">
              <Input
                id="wholesale-percent"
                type="number"
                min={0}
                step="0.1"
                value={wholesaleMarkupPercent}
                onChange={(e) => setWholesaleMarkupPercent(e.target.value)}
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tỷ giá quy đổi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="usd-vnd-rate">1 USD =</Label>
            <div className="relative">
              <Input
                id="usd-vnd-rate"
                type="number"
                min={0}
                step="1"
                value={usdToVndRate}
                onChange={(e) => setUsdToVndRate(e.target.value)}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">VNĐ</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Làm tròn giá sỉ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Làm tròn giá sỉ (VNĐ) về bội số 500.000đ gần nhất để không bị lẻ. Ví dụ: 19.100.000 hoặc
            19.200.000 → 19.000.000; 19.600.000 hoặc 19.700.000 → 19.500.000; 19.800.000 hoặc
            19.900.000 → 20.000.000.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={roundWholesalePrice ? "outline" : "default"}
              size="sm"
              onClick={() => setRoundWholesalePrice(false)}
            >
              Không làm tròn
            </Button>
            <Button
              type="button"
              variant={roundWholesalePrice ? "default" : "outline"}
              size="sm"
              onClick={() => setRoundWholesalePrice(true)}
            >
              Làm tròn
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xem trước (giá nhà máy mẫu: {formatUSD(SAMPLE_FACTORY_PRICE_USD)})</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PreviewItem label="Giá vốn" usd={preview.costUsd} vnd={usdToVnd(preview.costUsd, rate)} />
          <PreviewItem label="Giá lẻ" usd={preview.retailUsd} vnd={usdToVnd(preview.retailUsd, rate)} />
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Giá sỉ</p>
            <p className="text-sm font-semibold">{formatVND(roundedWholesaleVnd)}</p>
            <p className="text-xs text-muted-foreground">{formatUSD(preview.wholesaleUsd)}</p>
            {roundWholesalePrice && roundedWholesaleVnd !== Math.round(wholesaleVnd) ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Chưa làm tròn: {formatVND(wholesaleVnd)}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}

function PreviewItem({ label, usd, vnd }: { label: string; usd: number; vnd: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{formatVND(vnd)}</p>
      <p className="text-xs text-muted-foreground">{formatUSD(usd)}</p>
    </div>
  );
}
