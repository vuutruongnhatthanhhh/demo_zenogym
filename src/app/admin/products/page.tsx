import { searchProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { getAllFactories } from "@/lib/data/factories";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { ProductsClient } from "./products-client";

const PAGE_SIZE = 20;

export default async function AdminProductsPage() {
  const [result, categories, factories, pricingSettings] = await Promise.all([
    searchProducts({ page: 1, pageSize: PAGE_SIZE }),
    getAllCategories(),
    getAllFactories(),
    getPricingSettings(),
  ]);

  return (
    <ProductsClient
      initialResult={result}
      pageSize={PAGE_SIZE}
      categories={categories}
      factories={factories}
      initialPricingSettings={pricingSettings}
    />
  );
}
