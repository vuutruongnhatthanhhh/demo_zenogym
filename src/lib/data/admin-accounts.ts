import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminAccount {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  isBlocked: boolean;
}

function mapAdminAccount(user: {
  id: string;
  email?: string;
  created_at: string;
  user_metadata?: Record<string, unknown>;
  banned_until?: string | null;
}): AdminAccount {
  const bannedUntil = user.banned_until ? new Date(user.banned_until).getTime() : 0;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string | undefined) || "",
    createdAt: user.created_at,
    isBlocked: bannedUntil > Date.now(),
  };
}

// Every account is "customer" by default; admins are the (small) subset
// with app_metadata.role === 'admin', so we page through everyone once and
// filter client-side rather than adding a dedicated DB table just for this.
export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users
    .filter((u) => u.app_metadata?.role === "admin")
    .map(mapAdminAccount)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface CreateAdminAccountInput {
  fullName: string;
  email: string;
  password: string;
}

export async function createAdminAccount(input: CreateAdminAccountInput): Promise<AdminAccount> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
    app_metadata: { role: "admin" },
  });
  if (error) throw error;
  return mapAdminAccount(data.user);
}

const BAN_FOREVER_DURATION = "876000h"; // ~100 years

export async function setAdminAccountBlocked(id: string, blocked: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: blocked ? BAN_FOREVER_DURATION : "none",
  });
  if (error) throw error;
}
