import { createAdminClient } from "@/lib/supabase/admin";
import { getQuoteCodesByAdmin, getQuoteCodeByCode } from "@/lib/data/quote-codes";
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
  sent_count: number;
  link_code: string | null;
  ip: string | null;
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
    sentCount: row.sent_count ?? 0,
    linkCode: row.link_code ?? undefined,
  };
}

// Quotes submitted through an admin's personal /bao-gia/{code} link are only
// visible to that admin. Quotes with no link_code (the shared /catalog page,
// no code) are only visible to the super admin (ADMIN_EMAIL) — regular
// admins never see them, matching where the notification email goes.
export async function getAllQuotes(adminId: string, isSuperAdmin: boolean): Promise<QuoteRequest[]> {
  const admin = createAdminClient();
  const myCodes = await getQuoteCodesByAdmin(adminId);
  const codeList = myCodes.map((c) => c.code);

  if (codeList.length === 0 && !isSuperAdmin) return [];

  let query = admin.from("quotes").select("*").order("created_at", { ascending: false });
  if (isSuperAdmin && codeList.length > 0) {
    query = query.or(`link_code.is.null,link_code.in.(${codeList.join(",")})`);
  } else if (isSuperAdmin) {
    query = query.is("link_code", null);
  } else {
    query = query.in("link_code", codeList);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapQuote);
}

async function fetchQuoteRaw(id: string): Promise<QuoteRequest | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data) : undefined;
}

// Same access rule as getAllQuotes, but for a single quote (e.g. someone
// guessing/typing another admin's quote URL directly).
export async function getQuoteById(
  id: string,
  adminId: string,
  isSuperAdmin: boolean
): Promise<QuoteRequest | undefined> {
  const quote = await fetchQuoteRaw(id);
  if (!quote) return undefined;
  if (quote.linkCode) {
    const owner = await getQuoteCodeByCode(quote.linkCode);
    if (!owner || owner.createdBy !== adminId) return undefined;
  } else if (!isSuperAdmin) {
    return undefined;
  }
  return quote;
}

export interface CreateQuoteInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  note?: string;
  items: QuoteRequestItem[];
  linkCode?: string;
  ip?: string;
}

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

// Captcha only stops bots — a human can still click "submit" repeatedly, so
// this caps how many quote requests the same email, phone, or IP can create
// within a short window regardless of how they were submitted.
export async function isQuoteSubmissionRateLimited(params: {
  email: string;
  phone: string;
  ip?: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();

  const checks = [
    admin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .ilike("customer_email", params.email.trim())
      .gte("created_at", since),
    admin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", params.phone.trim())
      .gte("created_at", since),
  ];
  if (params.ip) {
    checks.push(
      admin
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("ip", params.ip)
        .gte("created_at", since)
    );
  }

  const results = await Promise.all(checks);
  for (const { count, error } of results) {
    if (error) throw error;
    if ((count ?? 0) >= RATE_LIMIT_MAX_SUBMISSIONS) return true;
  }
  return false;
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
      link_code: input.linkCode ?? null,
      ip: input.ip ?? null,
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
  const existing = await fetchQuoteRaw(id);
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
  const existing = await fetchQuoteRaw(id);
  if (!existing) return undefined;

  const { data, error } = await admin
    .from("quotes")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: existing.sentCount + 1,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data) : undefined;
}
