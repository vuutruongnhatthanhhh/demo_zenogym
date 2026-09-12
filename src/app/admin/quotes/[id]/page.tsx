import { notFound } from "next/navigation";
import { getQuoteById } from "@/lib/data/quotes";
import { getProductById } from "@/lib/data/products";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { QuoteDetailClient } from "./quote-detail-client";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, pricingSettings] = await Promise.all([getQuoteById(id), getPricingSettings()]);
  if (!quote) notFound();

  // Quotes created before category snapshots existed on quote items have no
  // categoryId/categoryName saved. Backfill from the product's current
  // category so old quotes still group into real tabs instead of always
  // falling back to "Chưa phân loại".
  const missingProductIds = Array.from(
    new Set(quote.items.filter((item) => !item.categoryId).map((item) => item.productId))
  );
  if (missingProductIds.length > 0) {
    const products = await Promise.all(missingProductIds.map((productId) => getProductById(productId)));
    const productById = new Map(
      products.filter((p): p is NonNullable<typeof p> => !!p).map((p) => [p.id, p])
    );
    quote.items = quote.items.map((item) => {
      if (item.categoryId) return item;
      const product = productById.get(item.productId);
      return product
        ? { ...item, categoryId: product.categoryId, categoryName: product.categoryName }
        : item;
    });
  }

  return <QuoteDetailClient quote={quote} pricingSettings={pricingSettings} />;
}
