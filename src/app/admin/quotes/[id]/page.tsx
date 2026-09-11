import { notFound } from "next/navigation";
import { getQuoteById } from "@/lib/data/quotes";
import { QuoteDetailClient } from "./quote-detail-client";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();

  return <QuoteDetailClient quote={quote} />;
}
