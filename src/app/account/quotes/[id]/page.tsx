import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerQuoteById } from "@/lib/data/quotes";
import { getAvailableProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { EditQuoteClient } from "./edit-quote-client";

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
    <EditQuoteClient
      products={products}
      categories={categories}
      pricingSettings={pricingSettings}
      quote={{ id: quote.id, code: quote.code, createdAt: quote.createdAt }}
      initialItems={items}
      initialNote={quote.note}
    />
  );
}
