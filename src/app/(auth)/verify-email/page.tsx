import { Suspense } from "react";
import { VerifyEmailStatus } from "./verify-email-status";

export default function VerifyEmailPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Xác nhận email</h1>
      </div>
      <Suspense>
        <VerifyEmailStatus />
      </Suspense>
    </div>
  );
}
