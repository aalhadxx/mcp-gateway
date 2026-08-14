# Start MCP Gateway
$env:CONFIG_PATH = Resolve-Path './mcp-servers.json'
$env:ADMIN_PORT = 51337
node ./dist/index.js
