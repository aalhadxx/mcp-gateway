import { config as loadEnv } from "dotenv";
import { loadConfig } from "./dist/config.js";

console.log("CWD:", process.cwd());
console.log("CONFIG_PATH env:", process.env.CONFIG_PATH);
console.log("ZERNIO_API_KEY env:", process.env.ZERNIO_API_KEY ? "SET (length=" + process.env.ZERNIO_API_KEY.length + ")" : "NOT SET");

loadEnv();
console.log("After dotenv:");
console.log("ZERNIO_API_KEY env:", process.env.ZERNIO_API_KEY ? "SET (length=" + process.env.ZERNIO_API_KEY.length + ")" : "NOT SET");

const cfg = loadConfig("./mcp-servers.json");
console.log("Config servers:", Object.keys(cfg.servers));
console.log("Zernio headers:", JSON.stringify(cfg.servers.zernio?.headers));
