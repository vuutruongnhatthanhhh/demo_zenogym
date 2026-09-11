import { getAllCategories } from "@/lib/data/categories";
import { CategoriesClient } from "./categories-client";

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();
  return <CategoriesClient initialCategories={categories} />;
}
