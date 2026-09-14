import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import { getTransporter, MAIL_FROM } from "@/lib/mailer";

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

async function renderTemplate(name: string, context: Record<string, unknown>) {
  let template = templateCache.get(name);
  if (!template) {
    const filePath = path.join(process.cwd(), "emails", `${name}.hbs`);
    const source = await fs.readFile(filePath, "utf-8");
    template = Handlebars.compile(source);
    templateCache.set(name, template);
  }
  return template(context);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const subject = "Đặt lại mật khẩu tài khoản ZenoGym";
  const html = await renderTemplate("reset-password", {
    subject,
    preheader: "Yêu cầu đặt lại mật khẩu cho tài khoản ZenoGym của bạn.",
    name,
    resetUrl,
    year: new Date().getFullYear(),
  });

  await getTransporter().sendMail({ from: MAIL_FROM, to, subject, html });
}
