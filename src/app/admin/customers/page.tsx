import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCustomerAccounts } from "@/lib/data/customer-accounts";
import { CustomersClient } from "./customers-client";

export default async function AdminCustomersPage() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) redirect("/admin");

  const customers = await listCustomerAccounts();
  return <CustomersClient initialCustomers={customers} />;
}
