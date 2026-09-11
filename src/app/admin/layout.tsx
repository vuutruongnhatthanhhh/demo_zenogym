import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
