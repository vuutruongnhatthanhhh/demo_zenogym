import type { QuotePartyInfo } from "./pdf/party-info";

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Factory {
  id: string;
  name: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  model: string;
  name: string;
  image: string;
  priceUsd: number;
  categoryId: string;
  categoryName: string;
  factoryId: string;
  factoryName: string;
  /** Auto-derived from `model` — see src/lib/series.ts. */
  series: string;
  description: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = "new" | "quoted" | "sent";

export interface QuoteRequestItem {
  productId: string;
  model: string;
  name: string;
  image: string;
  categoryId: string;
  categoryName: string;
  factoryId?: string;
  factoryName?: string;
  quantity: number;
  price: number;
}

export interface QuoteLineItem {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  /**
   * Snapshot fields so a line is self-sufficient for category grouping and
   * cost/retail reference prices — needed for products the admin added
   * directly on the quote (not part of the customer's original request, so
   * they have no entry in `QuoteRequest.items` to fall back to). Optional
   * for backward compat with quotes saved before this existed.
   */
  model?: string;
  categoryId?: string;
  categoryName?: string;
  factoryId?: string;
  factoryName?: string;
  factoryPriceUsd?: number;
}

export interface QuoteRequest {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  address?: string;
  note?: string;
  items: QuoteRequestItem[];
  status: QuoteStatus;
  createdAt: string;
  quotedItems?: QuoteLineItem[];
  quotedTotal?: number;
  quotedNote?: string;
  quotedParty?: QuotePartyInfo;
  quotedAt?: string;
  sentAt?: string;
  sentCount: number;
  /** Set when submitted through an admin's personal /bao-gia/{code} link. */
  linkCode?: string;
  /** The logged-in customer account that submitted this request, if any. */
  customerId?: string;
  /** How many times the customer has (re)submitted this request — "Lần N" in the admin notification email. */
  requestCount: number;
}

export interface QuoteCode {
  id: string;
  code: string;
  createdBy: string;
  createdAt: string;
}

export type UserRole = "admin" | "customer";
