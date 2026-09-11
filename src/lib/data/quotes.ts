import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./store";
import type { QuoteLineItem, QuoteRequest, QuoteRequestItem } from "@/lib/types";

const FILE = "quotes.json";

export async function getAllQuotes(): Promise<QuoteRequest[]> {
  const quotes = await readJson<QuoteRequest[]>(FILE, []);
  return quotes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getQuoteById(id: string): Promise<QuoteRequest | undefined> {
  const quotes = await getAllQuotes();
  return quotes.find((q) => q.id === id);
}

export interface CreateQuoteInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  note?: string;
  items: QuoteRequestItem[];
}

function nextQuoteCode(existing: QuoteRequest[]) {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  return `ZG-${year}-${String(seq).padStart(4, "0")}`;
}

export async function createQuoteRequest(input: CreateQuoteInput): Promise<QuoteRequest> {
  const quotes = await readJson<QuoteRequest[]>(FILE, []);
  const now = new Date().toISOString();
  const quote: QuoteRequest = {
    id: randomUUID(),
    code: nextQuoteCode(quotes),
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    companyName: input.companyName,
    note: input.note,
    items: input.items,
    status: "new",
    createdAt: now,
  };
  quotes.push(quote);
  await writeJson(FILE, quotes);
  return quote;
}

export async function saveQuotePricing(
  id: string,
  quotedItems: QuoteLineItem[],
  quotedNote?: string
): Promise<QuoteRequest | undefined> {
  const quotes = await readJson<QuoteRequest[]>(FILE, []);
  const idx = quotes.findIndex((q) => q.id === id);
  if (idx === -1) return undefined;
  const quotedTotal = quotedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  quotes[idx] = {
    ...quotes[idx],
    quotedItems,
    quotedTotal,
    quotedNote,
    status: quotes[idx].status === "sent" ? "sent" : "quoted",
    quotedAt: new Date().toISOString(),
  };
  await writeJson(FILE, quotes);
  return quotes[idx];
}

export async function markQuoteSent(id: string): Promise<QuoteRequest | undefined> {
  const quotes = await readJson<QuoteRequest[]>(FILE, []);
  const idx = quotes.findIndex((q) => q.id === id);
  if (idx === -1) return undefined;
  quotes[idx] = {
    ...quotes[idx],
    status: "sent",
    sentAt: new Date().toISOString(),
  };
  await writeJson(FILE, quotes);
  return quotes[idx];
}
