import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Uses getUser() (not getSession()) because it revalidates the token against
// Supabase Auth instead of trusting the locally-decoded cookie.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.app_metadata?.role as UserRole | undefined) ?? "customer";
  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "";

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    role,
  };
}
