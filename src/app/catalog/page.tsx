import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAvailableProducts } from "@/lib/data/products";
import { CatalogClient } from "./catalog-client";

export default async function CatalogPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const products = await getAvailableProducts();

  return (
    <CatalogClient
      products={products}
      customerName={session.user.name ?? ""}
      customerEmail={session.user.email ?? ""}
      isAdmin={session.user.role === "admin"}
    />
  );
}
