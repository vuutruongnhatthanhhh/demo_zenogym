export type ProductCategory =
  | "Máy chạy bộ"
  | "Xe đạp tập"
  | "Thiết bị cardio khác"
  | "Giàn tạ & máy tập toàn thân"
  | "Máy tập cơ đơn lẻ"
  | "Dụng cụ tập tạ tự do"
  | "Phụ kiện tập luyện";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Máy chạy bộ",
  "Xe đạp tập",
  "Thiết bị cardio khác",
  "Giàn tạ & máy tập toàn thân",
  "Máy tập cơ đơn lẻ",
  "Dụng cụ tập tạ tự do",
  "Phụ kiện tập luyện",
];

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  image: string;
  costPrice: number;
  retailPrice: number;
  projectPrice: number;
  description: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = "new" | "quoted" | "sent";

export interface QuoteRequestItem {
  productId: string;
  name: string;
  image: string;
  category: ProductCategory;
  quantity: number;
  retailPrice: number;
  projectPrice: number;
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
