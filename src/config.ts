import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { config as loadEnv } from "dotenv";

// Load .env file into process.env
loadEnv();

/**
 * Recursively interpolate ${VAR} patterns in strings using process.env.
 * If the var is unset, the placeholder is left as-is.
 */
function interpolateEnv(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/\$\{(\w+)\}/g, (_match, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        console.error(
          `[config] Warning: environment variable ${varName} is not set, leaving placeholder.`
        );
        return `${varName}`; // Return the inner name so it's obvious
      }
      return envValue;
    });
  }
  if (Array.isArray(value)) {
    return value.map(interpolateEnv);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateEnv(val);
    }
    return result;
  }
  return value;
}

const ServerConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

const ConfigSchema = z.object({
  servers: z.record(z.string(), ServerConfigSchema).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function loadConfig(path: string): Config {
  if (!existsSync(path)) {
    console.error(`[config] Config file not found at ${path}, starting with empty config.`);
    return { servers: {} };
  }
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const interpolated = interpolateEnv(raw);
  return ConfigSchema.parse(interpolated);
}
