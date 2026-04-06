#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const API_BASE = "https://app.whatconverts.com/api/v1";

const TOKEN = process.env.API_TOKEN;
const SECRET = process.env.API_SECRET;

if (!TOKEN || !SECRET) {
  console.error(
    "API_TOKEN and API_SECRET must be set in .env file"
  );
  process.exit(1);
}

const authHeader =
  "Basic " + Buffer.from(`${TOKEN}:${SECRET}`).toString("base64");

async function apiRequest(
  method: string,
  path: string,
  params?: Record<string, string>,
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const options: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatConverts API error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
}

function toParams(obj: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      params[k] = String(v);
    }
  }
  return params;
}

const server = new McpServer({
  name: "whatconverts",
  version: "1.0.0",
});

// ── Leads ──

server.tool(
  "list_leads",
  "List leads with optional filters. Returns paginated results.",
  {
    page: z.number().optional().describe("Page number"),
    leads_per_page: z
      .number()
      .optional()
      .describe("Results per page (max 2500, default 100)"),
    lead_type: z
      .string()
      .optional()
      .describe(
        'Filter by type: "Phone Call", "Form Fill", "Chat", etc.'
      ),
    lead_status: z
      .string()
      .optional()
      .describe('Filter: "repeat" or "unique"'),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    profile_id: z.string().optional().describe("Filter by profile ID"),
    account_id: z.string().optional().describe("Filter by account ID"),
    quotable: z.string().optional().describe("Filter by quotable status"),
    phone_number: z.string().optional().describe("Filter by phone number"),
    email_address: z.string().optional().describe("Filter by email"),
    spam: z.string().optional().describe("Filter spam leads"),
    duplicate: z.string().optional().describe("Filter duplicate leads"),
    lead_source: z.string().optional().describe("Filter by lead source"),
    lead_medium: z.string().optional().describe("Filter by lead medium"),
    lead_campaign: z.string().optional().describe("Filter by campaign"),
    lead_content: z.string().optional().describe("Filter by content"),
    lead_keyword: z.string().optional().describe("Filter by keyword"),
  },
  async (params) => {
    const data = await apiRequest("GET", "/leads", toParams(params));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_lead",
  "Get a single lead by ID",
  {
    lead_id: z.string().describe("The lead ID"),
  },
  async ({ lead_id }) => {
    const data = await apiRequest("GET", `/leads/${lead_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_lead",
  "Create a new lead",
  {
    profile_id: z.string().describe("Profile ID to create the lead under"),
    lead_type: z
      .string()
      .optional()
      .describe("Lead type (e.g. Phone Call, Form Fill)"),
    phone_number: z.string().optional().describe("Phone number"),
    email_address: z.string().optional().describe("Email address"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    quote_value: z.number().optional().describe("Quote value"),
    sales_value: z.number().optional().describe("Sales value"),
    lead_source: z.string().optional().describe("Lead source"),
    lead_medium: z.string().optional().describe("Lead medium"),
    lead_campaign: z.string().optional().describe("Lead campaign"),
    lead_url: z.string().optional().describe("Lead URL"),
    landing_url: z.string().optional().describe("Landing URL"),
    additional_fields: z
      .record(z.string(), z.string())
      .optional()
      .describe("Custom fields as key-value pairs"),
  },
  async (params) => {
    const data = await apiRequest("POST", "/leads", undefined, params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_lead",
  "Update an existing lead",
  {
    lead_id: z.string().describe("The lead ID to update"),
    lead_type: z.string().optional().describe("Lead type"),
    phone_number: z.string().optional().describe("Phone number"),
    email_address: z.string().optional().describe("Email address"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    quotable: z.string().optional().describe("Quotable status"),
    quote_value: z.number().optional().describe("Quote value"),
    sales_value: z.number().optional().describe("Sales value"),
    additional_fields: z
      .record(z.string(), z.string())
      .optional()
      .describe("Custom fields as key-value pairs"),
  },
  async ({ lead_id, ...body }) => {
    const data = await apiRequest("PUT", `/leads/${lead_id}`, undefined, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Accounts ──

server.tool(
  "list_accounts",
  "List all accounts (paginated)",
  {
    page: z.number().optional().describe("Page number"),
    accounts_per_page: z.number().optional().describe("Results per page"),
  },
  async (params) => {
    const data = await apiRequest("GET", "/accounts", toParams(params));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_account",
  "Get a single account by ID",
  {
    account_id: z.string().describe("The account ID"),
  },
  async ({ account_id }) => {
    const data = await apiRequest("GET", `/accounts/${account_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_account",
  "Create a new account",
  {
    account_name: z.string().describe("Account name"),
  },
  async (params) => {
    const data = await apiRequest("POST", "/accounts", undefined, params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_account",
  "Update an existing account",
  {
    account_id: z.string().describe("The account ID to update"),
    account_name: z.string().optional().describe("New account name"),
  },
  async ({ account_id, ...body }) => {
    const data = await apiRequest(
      "PUT",
      `/accounts/${account_id}`,
      undefined,
      body
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "delete_account",
  "Delete an account by ID",
  {
    account_id: z.string().describe("The account ID to delete"),
  },
  async ({ account_id }) => {
    const data = await apiRequest("DELETE", `/accounts/${account_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Profiles ──

server.tool(
  "list_profiles",
  "List all profiles (paginated)",
  {
    page: z.number().optional().describe("Page number"),
    profiles_per_page: z.number().optional().describe("Results per page"),
    account_id: z.string().optional().describe("Filter by account ID"),
  },
  async (params) => {
    const data = await apiRequest("GET", "/profiles", toParams(params));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_profile",
  "Get a single profile by ID",
  {
    profile_id: z.string().describe("The profile ID"),
  },
  async ({ profile_id }) => {
    const data = await apiRequest("GET", `/profiles/${profile_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_profile",
  "Create a new profile",
  {
    account_id: z.string().describe("Account ID to create profile under"),
    profile_name: z.string().describe("Profile name"),
  },
  async (params) => {
    const data = await apiRequest("POST", "/profiles", undefined, params);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_profile",
  "Update an existing profile",
  {
    profile_id: z.string().describe("The profile ID to update"),
    profile_name: z.string().optional().describe("New profile name"),
  },
  async ({ profile_id, ...body }) => {
    const data = await apiRequest(
      "PUT",
      `/profiles/${profile_id}`,
      undefined,
      body
    );
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "delete_profile",
  "Delete a profile by ID",
  {
    profile_id: z.string().describe("The profile ID to delete"),
  },
  async ({ profile_id }) => {
    const data = await apiRequest("DELETE", `/profiles/${profile_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Users ──

server.tool(
  "list_users",
  "List all users (requires Agency/Master key)",
  {
    page: z.number().optional().describe("Page number"),
    users_per_page: z.number().optional().describe("Results per page"),
  },
  async (params) => {
    const data = await apiRequest("GET", "/users", toParams(params));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Roles ──

server.tool(
  "list_roles",
  "List all roles",
  {
    page: z.number().optional().describe("Page number"),
    roles_per_page: z.number().optional().describe("Results per page"),
  },
  async (params) => {
    const data = await apiRequest("GET", "/roles", toParams(params));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Tracking / Phone Numbers ──

server.tool(
  "list_tracking_numbers",
  "List all tracking phone numbers (paginated)",
  {
    page: z.number().optional().describe("Page number"),
    numbers_per_page: z.number().optional().describe("Results per page"),
    profile_id: z.string().optional().describe("Filter by profile ID"),
    account_id: z.string().optional().describe("Filter by account ID"),
  },
  async (params) => {
    const data = await apiRequest("GET", "/tracking", toParams(params));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Recordings ──

server.tool(
  "get_recording",
  "Get the call recording URL for a lead",
  {
    lead_id: z.string().describe("The lead ID to get recording for"),
  },
  async ({ lead_id }) => {
    const data = await apiRequest("GET", `/recordings/${lead_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Start server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
