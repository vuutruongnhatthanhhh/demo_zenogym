export interface PricingSettings {
  costMarkupPercent: number;
  retailMarkupPercent: number;
  wholesaleMarkupPercent: number;
  usdToVndRate: number;
  roundWholesalePrice: boolean;
}

export interface ComputedPricesUsd {
  factoryUsd: number;
  costUsd: number;
  retailUsd: number;
  wholesaleUsd: number;
}

export function computePricesUsd(factoryPriceUsd: number, settings: PricingSettings): ComputedPricesUsd {
  return {
    factoryUsd: factoryPriceUsd,
    costUsd: factoryPriceUsd * (1 + settings.costMarkupPercent / 100),
    retailUsd: factoryPriceUsd * (1 + settings.retailMarkupPercent / 100),
    wholesaleUsd: factoryPriceUsd * (1 + settings.wholesaleMarkupPercent / 100),
  };
}

export function usdToVnd(usd: number, rate: number): number {
  return usd * rate;
}

const WHOLESALE_ROUNDING_STEP = 500_000;

// Rounds to the nearest 500.000đ (e.g. 19.100.000/19.200.000 -> 19.000.000,
// 19.600.000/19.700.000 -> 19.500.000, 19.800.000/19.900.000 -> 20.000.000)
// so wholesale prices land on clean, negotiable numbers instead of odd
// figures — only applied when the admin has turned rounding on.
export function roundWholesaleVnd(vnd: number, settings: PricingSettings): number {
  const whole = Math.round(vnd);
  if (!settings.roundWholesalePrice) return whole;
  return Math.round(whole / WHOLESALE_ROUNDING_STEP) * WHOLESALE_ROUNDING_STEP;
}
