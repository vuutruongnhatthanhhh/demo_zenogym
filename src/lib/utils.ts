import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // Without this, formatting falls back to the server's local timezone —
    // fine on a Vietnam-based dev machine, but Vercel's servers run in UTC,
    // which shifted every displayed time by 7 hours in production.
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
}

// Only allow same-app relative paths for post-login redirects — a bare "/"
// prefix check alone still lets "//evil.com" through (browsers treat that
// as protocol-relative), so reject that case explicitly.
export function isSafeRedirectPath(path: string | null): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
