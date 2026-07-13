import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { READING_NEST_URI } from "./register-tools.js";

export function registerReadingResource(server: McpServer, widgetHtml: string, workerOrigin?: string) {
  const connectDomains = [workerOrigin ?? "http://localhost:8787"];
  const resourceCsp = {
    connectDomains,
    resourceDomains: []
  };
  const openaiWidgetCsp = {
    connect_domains: connectDomains,
    resource_domains: []
  };
  registerAppResource(
    server,
    "L&L 共读小窝",
    READING_NEST_URI,
    {
      description: "L&L 的移动端小说与漫画共读小窝",
      _meta: {
        ui: {
          csp: resourceCsp,
          prefersBorder: true
        },
        "openai/widgetCSP": openaiWidgetCsp,
        "openai/widgetDescription":
          "L&L 的私人共读小窝，用于阅读自己粘贴的小说文本或导入的漫画图片。"
      }
    },
    async () => {
      return {
        contents: [
          {
            uri: READING_NEST_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: widgetHtml,
            _meta: {
              ui: {
                csp: resourceCsp,
                prefersBorder: true
              },
              "openai/widgetCSP": openaiWidgetCsp,
              "openai/widgetDescription":
                "L&L 的私人共读小窝，用于阅读自己粘贴的小说文本或导入的漫画图片。",
              "openai/widgetPrefersBorder": true
            }
          }
        ]
      };
    }
  );
}
