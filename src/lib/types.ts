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
  quantity: number;
  price: number;
}

export interface QuoteLineItem {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteRequest {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  note?: string;
  items: QuoteRequestItem[];
  status: QuoteStatus;
  createdAt: string;
  quotedItems?: QuoteLineItem[];
  quotedTotal?: number;
  quotedNote?: string;
  quotedAt?: string;
  sentAt?: string;
}

export type UserRole = "admin" | "customer";
