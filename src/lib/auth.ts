import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string;
  /** Display name: full name if set, otherwise falls back to the email. */
  name: string;
  /** Raw full name as stored, empty string if the user never set one. */
  fullName: string;
  phone: string;
  company: string;
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
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const phone = (user.user_metadata?.phone as string | undefined) ?? "";
  const company = (user.user_metadata?.company as string | undefined) ?? "";
  const name = fullName || user.email || "";

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    fullName,
    phone,
    company,
    role,
  };
}
