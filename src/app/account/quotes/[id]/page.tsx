import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerQuoteById } from "@/lib/data/quotes";
import { getAvailableProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { CatalogClient } from "@/app/catalog/catalog-client";

export default async function EditCustomerQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const quote = await getCustomerQuoteById(id, user.id);
  if (!quote) notFound();

  const [products, categories, pricingSettings] = await Promise.all([
    getAvailableProducts(),
    getAllCategories(),
    getPricingSettings(),
  ]);

  const items = Object.fromEntries(quote.items.map((item) => [item.productId, item.quantity]));

  return (
    <CatalogClient
      products={products}
      categories={categories}
      pricingSettings={pricingSettings}
      customerName={user.name}
      customerEmail={user.email}
      customerPhone={user.phone}
      customerCompany={user.company}
      customerAddress={user.address}
      isAdmin={user.role === "admin"}
      isLoggedIn
      resubmitQuote={{ id: quote.id, items, note: quote.note }}
    />
  );
}
