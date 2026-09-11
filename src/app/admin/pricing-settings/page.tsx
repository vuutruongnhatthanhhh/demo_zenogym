import { getPricingSettings } from "@/lib/data/pricing-settings";
import { PricingSettingsClient } from "./pricing-settings-client";

export default async function AdminPricingSettingsPage() {
  const settings = await getPricingSettings();
  return <PricingSettingsClient initialSettings={settings} />;
}
