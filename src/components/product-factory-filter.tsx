"use client";

import { useMemo } from "react";
import { ProductFilterTabs } from "@/components/product-filter-tab";
import type { Product } from "@/lib/types";

export function ProductFactoryFilter({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: string;
  onChange: (factoryId: string) => void;
}) {
  const factories = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const { factoryId, factoryName } of products) {
      if (!factoryId) continue;
      const factory = byId.get(factoryId);
      if (factory) factory.count += 1;
      else byId.set(factoryId, { id: factoryId, name: factoryName || "Không rõ", count: 1 });
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [products]);

  return (
    <ProductFilterTabs
      label="Nhà máy"
      options={factories}
      total={products.length}
      value={value}
      onChange={onChange}
    />
  );
}
