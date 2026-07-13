import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ToolCallResult } from "../types/openai.js";

type StandaloneConfig = {
  appBasePath: string;
  mcpUrl: URL;
};

let standaloneClient: Promise<Client> | undefined;
let bookshelfBootstrap: Promise<ToolCallResult> | undefined;

export function getStandaloneConfig(
  location: Pick<Location, "origin" | "pathname"> = window.location
): StandaloneConfig | undefined {
  const match = /^\/app\/([^/]+)\/?$/.exec(location.pathname);
  if (!match?.[1]) return undefined;
  const token = match[1];
  return {
    appBasePath: `/app/${token}/`,
    mcpUrl: new URL(`/mcp/${token}`, location.origin)
  };
}

export function isStandaloneMode(): boolean {
  return typeof window !== "undefined" && Boolean(getStandaloneConfig());
}

export async function callStandaloneTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const client = await connectStandaloneClient();
  return (await client.callTool({ name, arguments: args })) as ToolCallResult;
}

export function bootstrapStandaloneBookshelf(): Promise<ToolCallResult> | undefined {
  if (!isStandaloneMode()) return undefined;
  bookshelfBootstrap ??= callStandaloneTool("open_reading_nest", {});
  return bookshelfBootstrap;
}

async function connectStandaloneClient(): Promise<Client> {
  const config = getStandaloneConfig();
  if (!config) throw new Error("Standalone reader path is unavailable");
  standaloneClient ??= (async () => {
    const client = new Client({ name: "ll-reading-nest-pwa", version: "0.2.3" });
    await client.connect(new StreamableHTTPClientTransport(config.mcpUrl));
    return client;
  })();
  return standaloneClient;
}
