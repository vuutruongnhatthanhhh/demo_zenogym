import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./store";
import type { Product } from "@/lib/types";

const FILE = "products.json";

export async function getAllProducts(): Promise<Product[]> {
  return readJson<Product[]>(FILE, []);
}

export async function getAvailableProducts(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.available);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getAllProducts();
  return products.find((p) => p.id === id);
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export async function createProduct(input: ProductInput): Promise<Product> {
  const products = await getAllProducts();
  const now = new Date().toISOString();
  const product: Product = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  products.unshift(product);
  await writeJson(FILE, products);
  return product;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<Product | undefined> {
  const products = await getAllProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  products[idx] = {
    ...products[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(FILE, products);
  return products[idx];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await getAllProducts();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  await writeJson(FILE, next);
  return true;
}
