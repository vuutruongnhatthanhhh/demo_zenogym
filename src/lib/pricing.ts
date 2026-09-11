export interface PricingSettings {
  costMarkupPercent: number;
  retailMarkupPercent: number;
  wholesaleMarkupPercent: number;
  usdToVndRate: number;
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
