import { redirect } from "next/navigation";

/**
 * `/` mirrors the Angular default route (`redirectTo: '/dashboard'`).
 * Role-specific landing happens after login in `useLogin`.
 */
export default function RootPage() {
  redirect("/dashboard");
}
