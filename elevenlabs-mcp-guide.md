---
title: Model Context Protocol
subtitle: >-
  Connect your ElevenLabs conversational agents to external tools and data
  sources using the Model Context Protocol.
---

<Error title="User Responsibility">
  You are responsible for the security, compliance, and behavior of any third-party MCP server you
  integrate with your ElevenLabs conversational agents. ElevenLabs provides the platform for
  integration but does not manage, endorse, or secure external MCP servers.
</Error>

## Overview

<Note>
  This guide covers giving your ElevenLabs agents access to external MCP servers. If you want the
  reverse, managing your ElevenLabs agents from Claude or another MCP client, use the [hosted MCP
  server](/docs/eleven-agents/operate/hosted-mcp).
</Note>

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that defines how applications provide context to Large Language Models (LLMs). Think of MCP as a universal connector that enables AI models to seamlessly interact with diverse data sources and tools. By integrating servers that implement MCP, you can significantly extend the capabilities of your ElevenLabs conversational agents.

<YoutubeEmbed id="m1HgNvafID8" />

<Warning>
  MCP support is not currently available for users on Zero Retention Mode or those requiring HIPAA
  compliance.
</Warning>

ElevenLabs allows you to connect your conversational agents to external MCP servers. This enables your agents to:

* Access and process information from various data sources via the MCP server
* Utilize specialized tools and functionalities exposed by the MCP server
* Create more dynamic, knowledgeable, and interactive conversational experiences

## Enable MCP for your workspace

MCP is disabled by default for every workspace. Before anyone can add or use MCP servers, one member of the workspace must opt in on the workspace's behalf.

