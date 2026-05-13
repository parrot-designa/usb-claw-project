# 单窗口激活与主界面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 将激活窗口和主窗口合并为同一个 BrowserWindow，通过路由切换实现激活流程与主界面的分离。

**架构:** 共用 `mainWindow` 窗口，激活流程在窗口内完成，激活成功后通过 `loadURL`/`loadFile` 切换到主界面。

**技术栈:** Electron BrowserWindow, Vue Router (hash mode), IPC

---

## 文件修改概览

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `window-manager.js` | 修改 | 添加 `navigateTo(route)` 方法，支持窗口内路由切换 |
| `activation.js` | 修改 | 移除独立窗口创建逻辑，改为 IPC 路由切换 |
| `main.js` | 修改 | 移除独立的激活窗口调用，改用单窗口流程 |
| `preload.js` | 修改 | 添加 `ipcNavigateTo` 暴露给渲染进程 |
| `register-ipc-handlers.js` | 修改 | `check-passed` 成功后调用 `navigateTo('/main')` |
| `main/router/index.js` | 修改 | 添加激活页面路由 `/activate` |

---

## Task 1: 修改 window-manager.js 添加 navigateTo 方法

**文件:**
- Modify: `u-claw-app/src/electron/window-manager.js:68-88`

- [ ] **Step 1: 添加 navigateTo 方法**

在 `loadConfigPage` 函数后添加：

