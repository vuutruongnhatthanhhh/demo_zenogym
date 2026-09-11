import { Dumbbell, ShieldCheck, FileText, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Dumbbell, text: "Catalog thiết bị tập gym đầy đủ, cập nhật liên tục" },
  { icon: FileText, text: "Gửi yêu cầu báo giá và nhận PDF chi tiết nhanh chóng" },
  { icon: ShieldCheck, text: "Tài khoản được bảo mật, xác thực qua email" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-blue-700 to-slate-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-400 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xl font-bold">
          <Dumbbell className="h-6 w-6" />
          ZenoGym
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
            <Sparkles className="h-4 w-4" />
            Nền tảng báo giá thiết bị gym
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            Trang bị phòng gym của bạn với thiết bị chất lượng, giá tốt nhất
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-blue-50">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-200/80">
          © {new Date().getFullYear()} ZenoGym. Thiết bị tập gym chuyên nghiệp.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
