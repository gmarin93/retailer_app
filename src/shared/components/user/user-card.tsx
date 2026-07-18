"use client";

import { ArrowUpRight01Icon, Call02Icon, Cancel01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSession } from "@/features/auth/hooks";
import { canSeeUserNotes, canViewUserProfiles } from "@/features/auth/permissions";
import { formatUserRole, UserRole } from "@/features/auth/types";
import { useDetailedUser } from "@/features/users/hooks";
import { getUserDisplayInitials } from "@/shared/lib/user-initials";
import { cn } from "@/shared/lib/utils";
import type { ProfileUser } from "./types";

interface UserCardProps {
  user: ProfileUser;
  canClose?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * Profile summary card — Angular `app-user-card` twin.
 * Fetches detailed contact fields when opened.
 */
export function UserCard({ user, canClose = true, onClose, className }: UserCardProps) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const viewProfiles = canViewUserProfiles(role);
  const seeNotes = canSeeUserNotes(role);
  const detailQuery = useDetailedUser(user.id, viewProfiles);

  const detailed = detailQuery.data;
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  const initials = getUserDisplayInitials(user, viewProfiles);
  const showPhoto = viewProfiles && Boolean(user.avatar);
  const username = (user.username || "").replace(/^@/, "");
  const roleValue = (detailed?.role ?? user.role) as UserRole | string | null | undefined;
  const roleLabel =
    roleValue && Object.values(UserRole).includes(roleValue as UserRole)
      ? formatUserRole(roleValue as UserRole)
      : roleValue
        ? String(roleValue).replace(/_/g, " ")
        : "";
  const repNo = detailed?.rep_no ?? user.rep_no;
  const email = detailed?.email ?? user.email ?? null;
  const phone = detailed?.phone_number ?? user.phone_number ?? null;
  const notes = detailed?.notes ?? user.notes ?? null;

  return (
    <div
      role="dialog"
      aria-label={`User card: ${fullName || (username ? `@${username}` : "user")}`}
      className={cn(
        "relative w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-white text-slate-900/90 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_rgba(15,23,42,0.12)] dark:border-border dark:bg-card dark:text-foreground",
        className,
      )}
    >
      {canClose && (
        <button
          type="button"
          aria-label="Close user card"
          onClick={onClose}
          className="absolute top-2 right-2 z-[2] inline-flex size-7 items-center justify-center rounded-full bg-white/70 text-slate-900/60 backdrop-blur-[2px] transition hover:bg-slate-900/10 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35 dark:bg-background/70 dark:text-muted-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
        </button>
      )}

      <header className="flex items-center gap-4 border-b border-slate-900/[0.05] bg-linear-to-br from-[#fff8e1] to-[#fffaf2] px-[22px] pt-[22px] pb-[18px] dark:from-[#2a2418] dark:to-[#1f1c16]">
        <div className="shrink-0">
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar!}
              alt={fullName}
              className="size-[88px] rounded-full border-[3px] border-white object-cover shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
            />
          ) : (
            <div
              className="inline-flex size-[88px] items-center justify-center rounded-full border-[3px] border-white bg-[#fff4d1] text-[35px] font-bold text-[#a65111] shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
              aria-label={`User initials ${initials}`}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {viewProfiles && fullName && (
            <h3 className="m-0 truncate text-[17px] font-bold leading-tight text-slate-900 dark:text-foreground" title={fullName}>
              {fullName}
            </h3>
          )}
          {username && (
            <div className="mt-0.5 text-[13.5px] text-slate-900/60 dark:text-muted-foreground">
              @{username}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {roleLabel && (
              <span className="inline-flex items-center rounded-full bg-[rgba(76,111,255,0.12)] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#4c6fff] uppercase">
                {roleLabel}
              </span>
            )}
            {repNo != null && String(repNo) !== "" && (
              <span className="text-[12px] font-medium text-slate-900/55 dark:text-muted-foreground">
                Rep #{repNo}
              </span>
            )}
          </div>
        </div>
      </header>

      {viewProfiles && (
        <section className="flex flex-col gap-2 px-4 py-3.5">
          {detailQuery.isLoading && !detailed ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-muted" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-muted" />
            </div>
          ) : (
            <>
              <ContactRow
                kind="email"
                label="Email"
                value={email}
                href={email ? `mailto:${email}` : null}
              />
              <ContactRow
                kind="phone"
                label="Phone"
                value={phone}
                href={phone ? `tel:${phone}` : null}
              />
              {seeNotes && notes && (
                <div className="mt-1 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-900/75 dark:bg-muted dark:text-muted-foreground">
                  {notes}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function ContactRow({
  kind,
  label,
  value,
  href,
}: {
  kind: "email" | "phone";
  label: string;
  value: string | null | undefined;
  href: string | null;
}) {
  const empty = !value;
  const content = (
    <>
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
          kind === "email" ? "bg-[#eef2ff] text-[#4c6fff]" : "bg-[#ecfdf5] text-[#047857]",
        )}
      >
        <HugeiconsIcon
          icon={kind === "email" ? Mail01Icon : Call02Icon}
          size={18}
          strokeWidth={1.8}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-wide text-slate-900/45 uppercase dark:text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "block truncate text-[13.5px] font-medium",
            empty
              ? "text-slate-900/40 italic dark:text-muted-foreground"
              : "text-slate-900/88 dark:text-foreground",
          )}
        >
          {empty ? "Not provided" : value}
        </span>
      </span>
      {!empty && (
        <HugeiconsIcon
          icon={ArrowUpRight01Icon}
          size={16}
          strokeWidth={1.8}
          className="shrink-0 text-slate-900/35 dark:text-muted-foreground"
        />
      )}
    </>
  );

  if (empty || !href) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-2 py-2 opacity-80"
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/30 dark:hover:bg-muted"
      aria-label={`${label}: ${value}`}
    >
      {content}
    </a>
  );
}
