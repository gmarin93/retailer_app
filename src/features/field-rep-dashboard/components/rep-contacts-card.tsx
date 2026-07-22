"use client";

import { useState } from "react";
import { Mail01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { LoadingState } from "@/shared/components/loading-state";
import { useRepContacts } from "../hooks";
import type { RepContact } from "../schemas";

function contactInitials(contact: RepContact): string {
  const f = contact.first_name?.[0] ?? "";
  const l = contact.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function contactName(contact: RepContact): string {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";
}

const AVATAR_COLORS = ["#4B6AFF", "#5275FF", "#7B5EA7", "#2E7D8C", "#5C6BC0"];

function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]!;
}

function ContactCard({ contact }: { contact: RepContact }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatar = contact.avatar && !avatarFailed;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: avatarColor(contact.id) }}
      >
        {showAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.avatar!}
            alt={contactName(contact)}
            className="size-10 rounded-full object-cover"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          contactInitials(contact)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{contactName(contact)}</p>
        {contact.role && (
          <p className="truncate text-xs text-muted-foreground capitalize">
            {contact.role.replace(/_/g, " ")}
          </p>
        )}
      </div>
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Email ${contactName(contact)}`}
          onClick={(e) => e.stopPropagation()}
        >
          <HugeiconsIcon icon={Mail01Icon} className="size-4" />
        </a>
      )}
    </div>
  );
}

export function RepContactsCard() {
  const { data: contacts = [], isLoading } = useRepContacts();
  const [search, setSearch] = useState("");

  const filtered = search
    ? contacts.filter((c) =>
        contactName(c).toLowerCase().includes(search.toLowerCase()),
      )
    : contacts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isLoading ? (
          <LoadingState label="Loading contacts…" className="py-8" />
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No contacts found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
