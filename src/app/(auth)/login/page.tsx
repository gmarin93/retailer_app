import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in" };

/** Semantic app version shown on the brand panel (Angular `APP_VERSION`). */
const APP_VERSION = "1.0.0";

/**
 * Login — visual twin of Angular `login-hud`: soft bokeh background,
 * split brand/form card, icon fields, primary CTA.
 */
export default function LoginPage() {
  return (
    <div className="relative min-h-dvh w-full">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(1200px_620px_at_18%_8%,#e8ecf9,#f4f6fb_62%)]">
        <span
          aria-hidden="true"
          className="absolute top-[-130px] left-[-90px] size-[420px] rounded-full bg-[rgba(76,111,255,0.22)] blur-[80px]"
        />
        <span
          aria-hidden="true"
          className="absolute right-[-160px] bottom-[-180px] size-[500px] rounded-full bg-[rgba(106,127,212,0.16)] blur-[80px]"
        />
      </div>

      <div className="box-border flex min-h-dvh w-full items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-[940px] flex-col overflow-hidden rounded-[20px] border border-[#e6ebf3] bg-white shadow-[0_24px_70px_rgba(17,24,39,0.16)] min-[861px]:flex-row">
          {/* Brand panel */}
          <section className="relative flex min-w-[260px] flex-col items-center justify-center bg-[linear-gradient(160deg,#354a5e,#1f2d3a)] px-6 py-[34px] text-center text-white/95 min-[861px]:w-[42%] min-[861px]:shrink-0 min-[861px]:px-9 min-[861px]:py-11">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(440px_240px_at_50%_0%,rgba(76,111,255,0.34),transparent_70%)]"
            />
            <div className="relative flex flex-col items-center gap-3.5">
              <Image
                src="/brand/logo-white.png"
                alt="Club Powerhouse logo"
                width={104}
                height={104}
                className="size-[84px] object-contain min-[861px]:size-[104px]"
                priority
              />
              <h1 className="m-0 text-2xl font-semibold tracking-[0.5px] text-white/[0.97]">
                Club Powerhouse
              </h1>
              <p className="m-0 text-[13px] font-normal text-white/62">
                Retail services management
              </p>
            </div>
            <div className="relative mt-4 text-center text-[11px] tracking-[2px] text-white/45 uppercase min-[861px]:absolute min-[861px]:right-0 min-[861px]:bottom-[18px] min-[861px]:left-0 min-[861px]:mt-0">
              v{APP_VERSION}
            </div>
          </section>

          {/* Form panel */}
          <section className="box-border flex min-w-0 flex-1 flex-col justify-center px-7 py-8 min-[861px]:min-w-[300px] min-[861px]:px-12 min-[861px]:pt-12 min-[861px]:pb-11">
            <header className="mb-7">
              <h2 className="m-0 mb-1.5 text-2xl font-bold tracking-[-0.01em] text-[#121212]">
                Welcome back
              </h2>
              <p className="m-0 text-sm text-[#6b7a99]">
                Sign in to continue to your dashboard
              </p>
            </header>
            <LoginForm />
          </section>
        </div>
      </div>
    </div>
  );
}
