import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const workerUrl = requireUrl("WORKER_URL");
const token = requireEnv("MCP_PATH_TOKEN");
const expectCloudSource = process.env.EXPECT_CLOUD_SOURCE === "true";
const mcpUrl = new URL(`/mcp/${token}`, workerUrl.origin);
const client = new Client({ name: "ll-reading-nest-smoke", version: "0.2.5" });

const healthResponse = await fetch(new URL("/health", workerUrl));
assert(healthResponse.ok, `health returned HTTP ${healthResponse.status}`);
const health = await healthResponse.json();
assert(health.ok === true, "health did not return ok=true");

const wrongPath = await fetch(new URL("/mcp/wrong-token", workerUrl), { method: "POST" });
assert(wrongPath.status === 404, `wrong MCP path returned HTTP ${wrongPath.status}`);

await client.connect(new StreamableHTTPClientTransport(mcpUrl));
try {
  const tools = await client.listTools();
  assert(tools.tools.length === 23, `expected 23 tools, got ${tools.tools.length}`);
  const openTool = tools.tools.find((tool) => tool.name === "open_reading_nest");
  assert(Boolean(openTool?._meta?.ui), "open_reading_nest is missing its UI resource metadata");

  const opened = await client.callTool({ name: "open_reading_nest", arguments: {} });
  assert(Array.isArray(opened.structuredContent?.bookshelfSessions), "bookshelf result is missing");
  assert(
    opened._meta?.cloudSourceEnabled === expectCloudSource,
    `cloud source mode did not match EXPECT_CLOUD_SOURCE=${expectCloudSource}`
  );
  if (expectCloudSource) {
    assert(typeof opened._meta?.sourceEndpointBase === "string", "cloud mode is missing its source endpoint");
  } else {
    assert(opened._meta?.sourceEndpointBase === undefined, "device-only mode exposed a source endpoint");
  }
  assert(!JSON.stringify(opened.structuredContent).includes(token), "MCP token leaked to model-visible output");

  console.log(
    JSON.stringify({
      ok: true,
      workerOrigin: workerUrl.origin,
      appVersion: health.version,
      toolCount: tools.tools.length,
      cloudSourceEnabled: expectCloudSource,
      tokenHiddenFromModel: true
    })
  );
} finally {
  await client.close();
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} before running the smoke test`);
  return value;
}

function requireUrl(name) {
  const value = new URL(requireEnv(name));
  if (value.protocol !== "https:") throw new Error(`${name} must use HTTPS`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
