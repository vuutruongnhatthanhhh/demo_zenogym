import { createAdminClient } from "@/lib/supabase/admin";
import type { Category } from "@/lib/types";

interface CategoryRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function getAllCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("categories").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function createCategory(name: string): Promise<Category> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("categories").insert({ name }).select().single();
  if (error) throw error;
  return mapCategory(data);
}

export async function updateCategory(id: string, name: string): Promise<Category | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .update({ name })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapCategory(data) : undefined;
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "Vẫn còn sản phẩm thuộc loại này, không thể xoá" };
    }
    return { ok: false, error: "Xoá thất bại" };
  }
  return { ok: true };
}
