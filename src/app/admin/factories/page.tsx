import { getAllFactories } from "@/lib/data/factories";
import { FactoriesClient } from "./factories-client";

export default async function AdminFactoriesPage() {
  const factories = await getAllFactories();
  return <FactoriesClient initialFactories={factories} />;
}