<Tabs>
  <Tab title="Dashboard">
    The opt-in happens automatically the first time someone tries to add an MCP server from the [MCP server integrations dashboard](https://elevenlabs.io/app/agents/integrations). A dialog asks them to review and accept the Model Context Protocol Server Terms — accepting enables MCP for the entire workspace, so every member with access to ElevenAgents can then add MCP servers and attach them to agents.
  </Tab>

  <Tab title="API">
    You can enable or disable MCP for the workspace directly by updating the `can_use_mcp_servers` workspace setting:

    <CodeBlocks>
      ```python
      from elevenlabs import ElevenLabs

      elevenlabs = ElevenLabs()

      elevenlabs.conversational_ai.settings.update(can_use_mcp_servers=True)
      ```

      ```typescript
      import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

      const elevenlabs = new ElevenLabsClient();

      await elevenlabs.conversationalAi.settings.update({ canUseMcpServers: true });
      ```
    </CodeBlocks>

    Setting `can_use_mcp_servers` back to `false` disables MCP for the workspace. Existing MCP server integrations are kept, but agents can no longer use them until the setting is enabled again.
  </Tab>
</Tabs>

<Note>
  Enabling MCP is a workspace-wide setting rather than a per-agent one. Any member, or any API key
  with the `convai_write` permission, can turn it on or off — this is not restricted to workspace
  admins.
</Note>

Once MCP is enabled for the workspace, each MCP server you add is its own resource: the member who creates it can share it with other workspace members individually, similar to sharing an agent or a knowledge base document.

<Warning>
  Enabling this setting does not override the Zero Retention Mode and HIPAA restriction above.
  Workspaces with Zero Retention Mode or HIPAA compliance enabled cannot use MCP servers, regardless
  of the `can_use_mcp_servers` setting.
</Warning>

## Getting started

<Note>
  ElevenLabs supports both SSE (Server-Sent Events) and HTTP streamable transport MCP servers.
</Note>

In this example, we'll use [Zapier MCP](https://zapier.com/mcp), which lets you connect ElevenAgents to hundreds of tools and services.

<Note>
  MCP servers are not yet manageable via the ElevenLabs CLI — use the dashboard or SDK.
</Note>

<Tabs>
  <Tab title="Add via the dashboard">
    <Steps>
      <Step title="Open MCP integrations">
        Navigate to the [MCP server integrations dashboard](https://elevenlabs.io/app/agents/integrations) and click **Add Custom MCP Server**.

        <Frame background="subtle">
          ![Creating your first MCP server](file:assets/images/conversational-ai/mcp-create.png)
        </Frame>
      </Step>

      <Step title="Configure the MCP server">
        Enter the following details:

        * **Name**: The name of the MCP server (e.g., "Zapier MCP Server")
        * **Description**: A description of what the MCP server can do
        * **Server URL**: The URL of the MCP server. If this contains a secret key, treat it like a password and store it as a workspace secret.
        * **Secret Token** (optional): Authorization header value
        * **HTTP Headers** (optional): Any additional headers the server requires
      </Step>

      <Step title="Save and test the connection">
        Click **Add Integration** to save the integration and test the connection to list available tools.

        <Frame background="subtle">
          ![Zapier example tools](file:assets/images/conversational-ai/mcp-zapier.png)
        </Frame>
      </Step>

      <Step title="Attach the server to an agent">
        The MCP server is now available to add to your agents. MCP support is available for both public and private agents.

        <Frame background="subtle">
          ![Adding the MCP server to an agent](file:assets/images/conversational-ai/mcp-add.png)
        </Frame>
      </Step>
    </Steps>
  </Tab>

  <Tab title="Add via the API">
    <CodeBlocks>
      ```python
      from elevenlabs import ElevenLabs

      elevenlabs = ElevenLabs()

      server = elevenlabs.conversational_ai.mcp_servers.create(
          config={
              "url": "https://mcp.zapier.com/api/mcp/...",
              "name": "Zapier MCP Server",
              "description": "An MCP server with access to Zapier's tools and services",
              "approval_policy": "always_ask",
              "transport": "SSE",
          },
      )

      elevenlabs.conversational_ai.agents.update(
          agent_id="agent_7101k5zvyjhmfg983brhmhkd98n6",
          conversation_config={
              "agent": {"prompt": {"mcp_server_ids": [server.id]}},
          },
      )
      ```

      ```typescript
      import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

      const elevenlabs = new ElevenLabsClient();

      const server = await elevenlabs.conversationalAi.mcpServers.create({
        config: {
          url: "https://mcp.zapier.com/api/mcp/...",
          name: "Zapier MCP Server",
          description: "An MCP server with access to Zapier's tools and services",
          approvalPolicy: "always_ask",
          transport: "SSE",
        },
      });

      await elevenlabs.conversationalAi.agents.update("agent_7101k5zvyjhmfg983brhmhkd98n6", {
        conversationConfig: {
          agent: { prompt: { mcpServerIds: [server.id] } },
        },
      });
      ```
    </CodeBlocks>
  </Tab>
</Tabs>

## Tool approval modes

ElevenLabs provides flexible approval controls to manage how agents request permission to use tools from MCP servers. You can configure approval settings at both the MCP server level and individual tool level for maximum security control.

<Frame background="subtle">
  ![Tool approval mode settings](file:assets/images/conversational-ai/mcp-approval.png)
</Frame>

### Available approval modes

* **Always Ask (Recommended)**: Maximum security. The agent will request your permission before each tool use.
* **Fine-Grained Tool Approval**: Disable and pre-select tools which can run automatically and those requiring approval.
* **No Approval**: The assistant can use any tool without approval.

### Fine-grained tool control

The Fine-Grained Tool Approval mode allows you to configure individual tools with different approval requirements, giving you precise control over which tools can run automatically and which require explicit permission.

<Frame background="subtle">
  ![Fine-grained tool approval
  settings](file:assets/images/conversational-ai/mcp-finegrained-approvals.png)
</Frame>

For each tool, you can set:

* **Auto-approved**: Tool runs automatically without requiring permission
* **Requires approval**: Tool requires explicit permission before execution
* **Disabled**: Tool is completely disabled and cannot be used

<Tip>
  Use Fine-Grained Tool Approval to allow low-risk read-only tools to run automatically while
  requiring approval for tools that modify data or perform sensitive operations.
</Tip>

## Key considerations for ElevenLabs integration

* **External servers**: You are responsible for selecting the external MCP servers you wish to integrate. ElevenLabs provides the means to connect to them.
* **Supported features**: ElevenLabs supports MCP servers that communicate over SSE (Server-Sent Events) and HTTP streamable transports for real-time interactions.
* **Dynamic tools**: The tools and capabilities available from an integrated MCP server are defined by that external server and can change if the server's configuration is updated.

## Security and disclaimer

Integrating external MCP servers can expose your agents and data to third-party services. It is crucial to understand the security implications.

<Warning title="Important Disclaimer">
  By enabling MCP server integrations, you acknowledge that this may involve data sharing with
  third-party services not controlled by ElevenLabs. This could incur additional security risks.
  Please ensure you fully understand the implications, vet the security of any MCP server you
  integrate, and review our [MCP Integration Security
  Guidelines](/docs/eleven-agents/customization/tools/mcp/security) before proceeding.
</Warning>

Refer to our [MCP Integration Security Guidelines](/docs/eleven-agents/customization/tools/mcp/security) for detailed best practices.

## Finding or building MCP servers

* Utilize publicly available MCP servers from trusted providers
* Develop your own MCP server to expose your proprietary data or tools
* Explore the Model Context Protocol community and resources for examples and server implementations

### Resources

* [Anthropic's MCP server examples](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers#remote-mcp-server-examples) - A list of example servers by Anthropic
* [Awesome Remote MCP Servers](https://github.com/jaw9c/awesome-remote-mcp-servers) - A curated, open-source list of remote MCP servers
* [Remote MCP Server Directory](https://remote-mcp.com/) - A searchable list of Remote MCP servers
