// One-off script: download real gym-equipment photos from Wikimedia Commons
// (freely licensed) into public/images/products for the demo catalog.
// Re-running is safe: existing files are skipped and the manifest is merged.
import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public/images/products");
await fs.mkdir(OUT_DIR, { recursive: true });

const manifestPath = path.resolve("scripts/image-manifest.json");
const manifest = await fs
  .readFile(manifestPath, "utf-8")
  .then(JSON.parse)
  .catch(() => ({}));

const categories = [
  { slug: "treadmill", term: "treadmill machine gym", count: 3 },
  { slug: "exercise-bike", term: "exercise bike gym", count: 3 },
  { slug: "elliptical", term: "elliptical trainer gym", count: 2 },
  { slug: "rowing-machine", term: "rowing machine gym", count: 1 },
  { slug: "power-rack", term: "squat rack", count: 3 },
  { slug: "smith-machine", term: "smith machine gym", count: 1 },
  { slug: "chest-press", term: "chest press machine gym", count: 2 },
  { slug: "shoulder-press", term: "shoulder press machine gym", count: 2 },
  { slug: "lat-pulldown", term: "lat pulldown machine gym", count: 1 },
  { slug: "leg-extension", term: "leg extension exercise machine gym", count: 1 },
  { slug: "leg-press", term: "leg press machine gym", count: 2 },
  { slug: "cable-crossover", term: "functional trainer cable machine fitness", count: 2 },
  { slug: "weight-bench", term: "weight bench gym", count: 2 },
  { slug: "dumbbells", term: "dumbbells rack gym", count: 3 },
  { slug: "kettlebell", term: "kettlebell weight", count: 2 },
  { slug: "barbell", term: "barbell plates", count: 2 },
  { slug: "plyo-box", term: "plyometric box", count: 1 },
  { slug: "battle-rope", term: "battle rope exercise", count: 1 },
  { slug: "medicine-ball", term: "medicine ball exercise", count: 1 },
  { slug: "vibration-plate", term: "vibration plate", count: 1 },
  { slug: "stair-climber", term: "stair climber machine gym", count: 1 },
  { slug: "yoga-mat", term: "yoga mat gym", count: 1 },
  { slug: "trx", term: "suspension trainer straps gym", count: 1 },
  { slug: "multi-gym", term: "multi gym home station equipment", count: 1 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, opts, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, opts);
    if (res.status !== 429) return res;
    const wait = 5000 * (i + 1);
    console.log("429, waiting", wait, "ms:", url.slice(0, 90));
    await sleep(wait);
  }
  return fetch(url, opts);
}

async function searchCommons(term, limit) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
    `&gsrsearch=${encodeURIComponent(term)}` +
    `&gsrlimit=${limit}&gsrnamespace=6&prop=imageinfo` +
    "&iiprop=url|size|mime&iiurlwidth=1000&format=json&origin=*";
  const res = await fetchWithRetry(url, { headers: { "User-Agent": "ZenoGymDemo/1.0" } });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter(
      (info) => info && (info.mime === "image/jpeg" || info.mime === "image/png") && info.width >= 400
    )
    .map((info) => info.thumburl || info.url);
}

for (const cat of categories) {
  manifest[cat.slug] = manifest[cat.slug] ?? [];
  const already = manifest[cat.slug].length;
  if (already >= cat.count) {
    console.log("SKIP", cat.slug, `(already have ${already})`);
    continue;
  }

  await sleep(2000);
  try {
    const urls = await searchCommons(cat.term, cat.count + 5);
    let saved = already;
    for (const imgUrl of urls) {
      if (saved >= cat.count) break;
      const ext = imgUrl.toLowerCase().includes(".png") ? "png" : "jpg";
      const filename = `${cat.slug}-${saved + 1}.${ext}`;
      const dest = path.join(OUT_DIR, filename);
      const exists = await fs
        .stat(dest)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        saved++;
        continue;
      }
      await sleep(1500);
      const res = await fetchWithRetry(imgUrl, { headers: { "User-Agent": "ZenoGymDemo/1.0" } });
      if (!res.ok) {
        console.log("FAIL", cat.slug, imgUrl, res.status);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(dest, buf);
      manifest[cat.slug].push(`/images/products/${filename}`);
      saved++;
      console.log("OK", filename, buf.length, "bytes");
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }
  } catch (err) {
    console.log("ERROR", cat.slug, err.message);
  }
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Done.");
