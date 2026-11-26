"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

export const ALL_CATEGORY_ID = "all";
export const ALL_SERIES_ID = "";

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

  const seriesOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { series } of productsInCategory) {
      if (series) counts.set(series, (counts.get(series) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
    const hasSeries = nextFactoryId !== "" && products.some(
      (p) =>
        p.series === series &&
        p.factoryId === nextFactoryId &&
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
    categoryProductCount: productsInCategory.length,
    categoryCounts,
    seriesOptions,
    displayedProducts,
    handleFactoryChange,
    handleCategoryChange,
    setSeries,
    setSearch,
  };
}
