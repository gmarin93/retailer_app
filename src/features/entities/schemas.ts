import { z } from "zod";

/** Lightweight titled entity used by bulk-logo / priority search. */
export const listableEntityLiteSchema = z.looseObject({
  id: z.number(),
  code: z.string().nullish().catch(null),
  title: z.string().nullish().catch(""),
  store_no: z.union([z.string(), z.number()]).nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  username: z.string().nullish(),
  avatar: z.string().nullish(),
  retailer: z
    .looseObject({
      title: z.string().nullish(),
    })
    .nullish(),
  customer: z
    .looseObject({
      id: z.number(),
      title: z.string().nullish(),
    })
    .nullish(),
});

export type ListableEntityLite = z.infer<typeof listableEntityLiteSchema>;

const nestedUserSchema = z.looseObject({
  id: z.number(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  username: z.string().nullish(),
});

const nestedCustomerSchema = z.looseObject({
  id: z.number(),
  title: z.string().nullish(),
  code: z.string().nullish(),
});

const nestedProgramSchema = z.looseObject({
  id: z.number(),
  title: z.string().nullish(),
  code: z.string().nullish(),
  customer: nestedCustomerSchema.nullish(),
  retailer: z.looseObject({ title: z.string().nullish() }).nullish(),
});

export const storeUserPrioritySchema = z.looseObject({
  id: z.union([z.number(), z.array(z.number())]).optional(),
  priority: z.number().optional(),
  user: nestedUserSchema,
  customer: nestedCustomerSchema.nullish(),
  program: nestedProgramSchema.nullish(),
});

export const detailedStoreSchema = z.looseObject({
  id: z.number(),
  title: z.string().nullish().catch(""),
  code: z.string().nullish(),
  store_no: z.union([z.string(), z.number()]).nullish(),
  avatar: z.string().nullish(),
  retailer: z
    .looseObject({
      title: z.string().nullish(),
    })
    .nullish(),
  user_priorities: z.array(storeUserPrioritySchema).catch([]),
});

export type DetailedStore = z.infer<typeof detailedStoreSchema>;

export const storeSetUserPrioritiesRequestSchema = z.object({
  entries: z.array(
    z.object({
      user: z.number(),
      customer: z.number().nullable().optional(),
      program: z.number().nullable().optional(),
    }),
  ),
});

export type StoreSetUserPrioritiesRequest = z.infer<
  typeof storeSetUserPrioritiesRequestSchema
>;

export type BulkLogoEntityKind = "store" | "retailer" | "customer";
