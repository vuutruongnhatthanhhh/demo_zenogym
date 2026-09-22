import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface CurrentUser {
  id: string;
  /** Empty for username-based customer accounts, which have no real email. */
  email: string;
  /** Only set for username-based customer accounts. */
  username?: string;
  /**
   * Contact email shown on quote requests/contracts — editable, independent
   * of the login identity (which for username accounts isn't a real email).
   * Defaults to the real login email for email/Google accounts.
   */
  contactEmail: string;
  /** Display name: full name if set, otherwise falls back to username/email. */
  name: string;
  /** Raw full name as stored, empty string if the user never set one. */
  fullName: string;
  phone: string;
  company: string;
  address: string;
  role: UserRole;
  /** Only the account matching ADMIN_EMAIL can create/block other admins. */
  isSuperAdmin: boolean;
}

export function isSuperAdminEmail(email: string): boolean {
  const superAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!superAdminEmail && email.trim().toLowerCase() === superAdminEmail;
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
  const address = (user.user_metadata?.address as string | undefined) ?? "";
  // A username-based customer account has no real email — its Supabase Auth
  // email is a synthesized placeholder that must never be shown or reused as
  // a contact address.
  const username = (user.user_metadata?.username as string | undefined) || undefined;
  const email = username ? "" : (user.email ?? "");
  const contactEmail = (user.user_metadata?.contact_email as string | undefined) || email;
  const name = fullName || username || email || "";

  return {
    id: user.id,
    email,
    username,
    contactEmail,
    name,
    fullName,
    phone,
    company,
    address,
    role,
    isSuperAdmin: isSuperAdminEmail(user.email ?? ""),
  };
}
