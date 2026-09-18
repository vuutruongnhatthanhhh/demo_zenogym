import { createAdminClient } from "@/lib/supabase/admin";
import type { PricingSettings } from "@/lib/pricing";

interface PricingSettingsRow {
  cost_markup_percent: number;
  retail_markup_percent: number;
  wholesale_markup_percent: number;
  usd_to_vnd_rate: number;
  round_wholesale_price: boolean;
}

const COLUMNS =
  "cost_markup_percent, retail_markup_percent, wholesale_markup_percent, usd_to_vnd_rate, round_wholesale_price";

function mapSettings(row: PricingSettingsRow): PricingSettings {
  return {
    costMarkupPercent: Number(row.cost_markup_percent),
    retailMarkupPercent: Number(row.retail_markup_percent),
    wholesaleMarkupPercent: Number(row.wholesale_markup_percent),
    usdToVndRate: Number(row.usd_to_vnd_rate),
    roundWholesalePrice: row.round_wholesale_price,
  };
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("pricing_settings").select(COLUMNS).eq("id", 1).single();
  if (error) throw error;
  return mapSettings(data);
}

export async function updatePricingSettings(input: PricingSettings): Promise<PricingSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pricing_settings")
    .update({
      cost_markup_percent: input.costMarkupPercent,
      retail_markup_percent: input.retailMarkupPercent,
      wholesale_markup_percent: input.wholesaleMarkupPercent,
      usd_to_vnd_rate: input.usdToVndRate,
      round_wholesale_price: input.roundWholesalePrice,
    })
    .eq("id", 1)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapSettings(data);
}
