import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.log(`L&L 共读小窝 MCP server: http://localhost:${port}/mcp`);
});
