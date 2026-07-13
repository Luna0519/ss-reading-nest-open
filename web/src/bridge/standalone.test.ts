import { describe, expect, it } from "vitest";
import { getStandaloneConfig } from "./standalone.js";

describe("standalone reader path", () => {
  it("derives the private MCP endpoint without putting it in page markup", () => {
    const config = getStandaloneConfig({
      origin: "https://nest.example.test",
      pathname: "/app/private-token/"
    } as Location);

    expect(config?.appBasePath).toBe("/app/private-token/");
    expect(config?.mcpUrl.href).toBe("https://nest.example.test/mcp/private-token");
  });

  it("ignores unrelated and nested paths", () => {
    expect(
      getStandaloneConfig({ origin: "https://nest.example.test", pathname: "/" } as Location)
    ).toBeUndefined();
    expect(
      getStandaloneConfig({
        origin: "https://nest.example.test",
        pathname: "/app/private-token/settings"
      } as Location)
    ).toBeUndefined();
  });
});
