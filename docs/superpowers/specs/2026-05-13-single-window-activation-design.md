# 单窗口激活与主界面设计方案

## 目标

将激活窗口和主窗口合并为同一个 BrowserWindow，通过路由切换实现激活流程与主界面的分离。

## 背景

当前架构使用两个独立的 BrowserWindow：
- `activateWindow`：激活专用窗口 (420x530)
- `mainWindow`：主界面窗口 (1200x800)

多窗口架构存在管理复杂度高、状态同步困难等问题。

## 设计方案

### 核心思路

**共用一个 `mainWindow` 窗口，通过路由切换实现激活和主界面的分离。**

### 流程对比

**当前流程：**
```
showActivateDialog() → [激活窗口] → waitForActivation() → closeActivateWindow() → createWindow() → [主窗口]
```

**新流程：**
```
createWindow() → [窗口加载 /activate 路由] → [激活页面] → 激活成功 → [窗口内切换到 /main 路由]
```

### 文件修改

#### 1. window-manager.js

添加路由导航方法：

```javascript
export function navigateTo(route) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (IS_DEV) {
    mainWindow.loadURL(`http://localhost:${RENDER_PORT}${route}`);
  } else {
    const indexPath = path.join(import.meta.dirname, '..', 'assets', 'main', 'index.html');
    mainWindow.loadFile(indexPath, { hash: route });
  }
}
```

#### 2. activation.js

- 移除独立的 `BrowserWindow` 创建逻辑
- 激活成功后发送 IPC 消息触发路由切换

```javascript
// 激活成功时通知主窗口切换路由
ipcMain.handle('activation-success', () => {
  app.activationSucceeded = true;
  // 通过 window-manager 切换到主界面
  navigateTo('/main');
});
```

#### 3. main.js

修改启动流程：

```javascript
// 移除 showActivateDialog() 和 closeActivateWindow()

// 第1步：创建主窗口
createWindow();

// 第2步：检查是否已激活
// - 已激活：直接加载主界面
// - 未激活：加载激活页面（由前端路由处理）
```

### 激活流程状态保持

激活页面需要在未激活时阻止进入主界面：
- 前端路由守卫：检测到未激活则重定向到 `/activate`
- 或激活页面作为默认首页，激活成功后才显示主界面入口

### 路由设计

| 路由 | 说明 |
|------|------|
| `/activate` | 激活页面 |
| `/main` | 主界面 |

## 优点

1. **代码改动最小**：主要修改启动流程，激活逻辑保持不变
2. **状态管理简单**：单一窗口，状态同步更可靠
3. **用户体验更好**：无窗口闪烁，切换更流畅
4. **闪屏窗口可保留**：提供更好的启动体验

## 实施步骤

1. 修改 window-manager.js，添加 `navigateTo()` 方法
2. 修改 activation.js，移除独立窗口创建，改为 IPC 路由切换
3. 修改 main.js，更新启动流程
4. 验证激活流程和主界面功能正常

## 风险与注意事项

- 确保激活未完成时用户无法通过 URL 直接访问 `/main`
- 开发模式下路由切换需正确处理端口和路径
