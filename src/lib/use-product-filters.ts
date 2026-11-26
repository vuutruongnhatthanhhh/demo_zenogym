"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

export const ALL_CATEGORY_ID = "all";
export const ALL_SERIES_ID = "all";

export function useProductFilters(products: Product[]) {
  const [factoryId, setFactoryId] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY_ID);
  const [series, setSeries] = useState(ALL_SERIES_ID);
  const [search, setSearch] = useState("");

  const productsInFactory = useMemo(
    () => (factoryId ? products.filter((p) => p.factoryId === factoryId) : products),
    [products, factoryId],
  );
  const productsInCategory = useMemo(
    () =>
      category === ALL_CATEGORY_ID
        ? productsInFactory
        : productsInFactory.filter((p) => p.categoryId === category),
    [productsInFactory, category],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of productsInFactory) {
      counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [productsInFactory]);

  const seriesList = useMemo(() => {
    const values = new Set<string>();
    for (const p of productsInCategory) if (p.series) values.add(p.series);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [productsInCategory]);

  const normalizedSearch = search.trim().toLowerCase();
  const displayedProducts = useMemo(() => {
    const list =
      series === ALL_SERIES_ID
        ? productsInCategory
        : productsInCategory.filter((p) => p.series === series);
    if (!normalizedSearch) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedSearch) ||
        p.model.toLowerCase().includes(normalizedSearch),
    );
  }, [productsInCategory, series, normalizedSearch]);

  function handleFactoryChange(nextFactoryId: string) {
    setFactoryId(nextFactoryId);
    if (series === ALL_SERIES_ID) return;
    const hasSeries = products.some(
      (p) =>
        p.series === series &&
        (!nextFactoryId || p.factoryId === nextFactoryId) &&
        (category === ALL_CATEGORY_ID || p.categoryId === category),
    );
    if (!hasSeries) setSeries(ALL_SERIES_ID);
  }

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setSeries(ALL_SERIES_ID);
  }

  return {
    factoryId,
    category,
    series,
    search,
    factoryProductCount: productsInFactory.length,
    categoryCounts,
    seriesList,
    displayedProducts,
    handleFactoryChange,
    handleCategoryChange,
    setSeries,
    setSearch,
  };
}
