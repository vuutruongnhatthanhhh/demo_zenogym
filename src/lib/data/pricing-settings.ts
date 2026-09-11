import { createAdminClient } from "@/lib/supabase/admin";
import type { PricingSettings } from "@/lib/pricing";

interface PricingSettingsRow {
  cost_markup_percent: number;
  retail_markup_percent: number;
  wholesale_markup_percent: number;
  usd_to_vnd_rate: number;
}

function mapSettings(row: PricingSettingsRow): PricingSettings {
  return {
    costMarkupPercent: Number(row.cost_markup_percent),
    retailMarkupPercent: Number(row.retail_markup_percent),
    wholesaleMarkupPercent: Number(row.wholesale_markup_percent),
    usdToVndRate: Number(row.usd_to_vnd_rate),
  };
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pricing_settings")
    .select("cost_markup_percent, retail_markup_percent, wholesale_markup_percent, usd_to_vnd_rate")
    .eq("id", 1)
    .single();
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
    })
    .eq("id", 1)
    .select("cost_markup_percent, retail_markup_percent, wholesale_markup_percent, usd_to_vnd_rate")
    .single();
  if (error) throw error;
  return mapSettings(data);
}
