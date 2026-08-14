import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: {
      ...process.env,
      CONFIG_PATH: "D:/coding/temp/mcp-gateway/mcp-servers.json",
      ADMIN_PORT: "51337",
    },
  });

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);

  console.error("[test] Connected to gateway");

  // List all tools
  const toolsResult = await client.listTools();
  const tools = toolsResult.tools;
  console.error(`[test] Found ${tools.length} tools:`);

  // Show zernio tools
  const zernioTools = tools.filter((t) => t.name.startsWith("zernio__"));
  console.error("[test] Zernio tools:");
  for (const t of zernioTools) {
    console.error(`  - ${t.name}: ${t.description || "(no desc)"}`);
  }

  // Try to find analytics/post-related tool
  const analyticsTool = zernioTools.find((t) =>
    t.name.toLowerCase().includes("analytic")
  );
  const postsTool = zernioTools.find((t) =>
    t.name.toLowerCase().includes("post")
  );

  if (postsTool) {
    console.error(`\n[test] Calling posts tool: ${postsTool.name}`);
    try {
      const result = await client.callTool({
        name: postsTool.name,
        arguments: { profile_id: "6a7ca677727d77c3ba605bf3" },
      });
      console.log("=== POSTS RESULT ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`[test] Posts tool failed: ${err.message}`);
    }
  }

  if (analyticsTool) {
    console.error(`\n[test] Calling analytics tool: ${analyticsTool.name}`);
    try {
      const result = await client.callTool({
        name: analyticsTool.name,
        arguments: { profile_id: "6a7ca677727d77c3ba605bf3" },
      });
      console.log("=== ANALYTICS RESULT ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`[test] Analytics tool failed: ${err.message}`);
    }
  }

  // Also try comments tool
  const commentsTool = zernioTools.find((t) =>
    t.name.toLowerCase().includes("comment")
  );
  if (commentsTool) {
    console.error(`\n[test] Calling comments tool: ${commentsTool.name}`);
    try {
      const result = await client.callTool({
        name: commentsTool.name,
        arguments: { profile_id: "6a7ca677727d77c3ba605bf3" },
      });
      console.log("=== COMMENTS RESULT ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`[test] Comments tool failed: ${err.message}`);
    }
  }

  await client.close();
  console.error("[test] Done");
}

main().catch((err) => {
  console.error("[test] Fatal:", err);
  process.exit(1);
});
