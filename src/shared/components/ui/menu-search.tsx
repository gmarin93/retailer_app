"use client";

import * as React from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/shared/lib/utils";

export interface MenuFilterContextValue {
  query: string;
  setQuery: (query: string) => void;
  /** When false, items ignore the filter (search UI hidden). */
  enabled: boolean;
}

const MenuFilterContext = React.createContext<MenuFilterContextValue>({
  query: "",
  setQuery: () => {},
  enabled: false,
});

export function useMenuFilter() {
  return React.useContext(MenuFilterContext);
}

/** Flatten React children to a searchable string. */
export function getNodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join(" ");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return getNodeText(props.children);
  }
  return "";
}

export function matchesMenuFilter(
  query: string,
  ...candidates: Array<string | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return candidates.some((candidate) => (candidate ?? "").toLowerCase().includes(q));
}

export function MenuFilterProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [query, setQuery] = React.useState("");
  const value = React.useMemo(
    () => ({ query: enabled ? query : "", setQuery, enabled }),
    [enabled, query],
  );
  return <MenuFilterContext.Provider value={value}>{children}</MenuFilterContext.Provider>;
}

/** Sticky search field for Select / DropdownMenu panels. */
export function MenuSearchInput({
  placeholder = "Search…",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const { query, setQuery, enabled } = useMenuFilter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      data-slot="menu-search"
      className={cn("sticky top-0 z-20 border-b border-border bg-popover p-2", className)}
      onPointerDown={(event) => {
        // Keep the menu open when interacting with the search chrome, but do not
        // preventDefault on the input itself — that blocks caret/focus.
        if (event.target === inputRef.current) return;
        event.preventDefault();
      }}
    >
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-8 w-full rounded-md border border-input bg-card py-1 pr-2 pl-8 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDownCapture={(event) => {
            // Capture phase: Radix typeahead listens on the content and steals focus.
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape" && query) {
              event.preventDefault();
              setQuery("");
            }
          }}
          onKeyUp={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}

/** Shown when the filter is active and the parent has no matching items. */
export function MenuSearchEmpty({ label = "No results" }: { label?: string }) {
  const { query, enabled } = useMenuFilter();
  if (!enabled || !query.trim()) return null;
  return (
    <div data-slot="menu-search-empty" className="px-2 py-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
