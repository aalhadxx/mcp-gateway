import express from "express";
import type { Gateway } from "./gateway.js";
import { loadConfig } from "./config.js";

export function startAdminApi(gateway: Gateway, port: number) {
  const app = express();
  app.use(express.json({ limit: "100mb" }));

  app.get("/status", (_req, res) => {
    res.json(gateway.getStatus());
  });

  app.post("/reload", async (req, res) => {
    const configPath = (req.body?.configPath as string) || "./mcp-servers.json";
    try {
      const config = loadConfig(configPath);
      await gateway.reload(config);
      res.json({ success: true, ...gateway.getStatus() });
    } catch (err: any) {
      console.error("[admin] reload error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/reload-from-body", async (req, res) => {
    try {
      await gateway.reload(req.body);
      res.json({ success: true, ...gateway.getStatus() });
    } catch (err: any) {
      console.error("[admin] reload-from-body error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const server = app.listen(port, () => {
    console.error(`[admin] Admin API running on http://localhost:${port}`);
    console.error(`[admin] GET  /status          — show connected servers`);
    console.error(`[admin] POST /reload          — reload from mcp-servers.json`);
    console.error(`[admin] POST /reload-from-body — reload from JSON body`);
  });

  return server;
}
