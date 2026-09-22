// One-off script: backfill the new `series` column for every existing
// product by deriving it from the model. Same rule the app now applies
// automatically on create/edit (src/lib/series.ts) — keep the two in sync
// if the rule ever changes. Safe to re-run (skips rows already correct).
//
// Usage: node scripts/backfill-product-series.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadEnv() {
  const envPath = path.resolve(".env");
  const content = await fs.readFile(envPath, "utf-8").catch(() => "");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// "F12A" -> "F", "F10" -> "F", "SYT-DP214" -> "SYT-DP", "SQ7017" -> "SQ".
// Models starting straight with a digit ("1020", "360B", "8400-2") have no
// meaningful series -> "".
function deriveSeries(model) {
  const trimmed = (model ?? "").trim();
  const match = trimmed.match(/^[^\d]+/);
  if (!match) return "";
  return match[0].replace(/[-\s]+$/, "");
}

await loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAGE_SIZE = 1000;
const products = [];
for (let from = 0; ; from += PAGE_SIZE) {
  const { data, error } = await supabase
    .from("products")
    .select("id, model, series")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  products.push(...data);
  if (data.length < PAGE_SIZE) break;
}

console.log(`Đang xử lý ${products.length} sản phẩm...`);

const idsToUpdateBySeries = new Map();
const allSeriesCounts = new Map();

for (const product of products) {
  const series = deriveSeries(product.model);
  allSeriesCounts.set(series, (allSeriesCounts.get(series) ?? 0) + 1);
  if (product.series !== series) {
    if (!idsToUpdateBySeries.has(series)) idsToUpdateBySeries.set(series, []);
    idsToUpdateBySeries.get(series).push(product.id);
  }
}

let updated = 0;
for (const [series, ids] of idsToUpdateBySeries) {
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { error } = await supabase.from("products").update({ series }).in("id", chunk);
    if (error) {
      console.error(`Lỗi cập nhật series "${series}":`, error.message);
      continue;
    }
    updated += chunk.length;
  }
}

console.log(`\nĐã cập nhật ${updated} sản phẩm, ${products.length - updated} sản phẩm đã đúng series từ trước.`);
console.log("\nDanh sách series (tổng số sản phẩm):");
for (const [series, count] of [...allSeriesCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${series || "(rỗng)"}: ${count}`);
}
