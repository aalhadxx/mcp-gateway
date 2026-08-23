import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: {
      ...process.env,
      CONFIG_PATH: "D:/coding/temp/mcp-gateway/mcp-servers.json",
      ADMIN_PORT: "51339",
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
  for (const t of elevenlabsTools) {
    console.error(`  - ${t.name}`);
  }

  // Try calling search_voices to get a valid voice ID
  const searchVoicesTool = elevenlabsTools.find((t) =>
    t.name === "elevenlabs__search_voices"
  );

  let voiceId = null;
  if (searchVoicesTool) {
    console.error(`\n[test] Calling tool: ${searchVoicesTool.name}`);
    try {
      const result = await client.callTool({
        name: searchVoicesTool.name,
        arguments: { search: "Rachel" },
      });
      console.log("=== ELEVENLABS SEARCH VOICES RESULT ===");
      const text = result.content?.[0]?.text || JSON.stringify(result);
      console.log(text);
      // Try to extract a voice ID
      const match = text.match(/voice_id[\"']?\s*[:=]\s*[\"']?([a-f0-9-]+)/i);
      if (match) voiceId = match[1];
    } catch (err) {
      console.error(`[test] Search voices failed: ${err.message}`);
    }
  }

  // Try text-to-speech with the found voice ID
  const ttsTool = elevenlabsTools.find((t) => t.name === "elevenlabs__text_to_speech");
  if (ttsTool && voiceId) {
    console.error(`\n[test] Calling TTS tool: ${ttsTool.name} with voice_id=${voiceId}`);
    try {
      const result = await client.callTool({
        name: ttsTool.name,
        arguments: { text: "Hello from the MCP gateway.", voice_id: voiceId },
      });
      console.log("=== ELEVENLABS TTS RESULT ===");
      const text = result.content?.[0]?.text || JSON.stringify(result);
      console.log(text);
    } catch (err) {
      console.error(`[test] TTS tool failed: ${err.message}`);
    }
  } else if (ttsTool) {
    console.error("[test] TTS tool found but no valid voice ID available. Trying with '21m00Tcm4TlvDq8ikWAM' (known default)...");
    try {
      const result = await client.callTool({
        name: ttsTool.name,
        arguments: { text: "Hello from the MCP gateway.", voice_id: "21m00Tcm4TlvDq8ikWAM" },
      });
      console.log("=== ELEVENLABS TTS RESULT ===");
      const text = result.content?.[0]?.text || JSON.stringify(result);
      console.log(text);
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
