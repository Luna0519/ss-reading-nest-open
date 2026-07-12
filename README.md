# S×S 小窝共读 / Reading Nest

一个移动端优先的 AI 共读小窝，运行在 ChatGPT Apps SDK + MCP 之上。用户可以导入自己的小说文本或漫画图片，记录自己和 AI 的阅读位置，并使用补课同步、轻量短评、书签、摘录与短评 Dock。

本项目适合个人私有部署、学习和二次改造。公开仓库只提供代码、测试和原创 demo，不包含作者的阅读内容、聊天记录或线上数据。

## 当前状态

项目仍处于早期开发阶段：

- 当前公开快照基于 `v0.2.2`。
- 小说粘贴或 TXT / Markdown 文件导入、分段与本设备续读链路基本可用。
- 当前小说使用 segmentation v3 合并短段落，正文只写入当前设备的 IndexedDB。
- 漫画内容 hash 与页码排序已修复；iOS 多图大批量导入仍需更多真机压力测试。
- 当前优先优化 iPad / iOS ChatGPT App 阅读体验。
- 桌面端布局和小说体验仍在改进。
- AI 短评手动保存可用；自动保存尚未作为默认稳定功能。
- 当前架构是个人单用户方案，不适合作为未经改造的公共多用户服务。

## 功能

- 小说粘贴或 TXT / Markdown 文件导入
- 章节识别与 segmentation v3 阅读单元分段
- 漫画图片导入与逐页阅读
- 用户阅读位置与 AI 同步位置分离
- skipped range 分批补课机制
- 轻松共读、吐槽、剧情猜测与深度分析模式
- 书签、摘录、用户反应与短评 Dock
- IndexedDB 本设备正文与漫画存储
- Cloudflare Worker 与 D1 阅读记录存储
- iPad 移动端和沉浸阅读体验

## 项目结构

```text
server/   TypeScript MCP server、Cloudflare Worker、D1 adapter（保留可选 R2 模块）
web/      React + Vite ChatGPT widget
shared/   共享数据模型、迁移和 Zod schemas
demo/     可公开使用的原创示例内容
```

## 快速开始

需要 Node.js 22+ 和 pnpm 10+。

```bash
pnpm install
pnpm build
pnpm dev
```

常用检查：

```bash
pnpm test
pnpm typecheck
pnpm build
```

本地 MCP server 默认使用：

- MCP endpoint：`http://localhost:8787/mcp`
- 健康检查：`http://localhost:8787/health`

## Cloudflare 部署

默认部署为本设备正文模式，不需要开通 R2，也不需要为存储绑定付款方式。

1. 创建免费的 Cloudflare 账号并登录 Wrangler。
2. 创建自己的 D1 database。
3. 将 `server/wrangler.jsonc` 中的 D1 database ID 改成创建命令返回的真实 ID。
4. 为 Worker 设置随机且足够长的 URL-safe `MCP_PATH_TOKEN` secret。
5. 执行迁移、构建并部署。

```bash
pnpm --filter @ss/server exec wrangler login
pnpm --filter @ss/server exec wrangler d1 create ournest
pnpm --filter @ss/server exec wrangler secret put MCP_PATH_TOKEN
pnpm --filter @ss/server exec wrangler d1 migrations apply ournest --remote
pnpm build
pnpm --filter @ss/server deploy
```

部署完成后，使用你自己的 Worker 地址与私密 MCP path 在 ChatGPT Developer Mode 中添加 app。若以后需要跨设备正文恢复，只需添加 R2 binding；Worker 会自动检测并启用云端来源，同时继续保留本设备缓存。

### 可选：启用私人 R2 双保险

R2 不是默认部署的必需项。开通 R2 subscription 后，创建一个使用 Standard storage class 的私有 bucket：

```bash
pnpm --filter @ss/server exec wrangler r2 bucket create ss-reading-nest-sources
```

然后在 `server/wrangler.jsonc` 中加入：

```jsonc
"r2_buckets": [
  {
    "binding": "SOURCES_BUCKET",
    "bucket_name": "ss-reading-nest-sources"
  }
],
```

重新部署后，组件会从隐藏的 tool metadata 得知云端功能已启用。bucket 必须保持 private，不需要配置 public URL 或自定义域名；移除 binding 后会自动回到本设备模式。

## 连接到 ChatGPT MCP

部署后要添加的是 MCP 地址，不是 `/source` 地址：

