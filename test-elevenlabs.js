import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: {
      ...process.env,
      CONFIG_PATH: "D:/coding/temp/mcp-gateway/mcp-servers.json",
      ADMIN_PORT: "51338",
    },
  });

  const client = new Client({ name: "elevenlabs-test", version: "1.0.0" });
  await client.connect(transport);

  console.error("[test] Connected to gateway");

  // List all tools
  const toolsResult = await client.listTools();
  const tools = toolsResult.tools;
  console.error(`[test] Found ${tools.length} total tools`);

  // Show ElevenLabs tools
  const elevenlabsTools = tools.filter((t) => t.name.startsWith("elevenlabs__"));
  console.error(`[test] ElevenLabs tools (${elevenlabsTools.length}):`);
  for (const t of elevenlabsTools.slice(0, 10)) {
    console.error(`  - ${t.name}: ${(t.description || "").slice(0, 80)}...`);
  }
  if (elevenlabsTools.length > 10) {
    console.error(`  ... and ${elevenlabsTools.length - 10} more`);
  }

  // Try calling a simple ElevenLabs tool - list voices
  const voicesTool = elevenlabsTools.find((t) =>
    t.name.toLowerCase().includes("voice") && t.name.toLowerCase().includes("list")
  );

  if (voicesTool) {
    console.error(`\n[test] Calling tool: ${voicesTool.name}`);
    try {
      const result = await client.callTool({
        name: voicesTool.name,
        arguments: {},
      });
      console.log("=== ELEVENLABS VOICES RESULT ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`[test] Tool failed: ${err.message}`);
    }
  } else {
    console.error("[test] No list-voices tool found");
  }

  // Try text-to-speech if available
  const ttsTool = elevenlabsTools.find((t) =>
    t.name.toLowerCase().includes("text_to_speech") || t.name.toLowerCase().includes("tts")
  );

  if (ttsTool) {
    console.error(`\n[test] Calling TTS tool: ${ttsTool.name}`);
    try {
      const result = await client.callTool({
        name: ttsTool.name,
        arguments: { text: "Hello from the MCP gateway.", voice_id: "Rachel" },
      });
      console.log("=== ELEVENLABS TTS RESULT ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`[test] TTS tool failed: ${err.message}`);
    }
  } else {
    console.error("[test] No TTS tool found");
  }

  await client.close();
  console.error("[test] Done");
}

main().catch((err) => {
  console.error("[test] Fatal:", err);
  process.exit(1);
});
