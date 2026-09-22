import { getDistinctProductSeries, searchProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { getAllFactories } from "@/lib/data/factories";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { ProductsClient } from "./products-client";

const PAGE_SIZE = 100;

export default async function AdminProductsPage() {
  const [result, categories, factories, pricingSettings, seriesList] = await Promise.all([
    searchProducts({ page: 1, pageSize: PAGE_SIZE }),
    getAllCategories(),
    getAllFactories(),
    getPricingSettings(),
    getDistinctProductSeries(),
  ]);

  return (
    <ProductsClient
      initialResult={result}
      pageSize={PAGE_SIZE}
      categories={categories}
      factories={factories}
      initialPricingSettings={pricingSettings}
      seriesList={seriesList}
    />
  );
}
