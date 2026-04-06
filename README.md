# WhatConverts MCP Server

An MCP (Model Context Protocol) server that connects Claude to the [WhatConverts API](https://www.whatconverts.com/api/overview/), giving Claude access to your leads, accounts, profiles, tracking numbers, and more.

## Prerequisites

- Node.js 18+
- A WhatConverts **Master Account API Key** (requires Agency plan)
  - Generate one from **Master Account > Master Integrations** in WhatConverts

## Setup

1. Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd whatconverts-mcp-server
npm install
```

2. Create your `.env` file from the example:

```bash
cp .env.example .env
```

3. Edit `.env` with your WhatConverts API credentials:

```
API_TOKEN=your-token-here
API_SECRET=your-secret-here
```

4. Build:

```bash
npm run build
```

## Docker Setup

If you prefer Docker, you can skip the Node.js install entirely.

1. Build the image:

```bash
docker build -t whatconverts-mcp-server .
```

2. Run it (pass your API credentials as environment variables):

```bash
docker run --rm -i \
  -e API_TOKEN=your-token-here \
  -e API_SECRET=your-secret-here \
  whatconverts-mcp-server
```

See the [Configuration](#configuration) section below for how to wire this into Claude Code or Claude Desktop.

## Configuration

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "whatconverts": {
      "command": "node",
      "args": ["/absolute/path/to/whatconverts-mcp-server/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "whatconverts": {
      "command": "node",
      "args": ["/absolute/path/to/whatconverts-mcp-server/dist/index.js"]
    }
  }
}
```

### Claude Code (Docker)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "whatconverts": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "API_TOKEN",
        "-e", "API_SECRET",
        "whatconverts-mcp-server"
      ],
      "env": {
        "API_TOKEN": "your-token-here",
        "API_SECRET": "your-secret-here"
      }
    }
  }
}
```

### Claude Desktop (Docker)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "whatconverts": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "API_TOKEN=your-token-here",
        "-e", "API_SECRET=your-secret-here",
        "whatconverts-mcp-server"
      ]
    }
  }
}
```

Then restart Claude Code or Claude Desktop.

## Available Tools

### Leads
| Tool | Description |
|------|-------------|
| `list_leads` | List leads with filters (type, status, date range, source, etc.) |
| `get_lead` | Get a single lead by ID |
| `create_lead` | Create a new lead |
| `update_lead` | Update an existing lead |

### Accounts
| Tool | Description |
|------|-------------|
| `list_accounts` | List all accounts |
| `get_account` | Get a single account by ID |
| `create_account` | Create a new account |
| `update_account` | Update an existing account |
| `delete_account` | Delete an account |

### Profiles
| Tool | Description |
|------|-------------|
| `list_profiles` | List all profiles |
| `get_profile` | Get a single profile by ID |
| `create_profile` | Create a new profile |
| `update_profile` | Update an existing profile |
| `delete_profile` | Delete a profile |

### Users & Roles
| Tool | Description |
|------|-------------|
| `list_users` | List all users (requires Master key) |
| `list_roles` | List all roles |

### Tracking & Recordings
| Tool | Description |
|------|-------------|
| `list_tracking_numbers` | List all tracking phone numbers |
| `get_recording` | Get a call recording for a lead |

## API Rate Limits

- **Master Account API Key:** 10,000 requests per day
- **Concurrency:** Up to 20 concurrent requests

## Security

- Never commit your `.env` file (it's in `.gitignore`)
- Share credentials via a password manager, not Slack/email
- Ideally, each team member should use their own API key
