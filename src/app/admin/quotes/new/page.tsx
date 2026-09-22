import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProducts } from "@/lib/data/products";
import { getAllCategories } from "@/lib/data/categories";
import { QuickQuoteClient } from "./quick-quote-client";

export default async function NewAdminQuotePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const [products, categories] = await Promise.all([getAvailableProducts(), getAllCategories()]);

  return <QuickQuoteClient products={products} categories={categories} />;
}
