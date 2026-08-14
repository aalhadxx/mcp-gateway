import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ServerConfig } from "./config.js";

export interface DownstreamServer {
  name: string;
  client: Client;
  tools: any[];
  resources: any[];
  prompts: any[];
}

async function createTransport(config: ServerConfig) {
  if (config.command) {
    return new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
    });
  }

  if (config.url) {
    const url = new URL(config.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      try {
        const { StreamableHTTPClientTransport } = await import(
          "@modelcontextprotocol/sdk/client/streamableHttp.js"
        );
        const headers: Record<string, string> = config.headers || {};
        return new StreamableHTTPClientTransport(url, {
          requestInit: { headers },
        });
      } catch (err: any) {
        throw new Error(
          `StreamableHTTP transport failed for ${config.url}: ${err.message}`
        );
      }
    }
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }

  throw new Error("Server config must have either 'command' or 'url'");
}

export async function connectDownstream(
  name: string,
  config: ServerConfig
): Promise<DownstreamServer> {
  const client = new Client({ name: "mcp-gateway", version: "1.0.0" });
  const transport = await createTransport(config);

  await client.connect(transport);

  let tools: any[] = [];
  let resources: any[] = [];
  let prompts: any[] = [];

  try {
    const result = await client.listTools();
    tools = result.tools ?? [];
  } catch (err: any) {
    console.error(`[downstream] ${name}: listTools failed — ${err.message}`);
  }

  try {
    const result = await client.listResources?.();
    resources = result?.resources ?? [];
  } catch {
    /* server may not support resources */
  }

  try {
    const result = await client.listPrompts?.();
    prompts = result?.prompts ?? [];
  } catch {
    /* server may not support prompts */
  }

  return { name, client, tools, resources, prompts };
}

export async function disconnectDownstream(server: DownstreamServer): Promise<void> {
  try {
    await server.client.close();
  } catch (err: any) {
    console.error(`[downstream] ${server.name}: disconnect failed — ${err.message}`);
  }
}
