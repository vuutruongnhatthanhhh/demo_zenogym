import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuoteById, updateQuoteItems } from "@/lib/data/quotes";
import { getProductById } from "@/lib/data/products";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { QuoteDetailClient } from "./quote-detail-client";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const [quote, pricingSettings] = await Promise.all([
    getQuoteById(id, user.id, user.isSuperAdmin),
    getPricingSettings(),
  ]);
  if (!quote) notFound();

  // Quotes created before category/factory snapshots existed on quote items
  // have no categoryId/categoryName or factoryId/factoryName saved. Backfill
  // from the product's current values so old quotes still group into real
  // tabs (instead of "Chưa phân loại") and can be filtered by factory.
  const missingProductIds = Array.from(
    new Set(
      quote.items.filter((item) => !item.categoryId || !item.factoryId).map((item) => item.productId)
    )
  );
  if (missingProductIds.length > 0) {
    const products = await Promise.all(missingProductIds.map((productId) => getProductById(productId)));
    const productById = new Map(
      products.filter((p): p is NonNullable<typeof p> => !!p).map((p) => [p.id, p])
    );
    quote.items = quote.items.map((item) => {
      if (item.categoryId && item.factoryId) return item;
      const product = productById.get(item.productId);
      if (!product) return item;
      return {
        ...item,
        categoryId: item.categoryId || product.categoryId,
        categoryName: item.categoryName || product.categoryName,
        factoryId: item.factoryId || product.factoryId,
        factoryName: item.factoryName || product.factoryName,
      };
    });
    // Persist so other reads (e.g. the factory PDF download route, which
    // fetches the quote fresh instead of reusing this backfilled copy)
    // see the corrected data too — this only needs to run once per quote.
    await updateQuoteItems(id, quote.items).catch((err) =>
      console.error("Không lưu lại được category/factory đã backfill:", err)
    );
  }

  return <QuoteDetailClient quote={quote} pricingSettings={pricingSettings} />;
}
