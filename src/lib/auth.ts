import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/types";

interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}

// Hardcoded on purpose (not in .env): Next's env loader runs values through
// dotenv-expand, which treats bare "$word" sequences as variable references
// and mangles bcrypt hashes (which are full of "$"-delimited segments).
const DEMO_PASSWORD_HASH = "$2b$10$M/EtgT3ISFwQ4HfMPJL32eBO5rkNsj7H7slKrQx1MiNtohZQHKQJe"; // 123456

function getUsers(): DemoUser[] {
  return [
    {
      id: "admin-1",
      email: (process.env.ADMIN_EMAIL ?? "").toLowerCase(),
      name: "Quản trị viên ZenoGym",
      role: "admin",
      passwordHash: DEMO_PASSWORD_HASH,
    },
    {
      id: "customer-1",
      email: (process.env.CUSTOMER_EMAIL ?? "").toLowerCase(),
      name: "Khách hàng",
      role: "customer",
      passwordHash: DEMO_PASSWORD_HASH,
    },
  ];
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const user = getUsers().find((u) => u.email === email);
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
};
