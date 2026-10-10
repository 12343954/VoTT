# VoTT Electron/macOS Migration Plan

目标：保留现有 React Class Component 写法，优先升级 Electron 桌面端运行与打包能力，让 Windows 继续可用，并逐步恢复 macOS 可用性。

## 原则

- 不重写 UI，不强制迁移到 Function Component。
- 先拆 Electron 兼容层，再升级 Electron 版本。
- 每一步保持可运行、可回退，避免一次性升级 React/CRA/TypeScript/Electron 全家桶。
- 优先处理桌面端核心路径：启动、本地文件读写、项目打开保存、图片/视频标注、导出。

## 当前基线

- Electron: 3.0.13
- electron-builder: 22.6.0
- React: 16.7
- react-scripts: 2.1.1
- TypeScript: 3.1.6
- Webpack: 4.19
- node-sass: 4.14.1

关键风险：

- 渲染进程直接使用 `window.require("electron")`。
- 依赖 `electron.remote`，高版本 Electron 已废弃/移除。
- `dialog.showOpenDialog` 使用旧版同步 API。
- `node-sass@4` 对现代 Node/macOS 支持差。
- 构建链整体偏旧，直接跳到最新版 Electron 风险高。

## 阶段 0：建立安全基线

- 新目录：`D:\Code\electron\VoTT-master-20261008`
- 工作分支：`codex/electron-macos-migration`
- 保留旧目录作为行为对照。
- 记录当前可运行命令、Node/npm 版本、现有失败点。

已确认：

- 当前 Node: `v24.15.0`
- 当前 npm: `11.12.1`
- `npm ci` 失败在 `node-sass@4.14.1`：
  - `node-gyp@3.8.0` 不支持当前 Node。
  - 构建脚本仍按 Python 2 语法检测 Python。
  - 当前系统 Python 是 Python 3，因此触发 `Missing parentheses in call to 'print'`。
- 这证明不能直接用现代 Node 安装旧依赖，需要先切旧 Node 跑通基线，或先替换 `node-sass`。
- 使用 nvm 中已有的 Node `10.24.1` / npm `6.14.12` 后：
  - `npm ci` 成功。
  - `npm run compile` 成功。
  - `npm run webpack:prod` 成功。
  - `npm run build` 成功。
- 结论：旧项目在 Node 10 下基线健康；升级难点来自现代 Node/Electron 兼容断层。

验收：

- 能明确当前环境下 `npm install`、`npm run build`、`npm run electron:run:dev` 的成功/失败原因。

## 阶段 1：抽出 Electron 兼容层

目标：业务代码不再直接依赖 Electron 老 API。

工作项：

- 新增 `preload` 入口。
- 通过 `contextBridge` 暴露最小 API，例如：
  - `ipc.send`
  - `app.getAppPath`
  - `window.minimize/maximize/unmaximize/close`
  - `window.isMaximized/isFullScreen`
  - `menu.getApplicationMenu`
- 改造这些文件：
  - `src/common/ipcRendererProxy.ts`
  - `src/services/activeLearningService.ts`
  - `src/react/components/shell/titleBar.tsx`
- 保留 Class Component。

验收：

- `rg "remote|window.require" src` 不再命中业务代码。
- Electron 3 下仍能启动，避免边拆边升级导致问题叠加。

已完成：

- 新增 `src/electron/preload.ts`，统一暴露 `window.vottElectron`。
- 新增 `src/common/electronHost.ts`，渲染层通过该模块访问 Electron 能力。
- `src/common/ipcRendererProxy.ts` 不再直接调用 `window.require("electron")`。
- `src/services/activeLearningService.ts` 不再直接使用 `electron.remote`。
- `src/react/components/shell/titleBar.tsx` 不再直接使用 `electron.remote`。
- webpack 主进程构建新增 `preload.js` 输出。
- grep 确认 `window.require` / `Electron.Remote` / `require("electron").remote` 已无命中。

验证：

- Node `10.24.1` 下 `npm run compile` 通过。
- Node `10.24.1` 下 `npm run webpack:prod` 通过。
- Node `10.24.1` 下 `npm run build` 通过。
- 相关测试通过：
  - `src/common/ipcRendererProxy.test.ts`
  - `src/services/activeLearningService.test.ts`
  - `src/react/components/shell/titleBar.test.tsx`
- `src/react/components/pages/editorPage/editorPage.test.tsx` 单独加入后仍有历史失败项，失败点集中在旧测试数据/键盘绑定/DOM mock，不作为本阶段阻塞。

## 阶段 2：先升到中间 Electron

目标：不要一步到最新版，先跨过最危险的 API 断层。

建议版本：

- Electron 11/12/13 任选一个作为第一跳。
- electron-builder 同步小幅升级。

工作项：

- 更新 `BrowserWindow.webPreferences`。
- 修复 `dialog.showOpenDialog` Promise API。
- 修复主进程 TypeScript 类型错误。
- 检查菜单、窗口控制、IPC。

