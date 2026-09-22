// Series is the leading non-digit prefix of a product's model — e.g.
// "F12A" -> "F", "F10" -> "F", "SYT-DP214" -> "SYT-DP", "SQ7017" -> "SQ".
// A model that starts straight with a digit (e.g. "1020", "360B",
// "8400-2") has no meaningful series, so this returns "" for those.
export function deriveSeriesFromModel(model: string): string {
  const trimmed = model.trim();
  const match = trimmed.match(/^[^\d]+/);
  if (!match) return "";
  return match[0].replace(/[-\s]+$/, "");
}
