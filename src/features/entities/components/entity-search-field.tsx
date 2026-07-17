"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useEntitySearch } from "../hooks";
import type { ListableEntityLite } from "../schemas";

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface EntitySearchFieldProps {
  route: "stores" | "customers" | "retailers" | "users" | "programs";
  value: ListableEntityLite | null;
  onChange: (value: ListableEntityLite | null) => void;
  formatOption: (item: ListableEntityLite) => string;
  formatSelected: (item: ListableEntityLite) => string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Extra query params (e.g. `customer__id__in` for programs). */
  extraParams?: Record<string, string | number | undefined>;
  className?: string;
  "aria-label"?: string;
}

/**
 * Debounced v2 entity typeahead (Angular `*SearchFieldV2` twin). Selection is
 * an entity object; clearing the input clears the selection.
 *
 * Parents should remount via `key={value?.id ?? "empty"}` when the selected
 * entity is replaced from outside so the input text stays in sync.
 */
export function EntitySearchField({
  route,
  value,
  onChange,
  formatOption,
  formatSelected,
  placeholder = "Search…",
  disabled,
  required,
  extraParams,
  className,
  "aria-label": ariaLabel,
}: EntitySearchFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(() => (value ? formatSelected(value) : ""));
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(text, 300);
  const searching = open && (!value || text !== formatSelected(value));
  const query = useEntitySearch(route, debounced, searching, extraParams);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const results = query.data ?? [];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={text}
        disabled={disabled}
        required={required && !value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setOpen(true);
          if (value && next !== formatSelected(value)) onChange(null);
          if (!next) onChange(null);
        }}
      />
      {open && searching && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md"
        >
          {query.isFetching && (
            <li className="px-3 py-2 text-muted-foreground">Searching…</li>
          )}
          {!query.isFetching && results.length === 0 && debounced.trim() && (
            <li className="px-3 py-2 text-muted-foreground">No matches</li>
          )}
          {results.map((item) => (
            <li key={item.id} role="option" aria-selected={value?.id === item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => {
                  onChange(item);
                  setText(formatSelected(item));
                  setOpen(false);
                }}
              >
                {formatOption(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function formatUserOption(item: ListableEntityLite): string {
  const name = [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
  return name || item.username || `User #${item.id}`;
}

export function formatUserSelected(item: ListableEntityLite): string {
  return formatUserOption(item);
}

export function formatCustomerOption(item: ListableEntityLite): string {
  return `${item.title ?? "?"} (${item.code ?? item.id})`;
}

export function formatCustomerSelected(item: ListableEntityLite): string {
  return String(item.code ?? item.title ?? item.id);
}

export function formatRetailerOption(item: ListableEntityLite): string {
  return formatCustomerOption(item);
}

export function formatRetailerSelected(item: ListableEntityLite): string {
  return formatCustomerSelected(item);
}

export function formatStoreOption(item: ListableEntityLite): string {
  const retailer = item.retailer?.title ?? "?";
  return `${retailer} #${item.store_no ?? "?"} — ${item.title ?? "?"} (${item.code ?? item.id})`;
}

export function formatStoreSelected(item: ListableEntityLite): string {
  return `#${item.store_no ?? "?"} ${item.code ?? item.id}`;
}

export function formatProgramOption(item: ListableEntityLite): string {
  const customer = item.customer?.title ?? "?";
  return `${customer}: ${item.title ?? "?"} (${item.code ?? item.id})`;
}

export function formatProgramSelected(item: ListableEntityLite): string {
  return String(item.code ?? item.title ?? item.id);
}
