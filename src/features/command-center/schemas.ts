import { z } from "zod";

export const pendingByClientEntrySchema = z.object({
  customer_id: z.number(),
  customer_title: z.string(),
  visits_count: z.number(),
});

export const pendingByClientResponseSchema = z.looseObject({
  cycle_title: z.string().catch(""),
  entries: z.array(pendingByClientEntrySchema),
});

export type PendingByClientEntry = z.infer<typeof pendingByClientEntrySchema>;
