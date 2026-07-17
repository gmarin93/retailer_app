export type PaletteGroup =
  | "Recent"
  | "Pages"
  | "Actions"
  | "Jobs"
  | "Plans"
  | "Stores"
  | "Reps"
  | "Customers"
  | "Retailers"
  | "Programs"
  | "Cycles";

export interface PaletteItem {
  id: string;
  group: PaletteGroup;
  title: string;
  subtitle?: string;
  href?: string;
  action?: "logout";
}

export interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}