```javascript
export function navigateTo(route) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('[navigateTo] mainWindow is null or destroyed');
    return;
  }

  if (IS_DEV) {
    const url = `http://localhost:${RENDER_PORT}${route}`;
    console.log('[navigateTo] DEV: loading', url);
    mainWindow.loadURL(url);
  } else {
    // 生产模式：使用 hash 路由
    const indexPath = path.join(import.meta.dirname, '..', 'assets', 'main', 'index.html');
    const hashUrl = `file://${indexPath}#${route}`;
    console.log('[navigateTo] PROD: loading', hashUrl);
    mainWindow.loadURL(hashUrl);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add u-claw-app/src/electron/window-manager.js
git commit -m "feat: add navigateTo function for single window routing"
```

---

## Task 2: 修改 preload.js 添加 ipcNavigateTo

**文件:**
- Modify: `u-claw-app/src/electron/preload.js`

- [ ] **Step 1: 在 contextBridge.exposeInMainWorld 中添加**

在 `ipcCheckPassed` 后添加：

```javascript
ipcCheckPassed: () => ipcRenderer.invoke('check-passed'),
// 路由导航（单窗口模式）
ipcNavigateTo: (route) => ipcRenderer.invoke('navigate-to', route),
```

- [ ] **Step 2: 提交**

```bash
git add u-claw-app/src/electron/preload.js
git commit -m "feat: add ipcNavigateTo preload API"
```

---

## Task 3: 修改 activation.js 移除独立窗口创建

**文件:**
- Modify: `u-claw-app/src/electron/activation.js:163-219`

- [ ] **Step 1: 移除 showActivateDialog 函数并替换为导出函数**

将 `showActivateDialog` 函数替换为：

```javascript
// 导出空函数（保持 API 兼容）
function showActivateDialog() {
  console.log('[activation] showActivateDialog called (now a no-op, using single window)');
}

// 导出空函数（保持 API 兼容）
function closeActivateWindow() {
  console.log('[activation] closeActivateWindow called (now a no-op)');
}
```

- [ ] **Step 2: 提交**

```bash
git add u-claw-app/src/electron/activation.js
git commit -m "refactor: remove独立激活窗口，改用单窗口模式"
```

---

## Task 4: 修改 register-ipc-handlers.js check-passed 逻辑

**文件:**
- Modify: `u-claw-app/src/electron/register-ipc-handlers.js:141-144`

- [ ] **Step 1: 添加 navigate-to IPC handler**

在 `check-passed` handler 后添加：

```javascript
ipcMain.handle('navigate-to', async (_, route) => {
  const { navigateTo } = await import('./window-manager.js');
  navigateTo(route);
  return { ok: true };
});
```

- [ ] **Step 2: 修改 check-passed handler**

当前 `check-passed` 只调用 `resumeStartup()`。需要确保 `check-passed` 在激活成功时被调用，然后触发路由切换。

检查当前的 `activation-success` handler（在 activation.js 中）是否正确调用。确认后不需要修改 `check-passed` 的基本逻辑，但需要确认 `check-passed` 在激活成功后被调用。

查看 `activate/App.vue` 第 149 行：`await window.uclaw.ipcCheckPassed();` 在激活成功后调用。这意味着 `check-passed` 已经触发 `resumeStartup()`。

**但注意**：当前流程中 `check-passed` 只调用 `resumeStartup()`，不负责路由切换。路由切换应该在 `activation-success` IPC handler 中进行。

需要确认 `activation-success` 是否已调用 `navigateTo`：

查看 `activation.js:273`：
```javascript
ipcMain.handle('activation-success', () => {
  app.activationSucceeded = true;
  closeActivateWindow();
  resumeStartup();
});
```

需要修改为：
```javascript
ipcMain.handle('activation-success', async () => {
  app.activationSucceeded = true;
  const { navigateTo } = await import('./window-manager.js');
  navigateTo('/main');
  resumeStartup();
});
```

同时需要修改 `check-passed` 的处理，让它知道激活已成功：

```javascript
ipcMain.handle('check-passed', async () => {
  const { navigateTo } = await import('./window-manager.js');
  // 激活检查通过，导航到主界面
  navigateTo('/main');
  resumeStartup();
  return { ok: true };
});
```

- [ ] **Step 3: 提交**

```bash
git add u-claw-app/src/electron/register-ipc-handlers.js
git commit -m "feat: update check-passed to navigate to main after activation"
```

---

## Task 5: 修改 main.js 启动流程

**文件:**
- Modify: `u-claw-app/src/electron/main.js:53-79`

- [ ] **Step 1: 修改启动流程**

移除：
```javascript
// 第1步：显示激活窗口（检查逻辑在激活窗口的 UI 中进行）
showActivateDialog();
// 等待激活完成
await waitForActivation();

// 第7步：关闭激活窗口并创建主窗口
closeActivateWindow();
```

替换为：
```javascript
// 第1步：创建主窗口
createWindow();

// 第2步：等待激活完成（窗口内加载激活页面）
await waitForActivation();
```

注意：`createWindow()` 内部会调用 `loadConfigPage()`，但我们需要先显示激活页面。所以需要在 `createWindow()` 后手动加载激活页面路由。

- [ ] **Step 2: 在 createWindow() 后添加路由加载**

在 `createWindow()` 后添加：

```javascript
createWindow();

// 初始加载激活页面
const { navigateTo } = await import('./window-manager.js');
navigateTo('/activate');
```

- [ ] **Step 3: 提交**

```bash
git add u-claw-app/src/electron/main.js
git commit -m "feat: use single window for activation and main interface"
```

---

## Task 6: 修改 main/router/index.js 添加激活路由

**文件:**
- Modify: `u-claw-app/src/renderer/main/router/index.js:12-23`

- [ ] **Step 1: 添加激活页面路由**

由于 `activate` 是一个独立的 Vue 应用（有自己的 main.js 和 App.vue），我们需要让主应用能够显示激活页面。

有两种方案：
1. 将激活页面的 Vue 组件移到主应用中
2. 使用动态导入加载激活页面

考虑到激活页面是一个完整的独立流程，建议使用方案 1：将激活页面组件移到主应用中。

但这需要较大的重构。更简单的方案是：
- 在 `main/router/index.js` 中添加一个重定向路由
- 或者创建一个简单的激活视图组件

由于时间关系，我们采用简化方案：在主应用中创建一个空的 `/activate` 路由，它只是重定向回主界面（因为激活应该在独立的激活 HTML 中完成）。

**但这不是最佳方案**，更好的方案是：

让主应用的入口点检测 URL hash，如果是 `/activate` 则显示激活页面，否则显示主界面。

修改 `main.js`：

```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 检查初始路由
const initialRoute = window.location.hash.replace('#', '') || '/';
if (initialRoute !== '/' && router.hasRoute(initialRoute)) {
  router.push(initialRoute);
} else {
  // 默认重定向到 /home
  router.push('/home');
}

app.mount('#app');
```

这样，当 `navigateTo('/activate')` 被调用时（生产模式 hash 路由），URL 变为 `#/activate`，主应用会尝试导航到 `/activate`。但由于主应用的路由表中没有 `/activate`，会匹配到 `/` 然后重定向到 `/home`。

需要在主应用的路由表中添加一个 `/activate` 路由，或者创建一个 Catch-All 路由来处理未知路由。

**最佳方案**：让主应用检测 URL hash，如果 hash 是 `/activate`，则挂载激活页面的 Vue 应用而不是主应用。

但这需要更多的重构。考虑到改动量，我们采用以下方案：

1. 创建一个简单的激活占位页面 `/activate`，显示"正在加载激活页面..."
2. 在 `check-passed` 或 `activation-success` 时，通过 `navigateTo('/main')` 切换到主界面

实际上，最简单的方案是：
- 在 main.js 中检测 URL hash
- 如果 hash 是 `/activate`，则不挂载主应用，而是直接显示一个简单的消息

但这违背了单窗口的初衷。

**最终方案**：
由于 `main/index.html` 和 `activate/index.html` 是两个独立的构建产物，我们不能简单地在它们之间切换。我们需要一个统一的入口页面来处理路由。

**更好的方案**：
修改 `loadConfigPage()` 和 `createWindow()` 的逻辑，让主窗口初始加载 `activate/index.html`，激活成功后再加载 `main/index.html`。

这需要在 `window-manager.js` 中添加一个新的方法 `loadActivationPage()`，它加载 `activate/index.html` 而不是 `main/index.html`。

但生产模式下，`activate/index.html` 和 `main/index.html` 是两个不同的构建产物。需要确认构建输出目录结构。

根据设计文档：
- `main/index.html` → 主界面
- `activate/index.html` → 激活页面（目前在 `renderer/activate/index.html`）

如果激活页面也在 `assets/activate/index.html`，那么我们可以在 `loadActivationPage()` 中加载它。

**实施步骤**：

1. 在 `window-manager.js` 中添加 `loadActivationPage()` 函数
2. 修改 `main.js` 启动流程：先 `createWindow()`，然后 `loadActivationPage()`
3. `check-passed` 成功后调用 `loadConfigPage()` 切换到主界面

- [ ] **Step 1: 修改 window-manager.js 添加 loadActivationPage**

在 `loadConfigPage` 后添加：

```javascript
export function loadActivationPage() {
  if (!mainWindow) {
    console.warn('[loadActivationPage] mainWindow is null');
    return;
  }

  if (IS_DEV) {
    mainWindow.loadURL(`http://localhost:${RENDER_PORT}/activate/index.html`);
  } else {
    const activatePath = path.join(import.meta.dirname, '..', 'assets', 'activate', 'index.html');
    console.log('[loadActivationPage] PROD: loading', activatePath);
    mainWindow.loadFile(activatePath);
  }
}
```

- [ ] **Step 2: 修改 window-manager.js 的 loadConfigPage 移除初始调用**

当前 `loadConfigPage` 在 `createWindow()` 末尾被调用。需要移除这个调用，让启动流程由 main.js 控制。

找到 `createWindow()` 函数末尾的 `loadConfigPage()` 调用并移除。

- [ ] **Step 3: 修改 main.js 启动流程**

```javascript
createWindow();
loadActivationPage();
await waitForActivation();
loadConfigPage();
```

- [ ] **Step 4: 提交**

```bash
git add u-claw-app/src/electron/window-manager.js u-claw-app/src/electron/main.js
git commit -m "feat: single window activation flow"
```

---

## Task 7: 验证构建配置

**文件:**
- 检查: `u-claw-app/` 构建配置

- [ ] **Step 1: 确认激活页面的构建输出目录**

检查 `vite.config.js` 或类似配置，确认 `renderer/activate` 的构建输出是否在 `assets/activate/index.html`。

如果没有配置，需要添加。

- [ ] **Step 2: 提交**

```bash
git add [构建配置文件]
git commit -m "config: ensure activate page builds to assets/activate"
```

---

## 实施检查清单

完成所有任务后，验证：

1. [ ] 开发模式下，激活流程正常工作
2. [ ] 生产模式下，激活流程正常工作
3. [ ] 激活成功后正确切换到主界面
4. [ ] 没有独立的激活窗口被创建
5. [ ] 闪屏窗口正常工作
6. [ ] 主界面的所有功能正常

---

## 风险与注意事项

1. **构建配置**：需要确保 `activate/index.html` 在生产环境中可访问
2. **路由**：使用 hash 路由，在 Electron 中 `loadURL('file://...#route')` 应该可以工作
3. **时序**：确保 `waitForActivation()` 在 `loadActivationPage()` 之后被调用