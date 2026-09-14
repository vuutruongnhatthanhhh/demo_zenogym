import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAdminAccounts } from "@/lib/data/admin-accounts";
import { AccountsClient } from "./accounts-client";

export default async function AdminAccountsPage() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) redirect("/admin");

  const accounts = await listAdminAccounts();
  return <AccountsClient initialAccounts={accounts} currentUserId={user.id} />;
}
