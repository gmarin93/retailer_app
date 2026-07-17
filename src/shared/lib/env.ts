import { z } from "zod";

/**
 * Typed, boot-validated environment configuration.
 *
 * `NEXT_PUBLIC_*` variables are inlined at build time, so each one must be
 * referenced literally below (no dynamic lookup). An invalid or missing value
 * fails fast at startup instead of surfacing as a broken request later.
 */
const booleanFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  /** Django REST API root, e.g. https://api.powerhousers.com/api */
  apiHost: z.url(),
  /** DRF token auth root, e.g. https://api.powerhousers.com/api/v0/rest-auth */
  authUrl: z.url(),
  /** Klikin AI assistant (FastAPI). Optional until that feature is migrated. */
  assistantHost: z.url().optional(),
  featureFlags: z.object({
    commandCenter: booleanFlag,
    proofOfExecution: booleanFlag,
  }),
});

export const env = envSchema.parse({
  apiHost: process.env.NEXT_PUBLIC_API_HOST,
  authUrl: process.env.NEXT_PUBLIC_AUTH_URL,
  assistantHost: process.env.NEXT_PUBLIC_ASSISTANT_HOST || undefined,
  featureFlags: {
    commandCenter: process.env.NEXT_PUBLIC_FLAG_COMMAND_CENTER,
    proofOfExecution: process.env.NEXT_PUBLIC_FLAG_PROOF_OF_EXECUTION,
  },
});

export type Env = typeof env;
