# 同步 PDFCraft 上游更新

当 [PDFCraftTool/pdfcraft](https://github.com/PDFCraftTool/pdfcraft) 发布更新时，先把上游代码合到一条同步分支，验证简体中文界面和 EdgeOne 构建，再通过 PR 合并到 [Marukon/pdfcraft](https://github.com/Marukon/pdfcraft) 的 `main`。`main` 关联生产环境，未经验证的同步分支留在生产之外。

## 开始前

- 在 GitHub 的 **Actions → Fork Sync** 检查工作流状态。仓库里的 [Fork Sync 配置](.github/workflows/sync-fork.yml) 会在定时触发时尝试直接同步到 `main`。如果已启用，建议先停用这个工作流，再按本文走 PR；保留 EdgeOne 对 `main` 的自动部署。
- 准备 Git、Node.js 22 和 npm。下面的命令在 PowerShell 中运行。推送同步分支时，使用对 `Marukon/pdfcraft` 有写入权限的 GitHub 账号。
- 若自己也有未提交的改动，保留原工作目录，使用下面的独立同步目录。两个目录共享 Git 历史，各自有工作文件和构建结果。

## 1. 首次同步：添加上游

在自己的 PDFCraft 仓库根目录运行：

```powershell
git remote -v
git rev-parse --is-shallow-repository
```

`origin` 应指向 `Marukon/pdfcraft`。如果第二条命令输出 `true`，先补齐历史。如果列表里还没有 `upstream`，再添加它。每条命令成功后继续：

```powershell
git fetch --unshallow origin
# 仅在尚未配置 upstream 时执行：
git remote add upstream https://github.com/PDFCraftTool/pdfcraft.git
git remote get-url upstream
```

如果仓库已经不是浅克隆，跳过 `--unshallow`。如果 `upstream` 已存在，核对它是否确实指向 `PDFCraftTool/pdfcraft`；地址不对时先解决来源问题。

## 2. 每次更新：在独立分支合并

在自己的仓库根目录运行。这会在仓库旁边建一个临时工作目录，生产分支和原目录都保持原样：

```powershell
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw '获取自己的 main 失败' }
git fetch upstream main
if ($LASTEXITCODE -ne 0) { throw '获取上游 main 失败' }

$repo = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw '请从 PDFCraft 仓库运行' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$branch = "sync/upstream-$stamp"
$worktree = Join-Path (Split-Path $repo) "pdfcraft-sync-$stamp"

git worktree add -b $branch $worktree origin/main
if ($LASTEXITCODE -ne 0) { throw '创建同步工作目录失败' }
Set-Location -LiteralPath $worktree

git merge upstream/main
```

- 如果 Git 报告已经是最新版本，本次可以结束。
- 如果出现冲突，用 `git status` 和 `git diff --name-only --diff-filter=U` 定位文件。逐段合入上游变化并保留下节的约定；每改完一个文件，用 `git add -- <文件路径>` 标记。全部处理后用 `git merge --continue` 完成合并。
- 如果 Git 提示无共同历史，先核对上游地址和浅克隆状态。不要用 `--allow-unrelated-histories` 强行继续。在干净的同步分支上，如果决定撤销尚未完成的合并，可以运行 `git merge --abort`。

## 3. 合并后核对两项约定

Git 即使没有报冲突，也要检查这两项。上游新增文件可能直接合进来。

### 界面只发布简体中文

- [语言注册表](src/lib/i18n/config.ts)中，`locales` 只包含 `zh`，`defaultLocale` 为 `zh`。首页进入 `/zh/`；不要恢复其他语言路由或页脚的界面语言切换。
- 核对 [请求语言配置](src/i18n/request.ts)、[翻译加载](src/lib/i18n/fallback.ts)、[简体翻译](messages/zh.json)和[工具文案入口](src/config/tool-content/index.ts)。上游新增功能时，合入它需要的简体翻译键、工具名称和说明；如果只有英文文案，补齐对应的简体内容再发布。
- 如果上游重新带入其他界面资源，检查 `messages/`、`src/config/tool-content/` 和两套 PDF.js 查看器的 `locale` 目录。界面语言和 OCR 识别语种是两回事，保留 OCR 语种、PDF 字体与 CMap 资源。

### EdgeOne 发布目录和 Office 分片保持配套

| 位置 | 核对什么 |
| --- | --- |
| [package.json](package.json)、[edgeone.json](edgeone.json)、[next.config.js](next.config.js) | 保留 EdgeOne 专用构建入口、`edgeone-dist` 输出、跨源隔离响应头，以及专用构建的低资源设置。 |
| [build-edgeone.mjs](scripts/build-edgeone.mjs)、[prepare-edgeone.mjs](scripts/prepare-edgeone.mjs) | 把已压缩的 LibreOffice 引擎拆成不超过 20 MB 的分片，生成对应清单。`out` 和 `edgeone-dist` 都应产出同一套已检查的静态站点；EdgeOne 的 Next 适配器有时会读取 `out`。 |
| [asset-loader.ts](src/lib/utils/asset-loader.ts)、[converter.ts](src/lib/libreoffice/converter.ts) | Office 工具能下载清单和分片，在浏览器中重组并解压。同步上游引擎或改文件名时，保留这条构建到浏览器的链路，并重新实测。 |

两个完整的 `soffice.*.bin.gz` 保留在源码的 `public/libreoffice-wasm/` 中，作为分片输入；它们不应出现在任一发布目录。Office 转 PDF 功能继续保留。

## 4. 验收后再合入生产

在独立同步目录安装锁定的依赖并执行生产构建。以下命令任一步失败都应先修复；不要用上次构建留下的目录当作本次通过：

```powershell
npm ci --ignore-scripts
if ($LASTEXITCODE -ne 0) { throw '依赖安装失败' }
npm run build:edgeone
if ($LASTEXITCODE -ne 0) { throw 'EdgeOne 构建失败' }
```

发布前按下面三项检查：

1. **页面**：首页能打开并进入 `/zh/`，新增工具显示简体文案。检查 `out` 和 `edgeone-dist`，都应有 `index.html` 和 `zh/index.html`；`en/index.html`、`zh-TW/index.html` 等其他语言首页不应出现。
2. **配额和分片**：构建日志应显示两个目录已就绪。发布文件最多 **20,000 个**，单文件最多 **25,000,000 字节（25 MB）**。两个目录的 `libreoffice-wasm/` 都应有引擎和数据对应的 `.manifest.json` 与 `.part_*`，没有完整的 `soffice.wasm.bin.gz` 或 `soffice.data.bin.gz`。
3. **Office 转 PDF**：用一份普通的测试 `.docx` 实际转换并打开下载的 PDF，确认可读。如果用本地静态预览，服务必须配置 [发布所用的跨源隔离标头](edgeone.json)；也可以用已启用的 EdgeOne 预览环境。直接双击本地 HTML 无法验证这条链路。

通过后，从同步分支推送到自己的仓库：

```powershell
git push -u origin HEAD
```

在 GitHub 开 PR，目标选 `Marukon/pdfcraft:main`。推荐用 **Create a merge commit**，保留已经合进来的上游提交关系，便于下次同步。PR 合并后，到 EdgeOne 的「构建部署」查看对应提交是否在 **Production** 成功；再打开 [正式站点](https://pdf.zhangxuhu.com/zh/) 确认首页和关键工具。

## 常见故障

| 现象 | 处理 |
| --- | --- |
| 配额检查报 `soffice.wasm.bin.gz` 或 `soffice.data.bin.gz` 超限 | 核对日志是否运行了 `npm run build:edgeone`，并确认两个输出目录都是分片后的版本。控制台配置见 [DEPLOYMENT.md](DEPLOYMENT.md#edgeone-pages-中文站)。 |
| 日志出现 `ENOSPC` | 构建空间耗尽。先核对是否意外恢复了其他语言的页面、是否仍走专用构建。发布文件通过两项配额，也可能在构建阶段耗尽空间。 |
| Word 工具报 `SharedArrayBuffer` 不可用，或分片请求失败 | 检查页面响应的跨源隔离标头，以及清单和分片是否能从同一站点加载。先用一份小 `.docx` 重现并定位失败步骤。 |
| 线上构建失败 | 在同步分支修复后再合并。先在 EdgeOne 确认当前生效的部署；只有新版本已生效且出现回归时，才回滚到上一笔成功的生产部署。 |
