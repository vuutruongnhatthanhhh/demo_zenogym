const REQUIRED_MAIL_ENV = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "ADMIN_EMAIL"] as const;

export function getMissingRequiredEnv(): string[] {
  return REQUIRED_MAIL_ENV.filter((key) => !process.env[key]);
}
