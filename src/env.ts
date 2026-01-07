import { z } from "zod";

/**
 * Environment variable schema for the Quote Agent application.
 * This schema validates required environment variables at application startup.
 * If any required variable is missing, the application will throw a clear error.
 */
const envSchema = z.object({
  /**
   * OpenAI API Key - Required for Mastra AI agents
   * Get your key from: https://platform.openai.com/api-keys
   */
  OPENAI_API_KEY: z
    .string()
    .min(
      1,
      "OPENAI_API_KEY is required. Get your key from https://platform.openai.com/api-keys"
    ),

  /**
   * Convex Deployment URL - Optional in development (auto-detected)
   * Required in production deployments
   */
  CONVEX_DEPLOYMENT: z.string().optional(),

  /**
   * Vite mode - Injected by Vite build system
   */
  MODE: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

/**
 * Parsed and validated environment variables.
 * Import this object to access typed environment variables throughout the app.
 *
 * @example
 * ```ts
 * import { env } from '@/env';
 * console.log(env.OPENAI_API_KEY);
 * ```
 */
function validateEnv() {
  // In browser environment, we need to access import.meta.env (Vite)
  const envVars =
    typeof import.meta !== "undefined" && import.meta.env
      ? {
          OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
          CONVEX_DEPLOYMENT: import.meta.env.VITE_CONVEX_DEPLOYMENT,
          MODE: import.meta.env.MODE,
        }
      : process.env;

  const result = envSchema.safeParse(envVars);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");

    throw new Error(
      `\n❌ Invalid environment variables:\n${errorMessages}\n\nPlease check your .env file or environment configuration.\nSee .env.example for required variables.\n`
    );
  }

  return result.data;
}

export const env = validateEnv();

/**
 * Type-safe environment variable type.
 * Use this type when you need to reference the env shape in other modules.
 */
export type Env = z.infer<typeof envSchema>;
