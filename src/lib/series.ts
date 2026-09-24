// Some single-letter series bucket far too many unrelated models together
// (e.g. dozens of "A..." models spanning different product lines) — for
// those, split one level deeper using the digit right after the letter
// ("A7013" -> "A7", "A8055" -> "A8", "A9101" -> "A9") instead of collapsing
// everything into "A". Add more letters here if the same problem shows up
// elsewhere.
const DEEP_SPLIT_SERIES = new Set(["A"]);

// Series is the leading non-digit prefix of a product's model — e.g.
// "F12A" -> "F", "F10" -> "F", "SYT-DP214" -> "SYT-DP", "SQ7017" -> "SQ".
// A model that starts straight with a digit (e.g. "1020", "360B",
// "8400-2") has no meaningful series, so this returns "" for those.
export function deriveSeriesFromModel(model: string): string {
  const trimmed = model.trim();
  const match = trimmed.match(/^[^\d]+/);
  if (!match) return "";
  const base = match[0].replace(/[-\s]+$/, "");

  if (DEEP_SPLIT_SERIES.has(base)) {
    const nextDigit = trimmed.slice(match[0].length).match(/^\d/);
    if (nextDigit) return base + nextDigit[0];
  }

  return base;
}
