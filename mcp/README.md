# Kurupan MCP Server

MCP server for the Kurupan asset borrowing and return management system.

## What it exposes

- Authentication: current user / current role
- Assets and asset code series
- Borrow requests and returns
- Users and notifications
- History and audit logs

## Requirements

- The main Kurupan app must be running and reachable at `KURUPAN_BASE_URL`
- The MCP service account must exist in the app
- Use a `staff` or `admin` account if you want write-capable tools

## Local setup

```bash
cd mcp
Copy-Item .env.example .env
npm install
```

Set the environment variables in `.env`:

```env
KURUPAN_BASE_URL=http://localhost:3000
KURUPAN_USERNAME=admin
KURUPAN_PASSWORD=your-password-here
```

## Run

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

## Example MCP client config

```json
{
  "mcpServers": {
    "kurupan": {
      "command": "node",
      "args": ["D:/kurupanv1/mcp/dist/index.js"],
      "env": {
        "KURUPAN_BASE_URL": "http://localhost:3000",
        "KURUPAN_USERNAME": "admin",
        "KURUPAN_PASSWORD": "your-password-here"
      }
    }
  }
}
```

If you prefer hot reload while developing, point the client to `tsx` and `src/index.ts` instead.
