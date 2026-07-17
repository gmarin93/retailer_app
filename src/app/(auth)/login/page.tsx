import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in" };

/**
 * Login — split brand panel + card, matching Angular `login-hud` language
 * (navy panel `rgb(44,62,79)` + primary glow + white form card).
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f4f6fb] p-4 md:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[20px] bg-white shadow-[0_12px_40px_rgba(17,24,39,0.14)] md:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden flex-col justify-between bg-[rgb(44,62,79)] p-10 text-white md:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(76,111,255,0.45),transparent_55%)]"
          />
          <div className="relative space-y-4">
            <Image
              src="/brand/logo.png"
              alt=""
              width={72}
              height={72}
              className="object-contain brightness-0 invert"
              priority
            />
            <h1 className="font-serif text-3xl font-bold tracking-wide">Powerhouse</h1>
            <p className="max-w-xs text-[15px] leading-relaxed text-white/80">
              Field execution, review, and planning for retail programs.
            </p>
          </div>
          <p className="relative text-xs text-white/50">Club Powerhouse</p>
        </div>

        <div className="flex flex-col justify-center gap-6 p-8 md:p-10">
          <div className="space-y-1 md:hidden">
            <Image
              src="/brand/logo.png"
              alt="Powerhouse"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-[22px] font-bold tracking-[-0.01em]">Sign in</h2>
            <p className="text-[13.5px] text-muted-foreground">
              Enter your Powerhouse account credentials.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
