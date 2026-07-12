import { App as McpApp } from "@modelcontextprotocol/ext-apps";
import type { ToolCallResult } from "../types/openai.js";

let app: McpApp | undefined;
let appReady: Promise<void> | undefined;
let latestToolResult: ToolCallResult | undefined;
const toolResultListeners = new Set<(result: ToolCallResult) => void>();

export interface ReadingHostContext {
  displayMode?: "inline" | "pip" | "fullscreen";
  availableDisplayModes?: Array<"inline" | "pip" | "fullscreen">;
  containerDimensions?: {
    width?: number;
    maxWidth?: number;
    height?: number;
    maxHeight?: number;
  };
  safeAreaInsets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

function connectApp() {
  if (typeof window === "undefined" || window.parent === window) return undefined;
  if (!app) {
    app = new McpApp({ name: "S×S 小窝共读", version: "0.2.2" });
    app.ontoolresult = (result) => publishToolResult(result as ToolCallResult);
    appReady = app.connect().catch(() => undefined);
  }
  return app;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const bridge = connectApp();
  if (bridge) {
    await appReady;
    return (await bridge.callServerTool({ name, arguments: args })) as ToolCallResult;
  }
  if (window.openai?.callTool) return window.openai.callTool(name, args);
  return { structuredContent: {} };
}

export async function askChatGpt(
  prompt: string,
  options: { scrollToBottom?: boolean } = {}
) {
  await requestReaderPip();
  const bridge = connectApp();
  if (bridge) {
    await appReady;
    await bridge.sendMessage({ role: "user", content: [{ type: "text", text: prompt }] });
    return;
  }
  await window.openai?.sendFollowUpMessage?.({
    prompt,
    scrollToBottom: options.scrollToBottom ?? false
  });
}

export async function requestReaderPip(): Promise<boolean> {
  const bridge = connectApp();
  try {
    if (bridge) {
      await appReady;
      const result = await bridge.requestDisplayMode({ mode: "pip" });
      return result.mode === "pip";
    }
    if (window.openai?.requestDisplayMode) {
      await window.openai.requestDisplayMode({ mode: "pip" });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function updateModelContext(context: Record<string, unknown>): Promise<boolean> {
  const bridge = connectApp();
  if (!bridge) return false;
  try {
    await appReady;
    await bridge.updateModelContext({
      content: [{ type: "text", text: JSON.stringify(context) }]
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestReaderFullscreen(): Promise<boolean> {
  try {
    if (window.openai?.requestDisplayMode) {
      await window.openai.requestDisplayMode({ mode: "fullscreen" });
      return true;
    }
    const bridge = connectApp();
    if (bridge) {
      await appReady;
      const result = await bridge.requestDisplayMode({ mode: "fullscreen" });
      return result.mode === "fullscreen";
    }
  } catch {
    return false;
  }
  return false;
}

export async function requestReaderInline(): Promise<boolean> {
  try {
    if (window.openai?.requestDisplayMode) {
      await window.openai.requestDisplayMode({ mode: "inline" });
      return true;
    }
    const bridge = connectApp();
    if (bridge) {
      await appReady;
      const result = await bridge.requestDisplayMode({ mode: "inline" });
      return result.mode === "inline";
    }
  } catch {
    return false;
  }
  return false;
}

export function saveReaderWidgetState(state: ReaderWidgetState) {
  window.openai?.setWidgetState?.(state);
}

export function initialWidgetState(): ReaderWidgetState | undefined {
  return window.openai?.widgetState;
}

export function initialToolOutput<T>(): T | undefined {
  return (window.openai?.toolOutput ?? latestToolResult?.structuredContent) as T | undefined;
}

export function initialToolMetadata<T extends Record<string, unknown>>(): T | undefined {
  return (
    latestToolResult?._meta ?? findToolResultMeta(window.openai?.toolResponseMetadata)
  ) as T | undefined;
}

export function subscribeToolResults(
  listener: (result: ToolCallResult) => void
): () => void {
  toolResultListeners.add(listener);
  connectApp();
  if (latestToolResult) listener(latestToolResult);

  const legacyListener = (event: Event) => {
    const globals = (event as CustomEvent<{ globals?: Record<string, unknown> }>).detail?.globals;
    const structuredContent = asRecord(globals?.toolOutput ?? window.openai?.toolOutput);
    const _meta = findToolResultMeta(
      globals?.toolResponseMetadata ?? window.openai?.toolResponseMetadata
    );
    if (structuredContent || _meta) {
      listener({
        ...(structuredContent ? { structuredContent } : {}),
        ...(_meta ? { _meta } : {})
      });
    }
  };
  window.addEventListener("openai:set_globals", legacyListener);

  return () => {
    toolResultListeners.delete(listener);
    window.removeEventListener("openai:set_globals", legacyListener);
  };
}

export function subscribeHostContext(
  listener: (context: ReadingHostContext) => void
): () => void {
  const legacyListener = (event: Event) => {
    listener((event as CustomEvent<ReadingHostContext>).detail ?? {});
  };
  window.addEventListener("openai:host-context-changed", legacyListener);

  const bridge = connectApp();
  const bridgeListener = (context: ReadingHostContext) => listener(context);
  if (bridge) {
    bridge.addEventListener("hostcontextchanged", bridgeListener);
    void appReady?.then(() => listener((bridge.getHostContext() ?? {}) as ReadingHostContext));
  } else if (window.openai?.hostContext) {
    listener(window.openai.hostContext);
  }

  return () => {
    window.removeEventListener("openai:host-context-changed", legacyListener);
    bridge?.removeEventListener("hostcontextchanged", bridgeListener);
  };
}

export const fileCapabilities = {
  uploadFile: () => window.openai?.uploadFile,
  selectFiles: () => window.openai?.selectFiles,
  getFileDownloadUrl: () => window.openai?.getFileDownloadUrl
};

function publishToolResult(result: ToolCallResult) {
  latestToolResult = result;
  for (const listener of toolResultListeners) listener(result);
}

function findToolResultMeta(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 4) return undefined;
  const record = asRecord(value);
  if (!record) return undefined;
  const meta = asRecord(record._meta);
  if (meta) return meta;
  for (const key of ["mcp_tool_result", "call_tool_result", "result"]) {
    const nested = findToolResultMeta(record[key], depth + 1);
    if (nested) return nested;
  }
  return "sourceEndpointBase" in record ? record : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
