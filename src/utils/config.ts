import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  GUILD_ID: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing environment variables: ${missing}`);
  }
  return result.data;
}
