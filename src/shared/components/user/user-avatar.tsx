"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/features/auth/hooks";
import { canViewUserProfiles } from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { getUserDisplayInitials } from "@/shared/lib/user-initials";
import { cn } from "@/shared/lib/utils";
import type { ProfileUser } from "./types";
import { UserCard } from "./user-card";

interface UserAvatarProps {
  user: ProfileUser;
  /** Pixel diameter (default 32 to match jobs list). */
  size?: number;
  /** Prefer opening the card to the left (e.g. near the right edge). */
  preferOpenLeft?: boolean;
  className?: string;
  /** Disable the hover/tap profile card. */
  disableCard?: boolean;
}

/**
 * Photo / initials avatar with Angular-style hover (or tap) profile card.
 * Use anywhere a user photo appears so the card is consistent app-wide.
 */
export function UserAvatar({
  user,
  size = 32,
  preferOpenLeft = false,
  className,
  disableCard = false,
}: UserAvatarProps) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const viewProfiles = canViewUserProfiles(role);
  const showPhoto = viewProfiles && Boolean(user.avatar);
  const initials = getUserDisplayInitials(user, viewProfiles);
  const initialsFontSize = Math.round(size * 0.42);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const originRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const cardId = useId();

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openCard = () => {
    clearCloseTimer();
    const el = originRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cardWidth = Math.min(360, window.innerWidth - 24);
    const gap = 8;
    let left = preferOpenLeft ? rect.left - cardWidth - gap : rect.right + gap;
    if (left + cardWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - cardWidth - gap);
    }
    if (left < 12) left = 12;
    let top = rect.top;
    const estimatedHeight = 260;
    if (top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - estimatedHeight - 12);
    }
    setCoords({ top, left });
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 120);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={originRef}
        type="button"
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/40",
          className,
        )}
        style={{ width: size, height: size }}
        aria-label={
          showPhoto
            ? `User ${user.first_name || ""} ${user.last_name || ""}`.trim() || "User photo"
            : `User initials ${initials}`
        }
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        onMouseEnter={() => {
          if (!disableCard) openCard();
        }}
        onMouseLeave={() => {
          if (!disableCard) scheduleClose();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (disableCard) return;
          if (open) setOpen(false);
          else openCard();
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar!}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            className="inline-flex size-full items-center justify-center bg-[#fff4d1] font-bold text-[#a65111]"
            style={{ fontSize: initialsFontSize }}
          >
            {initials}
          </span>
        )}
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={cardId}
            className="fixed z-[80]"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            onClick={(event) => event.stopPropagation()}
          >
            <UserCard user={user} onClose={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  );
}
