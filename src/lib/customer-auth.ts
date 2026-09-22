// Customer accounts log in with a plain username/password — no email
// required. Supabase Auth still needs an email-shaped identifier under the
// hood, so we synthesize one from the username and keep the real username in
// user_metadata for display/login-lookup. This file has no server-only
// imports so it can be shared by client components (login/register forms)
// and server code (registration route, getCurrentUser) alike.

export const CUSTOMER_USERNAME_DOMAIN = "customer.zenogym.internal";

export const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,32}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${CUSTOMER_USERNAME_DOMAIN}`;
}
