import { z } from "zod";

export const ACCESS_LEVELS = ["Owner", "Manager", "Supervisor"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const RESOURCE_BY_LEVEL: Record<AccessLevel, string> = {
  Owner: "customer_account_owners",
  Manager: "customer_account_managers",
  Supervisor: "customer_account_supervisors",
};

export const customerVisitMatchSchema = z.looseObject({
  id: z.union([z.number(), z.string()]),
  customer: z.union([z.number(), z.string()]),
  user: z.union([z.number(), z.string()]).optional(),
});

export type CustomerVisitMatch = z.infer<typeof customerVisitMatchSchema>;

export interface CustomerVisitRow {
  id: number;
  customerTitle: string;
}

export const listableUserSchema = z.looseObject({
  id: z.number(),
  username: z.string().catch(""),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  rep_no: z.union([z.string(), z.number()]).nullish(),
});

export type ListableUser = z.infer<typeof listableUserSchema>;
