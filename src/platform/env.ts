import { z } from "zod";

/**
 * Environment configuration.
 *
 * Validated once, at the point of first use, against an explicit schema. The
 * application never falls back to demo data or guesses a value: a malformed
 * variable is a startup failure with a readable message.
 *
 * Database variables are optional at this milestone because no feature reads
 * the database yet. They are required through `requireDatabaseEnv()` wherever
 * a database client is created, and they become mandatory at boot in
 * Milestone 2. docs/VSHARES_ARCHITECTURE.md section 8.
 */

/**
 * A URL that a browser can actually fetch. `new URL()` accepts things like
 * "localhost:54321" as a valid URL with scheme "localhost:", so the protocol
 * is checked explicitly.
 */
const httpUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "must be an http or https URL" },
  );

const booleanish = z
  .enum(["true", "false", "1", "0", ""])
  .transform((value) => value === "true" || value === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: httpUrl.default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: httpUrl.optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  DEV_TOOLS_ENABLED: booleanish.optional(),
});

export type Env = z.infer<typeof schema>;

/** Any source of raw variables: `process.env`, or a plain object in tests. */
export type EnvSource = Record<string, string | undefined>;

/** Treats empty strings as absent, so a blank line in a template is not a value. */
function readRawEnv(source: EnvSource): Record<string, string> {
  const keys = Object.keys(schema.shape);
  const raw: Record<string, string> = {};

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim() !== "") {
      raw[key] = value;
    }
  }

  return raw;
}

export function parseEnv(source: EnvSource): Env {
  const result = schema.safeParse(readRawEnv(source));

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration. Fix these variables (see .env.example):\n${details}`,
    );
  }

  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** For tests only: forget the memoised value. */
export function resetEnvCache(): void {
  cached = undefined;
}

export type DatabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Database configuration, or a clear failure. Called by the database clients,
 * never by feature code, so a missing variable surfaces at the boundary that
 * needs it rather than as a confusing downstream error.
 */
export function requireDatabaseEnv(): DatabaseEnv {
  const env = getEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Database configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "(run `npm run db:start` for local values). See .env.example.",
    );
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function requireServiceRoleKey(): string {
  const env = getEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this operation but is not set.");
  }

  return env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Whether the database and auth service are configured.
 *
 * Used to show an honest "unavailable" state rather than a crash, and to
 * mark the environment as not ready. It is never used to substitute demo
 * data for real data.
 */
export function isDatabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

/** The component gallery and other developer routes are never served in production. */
export function areDevToolsEnabled(): boolean {
  const env = getEnv();
  return env.DEV_TOOLS_ENABLED ?? env.NODE_ENV !== "production";
}
