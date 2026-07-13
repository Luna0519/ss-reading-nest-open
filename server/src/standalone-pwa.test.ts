import { describe, expect, it } from "vitest";
import { buildStandaloneHtml, handleStandaloneApp } from "./standalone-pwa.js";

const token = "private-token";
const base = `https://example.workers.dev/app/${token}/`;

describe("standalone PWA", () => {
  it("adds install metadata and service-worker registration to the widget shell", () => {
    const html = buildStandaloneHtml("<html><head><title>Nest</title></head><body>reader</body></html>");
    expect(html).toContain('name="sxs-standalone"');
    expect(html).toContain('rel="manifest" href="./manifest.webmanifest"');
    expect(html).toContain('navigator.serviceWorker.register("./sw.js"');
    expect(html).toContain("reader");
  });

  it("redirects the private app path to its trailing-slash scope", () => {
    const response = handleStandaloneApp(
      new Request(base.slice(0, -1)),
      new URL(base.slice(0, -1)),
      token,
      "<html><head></head><body></body></html>"
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(base);
  });

  it("serves a private installable shell and manifest", async () => {
    const shell = handleStandaloneApp(
      new Request(base),
      new URL(base),
      token,
      "<html><head></head><body>reader</body></html>"
    );
    expect(shell.headers.get("content-type")).toContain("text/html");
    expect(shell.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await shell.text()).toContain("L&L 共读小窝");

    const manifestUrl = `${base}manifest.webmanifest`;
    const manifest = handleStandaloneApp(
      new Request(manifestUrl),
      new URL(manifestUrl),
      token,
      ""
    );
    expect(manifest.headers.get("content-type")).toContain("application/manifest+json");
    await expect(manifest.json()).resolves.toMatchObject({
      name: "L&L 共读小窝",
      start_url: "./",
      display: "standalone"
    });
  });

  it("keeps MCP and reading data out of the service-worker cache", async () => {
    const swUrl = `${base}sw.js`;
    const response = handleStandaloneApp(new Request(swUrl), new URL(swUrl), token, "");
    const script = await response.text();
    expect(script).toContain('const SHELL = ["./", "./manifest.webmanifest", "./icon.svg"]');
    expect(script).not.toContain("/mcp/");
    expect(script).not.toContain("/source/");
  });

  it("rejects unknown files and mutations", () => {
    const unknown = `${base}private.json`;
    expect(
      handleStandaloneApp(new Request(unknown), new URL(unknown), token, "").status
    ).toBe(404);
    expect(
      handleStandaloneApp(
        new Request(base, { method: "POST" }),
        new URL(base),
        token,
        ""
      ).status
    ).toBe(405);
  });
});
