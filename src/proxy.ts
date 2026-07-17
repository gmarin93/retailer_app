import { NextResponse } from "next/server";

/**
 * Edge proxy scaffold (Next 16's successor to `middleware.ts`).
 *
 * Authentication is currently enforced client-side (`RequireAuth`) because the
 * session token lives in localStorage — the exact security posture of the
 * Angular app being replaced. Once the backend issues httpOnly cookie sessions
 * (see MIGRATION_PLAN.md, "Auth hardening"), this proxy becomes the place to
 * check the cookie and redirect unauthenticated users before any HTML is
 * served.
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  // Skip static assets and images; run on application routes only.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
