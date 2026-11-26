"use client";

import { useId, useMemo } from "react";
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
  const id = useId();
  const factories = useMemo(() => {
    const names = new Map<string, string>();
    for (const { factoryId, factoryName } of products) {
      if (factoryId) names.set(factoryId, factoryName);
    }
    return Array.from(names).sort(([, a], [, b]) => a.localeCompare(b, "vi"));
  }, [products]);

  return (
    <div className="w-44 space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Nhà máy
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
      >
        <option value="">Tất cả</option>
        {factories.map(([factoryId, name]) => (
          <option key={factoryId} value={factoryId}>
            {name || "Không rõ"}
          </option>
        ))}
      </select>
    </div>
  );
}
