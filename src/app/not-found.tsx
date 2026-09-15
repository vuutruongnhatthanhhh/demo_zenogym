import Link from "next/link";
import { Dumbbell, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Dumbbell className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tight text-primary">404</h1>
        <p className="text-lg font-medium text-foreground">Không tìm thấy trang</p>
        <p className="text-sm text-muted-foreground">
          Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="h-4 w-4" />
          Về trang chủ
        </Link>
      </Button>
    </div>
  );
}
