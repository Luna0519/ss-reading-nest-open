import { createMcpHandler } from "agents/mcp";
import widgetHtml from "../../web/dist/index.html";
import { createMcpServerFromRepository } from "./mcp/server-factory.js";
import { D1ReadingRepository } from "./repositories/d1-reading-repository.js";
import { CloudSourceService } from "./services/cloud-source-service.js";
import { handleSourceRoute } from "./source-routes.js";
import { R2SourceObjectStorage } from "./storage/r2-source-object-storage.js";
import { handleStandaloneApp } from "./standalone-pwa.js";
import { getWorkerRoute } from "./worker-router.js";

type WorkerEnv = Env & { SOURCES_BUCKET?: R2Bucket };

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const route = getWorkerRoute(url, env.MCP_PATH_TOKEN);

    if (route === "health") {
      return Response.json({ ok: true, app: "L&L 共读小窝", version: "0.2.4" });
    }
    if (route === "misconfigured") {
      console.error(JSON.stringify({ message: "MCP_PATH_TOKEN is not configured" }));
      return new Response("Service unavailable", { status: 503 });
    }
    if (route === "not-found") {
      return new Response("Not found", { status: 404 });
    }
    if (route === "app") {
      return handleStandaloneApp(request, url, env.MCP_PATH_TOKEN, widgetHtml);
    }

    try {
      const repository = new D1ReadingRepository(env.DB);
      const sourceService = env.SOURCES_BUCKET
        ? new CloudSourceService(repository, new R2SourceObjectStorage(env.SOURCES_BUCKET))
        : undefined;
      if (route === "source") {
        return sourceService
          ? handleSourceRoute(request, sourceService)
          : new Response("Not found", { status: 404 });
      }
      const server = createMcpServerFromRepository(repository, widgetHtml, sourceService, {
        workerOrigin: url.origin,
        ...(sourceService
          ? { sourceEndpointBase: `${url.origin}/source/${env.MCP_PATH_TOKEN}` }
          : {})
      });
      return createMcpHandler(server, {
        route: url.pathname,
        enableJsonResponse: true
      })(request, env, ctx);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "MCP request failed",
          error: error instanceof Error ? error.message : String(error),
          path: url.pathname
        })
      );
      return Response.json(
        { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal server error" } },
        { status: 500 }
      );
    }
  }
} satisfies ExportedHandler<WorkerEnv>;
