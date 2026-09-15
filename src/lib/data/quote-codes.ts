import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuoteCode } from "@/lib/types";

interface QuoteCodeRow {
  id: string;
  code: string;
  created_by: string;
  created_at: string;
}

function mapQuoteCode(row: QuoteCodeRow): QuoteCode {
  return { id: row.id, code: row.code, createdBy: row.created_by, createdAt: row.created_at };
}

// Avoids visually ambiguous characters (0/O, 1/I) since this code is meant
// to be read out loud or retyped from a screenshot.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function createQuoteCode(createdBy: string): Promise<QuoteCode> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await admin
      .from("quote_codes")
      .insert({ code, created_by: createdBy })
      .select("*")
      .maybeSingle();
    if (!error && data) return mapQuoteCode(data);
    if (error && error.code !== "23505") throw error; // 23505 = unique_violation, retry with a new code
  }
  throw new Error("Không tạo được mã báo giá, vui lòng thử lại");
}

export async function getQuoteCodesByAdmin(adminId: string): Promise<QuoteCode[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quote_codes")
    .select("*")
    .eq("created_by", adminId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapQuoteCode);
}

// Each admin has exactly one personal quote link — created lazily the first
// time it's needed (e.g. loading /admin/quotes) instead of via a manual
// "create" step, since there's nothing sensitive about the link leaking that
// would call for issuing/rotating several of them.
export async function getOrCreateQuoteCodeForAdmin(adminId: string): Promise<QuoteCode> {
  const existing = await getQuoteCodesByAdmin(adminId);
  if (existing.length > 0) return existing[0];
  return createQuoteCode(adminId);
}

export async function getQuoteCodeByCode(code: string): Promise<QuoteCode | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("quote_codes").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return data ? mapQuoteCode(data) : undefined;
}
