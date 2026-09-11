import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { CatalogClient } from "./catalog-client";

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [products, categories] = await Promise.all([getAvailableProducts(), getAllCategories()]);

  return (
    <CatalogClient
      products={products}
      categories={categories}
      customerName={user.name}
      customerEmail={user.email}
      isAdmin={user.role === "admin"}
    />
  );
}
