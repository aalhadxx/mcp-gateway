# MCP Gateway

A **local MCP gateway** that aggregates multiple downstream MCP servers behind a single connection.  
- One config file (`mcp-servers.json`) controls every downstream server.
- Hot-reload via HTTP admin API or file-watcher — **no need to restart Claude**.
- Runs on localhost with a **rare port** (default `51337`) for admin.
- Supports **large request/response payloads** (`100mb` JSON limit, stdio streams unbounded).

---

## How it works

```
Claude (host)
    │ stdio
    ▼
┌──────────────┐          ┌─────────────┐
│  MCP Gateway │◄────────►│ filesystem │
│  (this app)  │  stdio   └─────────────┘
│              │          ┌─────────────┐
│  • 1 config  │◄────────►│   brave     │
│  • hot reload│  HTTP    └─────────────┘
│  • aggregate │          ┌─────────────┐
└──────────────┘◄────────►│   sqlite    │
   localhost:51337         └─────────────┘
   (admin API)
```

You add Claude **once** as an MCP server in Claude Desktop / Claude Code.  
After that, every other MCP server lives in `mcp-servers.json`.  
Edit the JSON, hit reload, and the new tools appear — **Claude keeps running**.

---

## Quick start

### 1. Install dependencies

```bash
cd mcp-gateway
npm install
npm run build
```

### 2. Register the gateway with Claude

**Claude Desktop**  
Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or the macOS/Linux equivalent:

```json
{
  "mcpServers": {
    "gateway": {
      "command": "node",
      "args": ["D:/coding/temp/mcp-gateway/dist/index.js"]
    }
  }
}
```

**Claude Code CLI**

```bash
claude mcp add gateway -s user -- node D:/coding/temp/mcp-gateway/dist/index.js
```

### 3. Add downstream servers

Edit `mcp-servers.json`:

```json
{
  "servers": {
    "fs": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "remote-api": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

### 4. Reload

The gateway auto-reloads when the file changes (500 ms debounce).  
Or hit the admin API manually:

```bash
curl -X POST http://localhost:51337/reload
```

### 5. Check status

```bash
curl http://localhost:51337/status
```

---

## Config file format (`mcp-servers.json`)

```json
{
  "servers": {
    "my-server-name": {
      "command": "npx",
      "args": ["-y", "some-mcp-package"],
      "env": { "API_KEY": "secret" }
    },
    "another-server": {
      "url": "http://localhost:8080/sse",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

| Field     | Required | Description                              |
|-----------|----------|------------------------------------------|
| `command` | *        | Executable to spawn (stdio transport)    |
| `args`    |          | Arguments array                          |
| `env`     |          | Extra env vars (merges with `process.env`)|
| `url`     | *        | HTTP/SSE endpoint (alternative to `command`)|
| `headers` |          | Extra HTTP headers                       |

*Either `command` or `url` is required.*

---

## Tool / resource / prompt namespacing

To avoid collisions, every downstream item is prefixed:

| Downstream       | Gateway exposes                     |
|------------------|-------------------------------------|
| `fs:list_files`  | `fs__list_files`                    |
| `fetch:fetch`    | `fetch__fetch`                      |
| `file:///tmp`    | `fs://file:///tmp`                  |

Claude sees the prefixed names and routes are handled automatically.

---

## Admin API

| Method | Path                  | Body                         | Description               |
|--------|-----------------------|------------------------------|---------------------------|
| `GET`  | `/status`             | —                            | List connected servers    |
| `POST` | `/reload`             | `{ "configPath": "…" }`      | Reload from disk file     |
| `POST` | `/reload-from-body`   | Full config JSON             | Reload from inline JSON   |

Default port: **51337**.  
Override with env var: `ADMIN_PORT=61442 node dist/index.js`

---

## Environment variables

| Variable      | Default            | Description              |
|---------------|--------------------|--------------------------|
| `CONFIG_PATH` | `./mcp-servers.json`| Path to config file      |
| `ADMIN_PORT`  | `51337`            | Admin HTTP port          |

---

## Large payloads

- **Admin API** accepts up to `100 mb` JSON bodies (`express.json({ limit: "100mb" })`).
- **Stdio streams** have no artificial buffer cap — messages are framed with `Content-Length` and parsed as complete JSON-RPC objects.
- If a downstream server crashes on a huge payload, the error is caught and returned to Claude as an MCP error.

---

## For Claude (the assistant)

You can add or remove MCP servers for the user by:

1. Editing `mcp-servers.json` with the Write/Edit tool.
2. Triggering reload with the Bash tool:
   ```bash
   curl -X POST http://localhost:51337/reload
   ```
3. Or simply wait 500 ms — the file watcher auto-reloads.

You never need to ask the user to restart Claude.
