import { resolve } from "path";
import { watch } from "fs";
import { Gateway } from "./gateway.js";
import { startAdminApi } from "./admin.js";
import { loadConfig } from "./config.js";

const CONFIG_PATH = resolve(process.env.CONFIG_PATH || "./mcp-servers.json");
const ADMIN_PORT = Number(process.env.ADMIN_PORT) || 51337;

async function main() {
  const gateway = new Gateway();

  /* Start admin HTTP API */
  startAdminApi(gateway, ADMIN_PORT);

  /* Initial load */
  try {
    const config = loadConfig(CONFIG_PATH);
    await gateway.reload(config);
  } catch (err: any) {
    console.error(`[main] Initial load failed: ${err.message}`);
  }

  /* Watch config file for external changes */
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  watch(CONFIG_PATH, (eventType) => {
    if (eventType === "change") {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.error("[main] Config file changed, reloading…");
        try {
          const config = loadConfig(CONFIG_PATH);
          await gateway.reload(config);
        } catch (err: any) {
          console.error(`[main] Reload failed: ${err.message}`);
        }
      }, 500);
    }
  });

  /* Connect stdio transport — blocks until stdin closes */
  console.error(`[main] MCP gateway ready. Config: ${CONFIG_PATH}`);
  await gateway.connect();
}

main().catch((err) => {
  console.error("[main] Fatal:", err);
  process.exit(1);
});
