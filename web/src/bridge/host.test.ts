import { beforeEach, describe, expect, it, vi } from "vitest";

const bridge = {
  connect: vi.fn().mockResolvedValue(undefined),
  callServerTool: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  updateModelContext: vi.fn().mockResolvedValue({}),
  requestDisplayMode: vi.fn().mockResolvedValue({ mode: "fullscreen" })
};

const standalone = {
  connect: vi.fn().mockResolvedValue(undefined),
  callTool: vi.fn(),
  transportUrl: undefined as URL | undefined
};

vi.mock("@modelcontextprotocol/ext-apps", () => ({
  App: class {
    connect = bridge.connect;
    callServerTool = bridge.callServerTool;
    sendMessage = bridge.sendMessage;
    updateModelContext = bridge.updateModelContext;
    requestDisplayMode = bridge.requestDisplayMode;
  }
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class {
    connect = standalone.connect;
    callTool = standalone.callTool;
  }
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: class {
    constructor(url: URL) {
      standalone.transportUrl = url;
    }
  }
}));

describe("host bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    standalone.transportUrl = undefined;
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: {}
    });
    Object.defineProperty(window, "openai", {
      configurable: true,
      value: {
        setWidgetState: vi.fn(),
        widgetState: {
          screen: "novel",
          sessionId: "session-1",
          positionIndex: 2,
          scrollTop: 120
        }
      }
    });
  });

  it("updates model-visible context through the MCP Apps bridge", async () => {
    const { updateModelContext } = await import("./host.js");

    await expect(updateModelContext({ title: "Book", currentText: "paragraph" })).resolves.toBe(true);
    expect(bridge.updateModelContext).toHaveBeenCalledWith({
      content: [
        {
          type: "text",
          text: expect.stringContaining('"currentText":"paragraph"')
        }
      ]
    });
  });

  it("requests fullscreen and sends a message without forcing chat scroll", async () => {
    const { askChatGpt, requestReaderFullscreen } = await import("./host.js");

    await expect(requestReaderFullscreen()).resolves.toBe(true);
    await askChatGpt("陪我看看这里", { scrollToBottom: false });

    expect(bridge.requestDisplayMode).toHaveBeenCalledWith({ mode: "fullscreen" });
    expect(bridge.sendMessage).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: "陪我看看这里" }]
    });
  });

  it("starts the direct ChatGPT fullscreen request in the user gesture call stack", async () => {
    const requestDisplayMode = vi.fn().mockResolvedValue(undefined);
    if (window.openai) window.openai.requestDisplayMode = requestDisplayMode;
    const { requestReaderFullscreen } = await import("./host.js");

    const result = requestReaderFullscreen();

    expect(requestDisplayMode).toHaveBeenCalledWith({ mode: "fullscreen" });
    expect(bridge.requestDisplayMode).not.toHaveBeenCalled();
    await expect(result).resolves.toBe(true);
  });

  it("stores and restores only lightweight reader widget state", async () => {
    const { initialWidgetState, saveReaderWidgetState } = await import("./host.js");
    const state = {
      screen: "novel" as const,
      sessionId: "session-1",
      positionIndex: 3,
      scrollTop: 240
    };

    saveReaderWidgetState(state);

    expect(window.openai?.setWidgetState).toHaveBeenCalledWith(state);
    expect(initialWidgetState()).toEqual({
      screen: "novel",
      sessionId: "session-1",
      positionIndex: 2,
      scrollTop: 120
    });
  });

  it("reads widget-only metadata from the ChatGPT tool result envelope", async () => {
    if (window.openai) {
      window.openai.toolOutput = { recentSessions: [] };
      window.openai.toolResponseMetadata = {
        status: "finished",
        mcp_tool_result: {
          structuredContent: { recentSessions: [] },
          _meta: { sourceEndpointBase: "https://worker.example.test/source/secret" }
        }
      };
    }
    const { initialToolMetadata, initialToolOutput } = await import("./host.js");

    expect(initialToolOutput()).toEqual({ recentSessions: [] });
    expect(initialToolMetadata()).toEqual({
      sourceEndpointBase: "https://worker.example.test/source/secret"
    });
  });

  it("connects a top-level private app page directly to its same-origin MCP path", async () => {
    window.history.replaceState({}, "", "/app/private-token/");
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: window
    });
    standalone.callTool.mockResolvedValue({ structuredContent: { recentSessions: [] } });
    const { callTool, isStandaloneMode } = await import("./host.js");

    await expect(callTool("open_reading_nest", {})).resolves.toEqual({
      structuredContent: { recentSessions: [] }
    });
    expect(isStandaloneMode()).toBe(true);
    expect(standalone.transportUrl?.pathname).toBe("/mcp/private-token");
    expect(standalone.callTool).toHaveBeenCalledWith({
      name: "open_reading_nest",
      arguments: {}
    });
    expect(bridge.connect).not.toHaveBeenCalled();
  });

  it("persists lightweight reader state locally in standalone mode", async () => {
    window.history.replaceState({}, "", "/app/private-token/");
    const { initialWidgetState, saveReaderWidgetState } = await import("./host.js");
    const state: ReaderWidgetState = {
      screen: "manga",
      sessionId: "session-local",
      positionIndex: 4,
      scrollTop: 88
    };

    saveReaderWidgetState(state);

    expect(initialWidgetState()).toEqual(state);
    expect(window.openai?.setWidgetState).not.toHaveBeenCalled();
  });

  it("explains the ChatGPT handoff when an AI action is used standalone", async () => {
    window.history.replaceState({}, "", "/app/private-token/");
    const listener = vi.fn();
    window.addEventListener("sxs:standalone-chat-request", listener);
    const { askChatGpt } = await import("./host.js");

    await askChatGpt("陪我看这里");
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(bridge.sendMessage).not.toHaveBeenCalled();
    window.removeEventListener("sxs:standalone-chat-request", listener);
  });
});
