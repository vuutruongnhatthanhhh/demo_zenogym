import { createAdminClient } from "@/lib/supabase/admin";
import type { Factory } from "@/lib/types";

interface FactoryRow {
  id: string;
  name: string;
  country: string | null;
  created_at: string;
  updated_at: string;
}

function mapFactory(row: FactoryRow): Factory {
  return {
    id: row.id,
    name: row.name,
    country: row.country ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllFactories(): Promise<Factory[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("factories").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(mapFactory);
}

export async function createFactory(name: string, country?: string): Promise<Factory> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("factories")
    .insert({ name, country: country || null })
    .select()
    .single();
  if (error) throw error;
  return mapFactory(data);
}

export async function updateFactory(
  id: string,
  name: string,
  country?: string
): Promise<Factory | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("factories")
    .update({ name, country: country || null })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapFactory(data) : undefined;
}

export async function deleteFactory(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("factories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "Vẫn còn sản phẩm thuộc nhà máy này, không thể xoá" };
    }
    return { ok: false, error: "Xoá thất bại" };
  }
  return { ok: true };
}
