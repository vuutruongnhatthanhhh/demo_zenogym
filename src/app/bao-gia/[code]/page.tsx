import { notFound } from "next/navigation";
import { getQuoteCodeByCode } from "@/lib/data/quote-codes";
import { getAvailableProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { CatalogClient } from "@/app/catalog/catalog-client";

// Public, admin-personal link: /bao-gia/{code}. Quote requests submitted
// here are tagged with `code` so only the admin who generated it can see
// or get notified about them (see lib/data/quotes.ts getAllQuotes).
export default async function QuoteLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quoteCode = await getQuoteCodeByCode(code);
  if (!quoteCode) notFound();

  const [products, categories, pricingSettings] = await Promise.all([
    getAvailableProducts(),
    getAllCategories(),
    getPricingSettings(),
  ]);

  return (
    <CatalogClient
      products={products}
      categories={categories}
      pricingSettings={pricingSettings}
      customerName=""
      customerEmail=""
      customerPhone=""
      customerCompany=""
      isAdmin={false}
      linkCode={code}
    />
  );
}
