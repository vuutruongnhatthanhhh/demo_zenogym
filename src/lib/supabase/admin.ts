import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS, must only be imported from server-only code
// (API routes / route handlers), never from client components.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Thiếu cấu hình Supabase service role (SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