```text
https://<你的-worker域名>/mcp/<你的-MCP_PATH_TOKEN>
```

1. 确认 `https://<你的-worker域名>/health` 返回 `ok: true`。
2. 在 ChatGPT 打开 Settings → Security and login，启用 Developer mode。
3. 打开 Settings → Plugins（或 `https://chatgpt.com/plugins`），点击 `+` 创建 developer-mode app。
4. 填写名称、用途说明和上面的完整 MCP server URL。连接成功后应显示 23 个工具。
5. 新建聊天，点击输入框旁的 `+` → More，选择这个 app，再让 ChatGPT“打开 S×S 小窝共读”。

ChatGPT 要求远程 MCP endpoint 可通过 HTTPS 访问。`MCP_PATH_TOKEN` 在此单用户方案中等同于访问密钥，不要发到聊天、截图、日志或提交到 Git。当前操作以 [OpenAI 官方连接说明](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt) 为准。

## 环境变量

示例见 `.env.example`：

| 变量 | 用途 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID，可选的自动化部署配置 |
| `CLOUDFLARE_API_TOKEN` | 可选的自动化部署凭证 |
| `D1_DATABASE_ID` | 你自己的 D1 database ID |
| `MCP_PATH_TOKEN` | Worker 私密 MCP 路径 token |
| `WORKER_URL` | 已部署 Worker 的 HTTPS origin |

本项目不需要 `OPENAI_API_KEY`。模型由 ChatGPT host 提供，服务端不直接调用 OpenAI 模型 API。

## 数据与隐私

- 使用者应自行部署并管理 D1、Cloudflare secrets 与本设备缓存。
- 不要把私人聊天、日记、阅读记录、书签、摘录或用户上传源文件提交到仓库。
- 默认情况下，D1 只保存 session、位置、偏好和 source metadata；小说正文与漫画图片只写入当前设备的 IndexedDB。
- 启用可选 R2 binding 后，正文和漫画也会写入私人 R2 作为恢复副本，但不会生成 public URL 或 signed URL。
- IndexedDB 不会跨设备同步，也可能在清除 ChatGPT/浏览器数据或系统回收站点数据后丢失；请始终保留原始小说或漫画文件。
- 正文和整页图片不会作为阅读记录上传到 Worker，也不应通过聊天消息返回整本内容。
- ChatGPT 模型不会自动读取整本小说或整套漫画，只在用户主动触发时接收必要的当前阅读范围。
- 不要把受版权保护的整本书或漫画作为 demo 发布，也不建议上传到面向公众的共享服务。
- demo 应使用原创文本或确认属于公共领域的内容。

该版本仅使用随机私密路径保护个人部署，不提供完整的用户账号、认证与多租户隔离。公开提供服务前必须重新设计认证、授权、数据隔离、删除策略和滥用防护。

默认删除操作分为两层：删除云端阅读记录，以及可选地同时删除本设备正文缓存。启用 R2 后会额外出现“删除云端正文副本”选项；三者不会被隐式合并。

部署后设置 `WORKER_URL` 与 `MCP_PATH_TOKEN`，运行 `pnpm --filter @ss/server smoke:mcp` 可以验证 HTTPS、私密路由、23 个 MCP 工具和组件资源。启用 R2 时再设置 `EXPECT_CLOUD_SOURCE=true`；该 smoke test 只读，不会创建阅读记录。

## 二次开发

你可以按自己和 AI 伴侣的相处方式调整：

- UI 风格、主题和称呼
- 共读评论模式与 prompt
- 手动或自动保存策略
- 小说分段和漫画导入方式
- 本设备优先或可选云端恢复的数据策略
- 自己的 Cloudflare 私有部署方式

建议保留“用户主动触发才发送当前阅读范围”的隐私边界，并让评论保存失败不阻塞正常聊天。

## 已知问题

- iOS 上一次选择大量高分辨率漫画图片时仍需更多内存与请求体压力测试。
- 清除 ChatGPT/浏览器站点数据或卸载 App 后，本设备正文缓存可能丢失，需要重新导入原文件。
- 桌面端小说布局仍需更多适配。
- AI 评论自动保存仍不够稳定，默认建议使用手动保存。

## License

本项目基于 [MIT License](LICENSE) 开源，可以自由使用、修改和分发。使用者需自行确保导入、存储和分享内容时符合版权与当地法律要求。
