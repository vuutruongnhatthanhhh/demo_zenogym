"use client";

import { usePathname } from "next/navigation";

// The auth pages (login/forgot-password/reset-password) share one full-bleed
// split-screen layout with no room for a footer, so skip it there.
const HIDDEN_PREFIXES = ["/login", "/forgot-password", "/reset-password"];

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="border-t bg-white py-3 text-center text-xs text-black">
      Thiết kế:{" "}
      <a
        href="https://tjzenn.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary hover:underline"
      >
        TJZenn
      </a>
    </footer>
  );
}
