"use client";

import { useMemo } from "react";
import { ProductFilterTab } from "@/components/product-filter-tab";
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
    <div role="group" aria-label="Nhà máy" className="flex flex-wrap items-center gap-1 border-b">
      <span className="pl-3 pr-1 text-xs font-medium text-muted-foreground">
        Nhà máy
      </span>
      <ProductFilterTab
        label="Tất cả"
        count={products.length}
        active={value === ""}
        onClick={() => onChange("")}
      />
      {factories.map(({ id, name, count }) => (
        <ProductFilterTab
          key={id}
          label={name}
          count={count}
          active={value === id}
          onClick={() => onChange(id)}
        />
      ))}
    </div>
  );
}
