import { createAdminClient } from "@/lib/supabase/admin";
import type { QuoteLineItem, QuoteRequest, QuoteRequestItem, QuoteStatus } from "@/lib/types";

interface QuoteRow {
  id: string;
  code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string | null;
  note: string | null;
  items: QuoteRequestItem[];
  status: QuoteStatus;
  created_at: string;
  quoted_items: QuoteLineItem[] | null;
  quoted_total: number | null;
  quoted_note: string | null;
  quoted_at: string | null;
  sent_at: string | null;
}

function mapQuote(row: QuoteRow): QuoteRequest {
  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    companyName: row.company_name ?? undefined,
    note: row.note ?? undefined,
    items: row.items,
    status: row.status,
    createdAt: row.created_at,
    quotedItems: row.quoted_items ?? undefined,
    quotedTotal: row.quoted_total ?? undefined,
    quotedNote: row.quoted_note ?? undefined,
    quotedAt: row.quoted_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
  };
}

export async function getAllQuotes(): Promise<QuoteRequest[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapQuote);
}

export async function getQuoteById(id: string): Promise<QuoteRequest | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data) : undefined;
}

export interface CreateQuoteInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  note?: string;
  items: QuoteRequestItem[];
}

async function nextQuoteCode(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString();
  const { count, error } = await admin
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfYear);
  if (error) throw error;
  const seq = (count ?? 0) + 1;
  return `ZG-${year}-${String(seq).padStart(4, "0")}`;
}

export async function createQuoteRequest(input: CreateQuoteInput): Promise<QuoteRequest> {
  const admin = createAdminClient();
  const code = await nextQuoteCode(admin);

  const { data, error } = await admin
    .from("quotes")
    .insert({
      code,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      company_name: input.companyName ?? null,
      note: input.note ?? null,
      items: input.items,
      status: "new",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapQuote(data);
}

export async function saveQuotePricing(
  id: string,
  quotedItems: QuoteLineItem[],
  quotedNote?: string
): Promise<QuoteRequest | undefined> {
  const admin = createAdminClient();
  const existing = await getQuoteById(id);
  if (!existing) return undefined;

  const quotedTotal = quotedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const { data, error } = await admin
    .from("quotes")
    .update({
      quoted_items: quotedItems,
      quoted_total: quotedTotal,
      quoted_note: quotedNote ?? null,
      status: existing.status === "sent" ? "sent" : "quoted",
      quoted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data) : undefined;
}

export async function markQuoteSent(id: string): Promise<QuoteRequest | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data) : undefined;
}
