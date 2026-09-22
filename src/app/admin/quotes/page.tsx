import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getAllQuotes } from "@/lib/data/quotes";
import { getOrCreateQuoteCodeForAdmin } from "@/lib/data/quote-codes";
import { QuoteCodesPanel } from "./quote-codes-panel";
import { QuotesListClient } from "./quotes-list-client";

export default async function AdminQuotesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const [quotes, quoteCode] = await Promise.all([
    getAllQuotes(user.id, user.isSuperAdmin),
    getOrCreateQuoteCodeForAdmin(user.id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Yêu cầu báo giá</h1>
          <p className="text-sm text-muted-foreground">{quotes.length} yêu cầu bạn có thể xem</p>
        </div>
        <Button asChild>
          <Link href="/admin/quotes/new">
            <Plus className="mr-1 h-4 w-4" /> Tạo báo giá nhanh
          </Link>
        </Button>
      </div>

      <QuoteCodesPanel code={quoteCode.code} siteUrl={process.env.NEXT_PUBLIC_URL ?? ""} />

      <QuotesListClient initialQuotes={quotes} />
    </div>
  );
}
