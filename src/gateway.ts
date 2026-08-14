import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Config, ServerConfig } from "./config.js";
import { connectDownstream, disconnectDownstream, type DownstreamServer } from "./downstream.js";

export class Gateway {
  private server: Server;
  private downstreams = new Map<string, DownstreamServer>();
  private transport?: StdioServerTransport;

  constructor() {
    this.server = new Server(
      { name: "mcp-gateway", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    /* ---------- TOOLS ---------- */
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools: any[] = [];
      for (const ds of this.downstreams.values()) {
        for (const tool of ds.tools) {
          allTools.push({
            ...tool,
            name: `${ds.name}__${tool.name}`,
            description: tool.description
              ? `[${ds.name}] ${tool.description}`
              : `[${ds.name}]`,
          });
        }
      }
      return { tools: allTools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const sep = name.indexOf("__");
      if (sep === -1) {
        throw new Error(`Invalid tool name "${name}". Expected serverName__toolName.`);
      }
      const serverName = name.slice(0, sep);
      const toolName = name.slice(sep + 2);

      const ds = this.downstreams.get(serverName);
      if (!ds) throw new Error(`Downstream server "${serverName}" not found.`);

      return ds.client.callTool({ name: toolName, arguments: args });
    });

    /* ---------- RESOURCES ---------- */
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const allResources: any[] = [];
      for (const ds of this.downstreams.values()) {
        for (const res of ds.resources) {
          allResources.push({
            ...res,
            uri: `${ds.name}://${res.uri}`,
          });
        }
      }
      return { resources: allResources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const sep = uri.indexOf("://");
      if (sep === -1) {
        throw new Error(`Invalid resource URI "${uri}". Expected serverName://realUri.`);
      }
      const serverName = uri.slice(0, sep);
      const realUri = uri.slice(sep + 3);

      const ds = this.downstreams.get(serverName);
      if (!ds) throw new Error(`Downstream server "${serverName}" not found.`);

      return ds.client.readResource({ uri: realUri });
    });

    /* ---------- PROMPTS ---------- */
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const allPrompts: any[] = [];
      for (const ds of this.downstreams.values()) {
        for (const prompt of ds.prompts) {
          allPrompts.push({
            ...prompt,
            name: `${ds.name}__${prompt.name}`,
          });
        }
      }
      return { prompts: allPrompts };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const sep = name.indexOf("__");
      if (sep === -1) {
        throw new Error(`Invalid prompt name "${name}". Expected serverName__promptName.`);
      }
      const serverName = name.slice(0, sep);
      const promptName = name.slice(sep + 2);

      const ds = this.downstreams.get(serverName);
      if (!ds) throw new Error(`Downstream server "${serverName}" not found.`);

      return ds.client.getPrompt({ name: promptName, arguments: args });
    });
  }

  async connect() {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  async addDownstream(name: string, config: ServerConfig) {
    const ds = await connectDownstream(name, config);
    this.downstreams.set(name, ds);
  }

  async removeDownstream(name: string) {
    const ds = this.downstreams.get(name);
    if (ds) {
      await disconnectDownstream(ds);
      this.downstreams.delete(name);
    }
  }

  async reload(config: Config) {
    /* disconnect old */
    await Promise.allSettled(
      Array.from(this.downstreams.values()).map((ds) =>
        disconnectDownstream(ds).catch((err) =>
          console.error(`[gateway] Error disconnecting ${ds.name}:`, err)
        )
      )
    );
    this.downstreams.clear();

    /* connect new in parallel */
    await Promise.allSettled(
      Object.entries(config.servers).map(async ([name, srv]) => {
        try {
          await this.addDownstream(name, srv);
          console.error(`[gateway] Connected downstream: ${name}`);
        } catch (err: any) {
          console.error(`[gateway] Failed to connect ${name}: ${err.message}`);
        }
      })
    );

    /* notify host that lists changed */
    try {
      await this.server.sendToolListChanged();
    } catch {
      /* host may not support notifications */
    }
    try {
      await this.server.sendResourceListChanged();
    } catch {
      /* host may not support notifications */
    }
    try {
      await this.server.sendPromptListChanged();
    } catch {
      /* host may not support notifications */
    }
  }

  getStatus() {
    return {
      servers: Array.from(this.downstreams.entries()).map(([name, ds]) => ({
        name,
        toolCount: ds.tools.length,
        resourceCount: ds.resources.length,
        promptCount: ds.prompts.length,
      })),
    };
  }
}
