import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";

const SELECT = "*, categories(name), factories(name)";

interface ProductRow {
  id: string;
  model: string;
  name: string;
  image_url: string | null;
  price_usd: number;
  category_id: string;
  factory_id: string;
  description: string | null;
  available: boolean;
  created_at: string;
  updated_at: string;
  categories: { name: string } | null;
  factories: { name: string } | null;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    model: row.model,
    name: row.name,
    image: row.image_url ?? "/images/placeholder-equipment.svg",
    priceUsd: Number(row.price_usd),
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? "",
    factoryId: row.factory_id,
    factoryName: row.factories?.name ?? "",
    description: row.description ?? "",
    available: row.available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getAvailableProducts(): Promise<Product[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select(SELECT)
    .eq("available", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("products").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : undefined;
}

export interface ProductInput {
  model: string;
  name: string;
  imageUrl?: string;
  priceUsd: number;
  categoryId: string;
  factoryId: string;
  description?: string;
  available: boolean;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .insert({
      model: input.model,
      name: input.name,
      image_url: input.imageUrl,
      price_usd: input.priceUsd,
      category_id: input.categoryId,
      factory_id: input.factoryId,
      description: input.description || null,
      available: input.available,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapProduct(data);
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<Product | undefined> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.model !== undefined) patch.model = input.model;
  if (input.name !== undefined) patch.name = input.name;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
  if (input.priceUsd !== undefined) patch.price_usd = input.priceUsd;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.factoryId !== undefined) patch.factory_id = input.factoryId;
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.available !== undefined) patch.available = input.available;

  const { data, error } = await admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .select(SELECT)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : undefined;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("products").delete().eq("id", id);
  return !error;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  factoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// PostgREST's `.or()` filter syntax treats `,`, `(`, `)` as structural
// delimiters, so any value containing them must be wrapped in double quotes
// (with `\` and `"` escaped) to be treated as a literal pattern.
function toIlikePattern(term: string): string {
  const pattern = `%${term}%`;
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function searchProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const admin = createAdminClient();
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin.from("products").select(SELECT, { count: "exact" });

  const term = filters.search?.trim();
  if (term) {
    const pattern = toIlikePattern(term);
    query = query.or(`name.ilike.${pattern},model.ilike.${pattern}`);
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.factoryId) query = query.eq("factory_id", filters.factoryId);
  if (filters.minPrice !== undefined) query = query.gte("price_usd", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price_usd", filters.maxPrice);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  return {
    products: (data ?? []).map(mapProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
