export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listCustomerAccounts } from "@/lib/data/customer-accounts";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  return NextResponse.json({ accounts: await listCustomerAccounts() });
}