验收：

- Windows 开发模式可启动。
- 本地文件夹选择、项目读写、导出可用。

已完成：

- Electron 升级到 `13.6.9`。
- electron-builder 升级到 `22.14.13`。
- preload 改为 `contextBridge.exposeInMainWorld`，不再依赖 `electron.remote`。
- 主进程新增窗口、菜单、appPath 的 IPC 桥接。
- `dialog.showOpenDialog` 改为 Electron 13 Promise API。
- 菜单 role 更新为 Electron 13 类型兼容写法。
- TypeScript 升级到 `4.9.5`。
- `react-scripts` 升级到 `4.0.3`。
- Webpack 升级到 `4.44.2`。
- `node-sass` 已移除，改用 `sass@1.69.7`。
- `video-react` 样式改用预编译 CSS，避免 Dart Sass 编译旧 SCSS 失败。

验证：

- `electron --version` 输出 `v13.6.9`。
- Node `14.21.3` 下 `npm run compile` 通过。
- Node `14.21.3` 下 `npm run webpack:prod` 通过。
- Node `14.21.3` 下 `npm run build` 通过；仅剩 CRA4 eslint warnings。
- 相关测试中 `ipcRendererProxy`、`activeLearningService` 通过；`titleBar` 测试在 CRA4/Jest26/Enzyme 下仍需后续修 mock。
- Node `16.20.2` 下 `npm run compile` 通过。
- Node `16.20.2` 下 `npm run webpack:prod` 通过。
- Node `16.20.2` 下 `npm run build` 通过；仅剩 CRA4 eslint warnings。

Apple Silicon 环境建议：

- 推荐 macOS/M2 使用 Node `16.20.2` arm64，不再继续折腾 Node 14。
- `.nvmrc` 已更新为 `16.20.2`。
- `package.json` engines 已更新为 Node `>=16.20.2 <17`、npm `>=8.19.4`。
- 若 `node -p "process.arch"` 不是 `arm64`，说明当前 Node 不是原生 ARM 版本。

待验证：

- Windows Electron 实际启动。
- macOS Apple Silicon 安装依赖、开发启动、dmg 打包。

后续补充：

- 渲染端不再直接依赖 `global.process.platform`，改由 preload 通过 `window.vottElectron.process.platform` 暴露平台信息。
- `isElectron()` 优先识别 preload bridge，避免 `nodeIntegration=false` 后误判为 browser。
- 生产态本地入口改用 `pathToFileURL(path.join(__dirname, "index.html"))`，避免 macOS/Linux `file:///` 路径拼接问题。
- macOS 窗口使用 `titleBarStyle: "hiddenInset"`，保留原生 traffic-light 按钮；Windows 继续无边框自定义标题栏。
- Windows/Node 24 下临时加 `NODE_OPTIONS=--openssl-legacy-provider` 后，`npm run webpack:prod` 与 `npm run build` 通过；目标 Node 16 不需要该临时变量。

## 阶段 3：修构建链

目标：解决现代 Node/macOS 安装失败问题。

工作项：

- `node-sass` 替换为 `sass`。
- 视情况升级 `react-scripts`，但不主动重写 React 组件。
- 修复 TypeScript/Jest/ts-loader 版本兼容。
- 保持 Webpack 主进程构建可用。

验收：

- 干净安装可完成。
- `npm run build` 和 `npm run webpack:prod` 可完成。

## 阶段 4：macOS 可运行

目标：先能在 macOS 本机开发运行，再考虑分发。

工作项：

- 修复路径、文件 URL、模型目录 `cocoSSDModel` 加载。
- 检查 macOS title bar/frame 行为。
- 检查本地文件权限和文件夹选择。
- 验证 Intel/Apple Silicon 差异。

验收：

- macOS 可以启动应用。
- 可新建项目、选择本地目录、打开图片、保存标注、导出。

## 阶段 5：macOS 打包

目标：产出可安装 dmg。

工作项：

- 升级/调整 `electron-builder.yml`。
- 支持 `x64`、`arm64`，必要时做 universal。
- 配置 appId、图标、extraFiles。
- 处理签名/公证；没有证书时先输出 unsigned dmg。

验收：

- 生成 dmg。
- dmg 安装后可启动。
- 模型文件和本地文件系统功能可用。

## 阶段 6：再考虑现代化

这些后置：

- React 16 -> 17/18。
- CRA 替换为 Vite。
- TSLint -> ESLint。
- Enzyme -> Testing Library。
- 依赖安全升级。

原因：这些不是 macOS 可用的第一阻塞点，提前做会扩大风险。

## 第一轮执行建议

1. 先跑阶段 0，拿到当前失败点。
2. 然后做阶段 1：加 preload/bridge，去掉 `remote` 和 `window.require`。
3. 阶段 1 通过后，再升 Electron。
