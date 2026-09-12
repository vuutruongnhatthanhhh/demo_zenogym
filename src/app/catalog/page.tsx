import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { getPricingSettings } from "@/lib/data/pricing-settings";
import { CatalogClient } from "./catalog-client";

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
      customerName={user.name}
      customerEmail={user.email}
      customerPhone={user.phone}
      customerCompany={user.company}
      isAdmin={user.role === "admin"}
    />
  );
}
