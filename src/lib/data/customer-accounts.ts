import { createAdminClient } from "@/lib/supabase/admin";

export interface CustomerAccount {
  id: string;
  /** Username for accounts created here; empty for older email/Google accounts. */
  username: string;
  /** Real email for Google/legacy email accounts; empty for username accounts. */
  email: string;
  fullName: string;
  phone: string;
  address: string;
  createdAt: string;
  isBlocked: boolean;
}

function mapCustomerAccount(user: {
  id: string;
  email?: string;
  created_at: string;
  user_metadata?: Record<string, unknown>;
  banned_until?: string | null;
}): CustomerAccount {
  const bannedUntil = user.banned_until ? new Date(user.banned_until).getTime() : 0;
  const username = (user.user_metadata?.username as string | undefined) || "";
  return {
    id: user.id,
    username,
    email: username ? "" : user.email ?? "",
    fullName: (user.user_metadata?.full_name as string | undefined) || "",
    phone: (user.user_metadata?.phone as string | undefined) || "",
    address: (user.user_metadata?.address as string | undefined) || "",
    createdAt: user.created_at,
    isBlocked: bannedUntil > Date.now(),
  };
}

// Every account defaults to "customer" (see migration 0002), so admins are
// just the small subset with app_metadata.role === 'admin' — page through
// everyone once and filter out admins, same approach as listAdminAccounts.
export async function listCustomerAccounts(): Promise<CustomerAccount[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users
    .filter((u) => u.app_metadata?.role !== "admin")
    .map(mapCustomerAccount)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

const BAN_FOREVER_DURATION = "876000h"; // ~100 years

export async function setCustomerAccountBlocked(id: string, blocked: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: blocked ? BAN_FOREVER_DURATION : "none",
  });
  if (error) throw error;
}

export async function resetCustomerAccountPassword(id: string, password: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw error;
}
