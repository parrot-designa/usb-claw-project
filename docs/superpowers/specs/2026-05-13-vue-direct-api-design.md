# Vue 端直接调用 API，移除 IPC 通信

日期：2026-05-13

## 目标

将激活窗口视作登录页面，登录成功后获取 `session_cookie`，存储在 Vue 端（Pinia store），后续接口请求直接从 Vue 端获取 cookie，不再通过 IPC 通信。

## 现状分析

当前流程：
1. `Activate.vue` → IPC `check-step-login` → Electron → API
2. API 返回 `session_cookie` 存入 `runtimeStore`（Electron 端）
3. 前端通过 `ipcGetSessionCookie()` 获取 cookie 再发送请求

问题：激活/登录接口需要绕道 IPC，增加复杂度。

## 实施方案

### 1. 新增 Pinia session store

文件：`src/renderer/main/stores/session.js`

```js
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessionCookie: null,
  }),
  actions: {
    setSessionCookie(cookie) {
      this.sessionCookie = cookie
    },
    clearSessionCookie() {
      this.sessionCookie = null
    },
  },
})
```

### 2. 修改 api.js

文件：`src/renderer/js/api.js`

修改 `apiRequest` 函数，从 Pinia store 优先获取 cookie：

```js
import { useSessionStore } from '@/main/stores/session'

export async function apiRequest(path, options = {}) {
  const sessionStore = useSessionStore()

  let method = options.method || 'GET'
  let data = options.body || null
  let params = options.params || null
  let headers = options.headers || null

  // 优先从 Pinia store 获取 session_cookie
  const sessionCookie = sessionStore.sessionCookie || await window.uclaw?.ipcGetSessionCookie()
  // ... 后续逻辑不变
}
```

### 3. 修改 ActivateForm.vue

文件：`src/renderer/activate/components/ActivateForm.vue`

移除 `ipcDoBindActivation` IPC 调用，改为直接 `apiRequest`：

```js
import { apiRequest } from '@renderer/js/api'
import { useSessionStore } from '@main/stores/session'

const sessionStore = useSessionStore()

async function handleActivate() {
  const result = await apiRequest('/api/usb_key/login', {
    method: 'POST',
    body: { serial_number: serial, activation_code: activationCode }
  })

  if (result.success && result.data?.session_cookie) {
    sessionStore.setSessionCookie(result.data.session_cookie)
  }
}
```

### 4. 修改 Activate.vue（激活窗口检查流程）

文件：`src/renderer/activate/App.vue`

将 `check-step-login` IPC 调用改为直接 API 调用：

```js
// Step 3.5: 登录接口校验 - 直接调用 API
const loginResult = await apiRequest('/api/usb_key/login', {
  method: 'POST',
  body: { serial_number: serial, activation_code: activation_code }
})

if (loginResult.success && loginResult.data?.session_cookie) {
  sessionStore.setSessionCookie(loginResult.data.session_cookie)
}
```

### 5. 修改 main/views/Activate.vue

文件：`src/renderer/main/views/Activate.vue`

同样将 IPC 调用改为直接 API 调用。

## 跨域处理

使用 Vite 代理（已有配置）：
- 开发环境：`/api` → `VITE_UCLAW_API_BASE`
- 生产环境：同上代理配置

## 影响范围

需修改的文件：
- 新增：`src/renderer/main/stores/session.js`
- 修改：`src/renderer/js/api.js`
- 修改：`src/renderer/activate/components/ActivateForm.vue`
- 修改：`src/renderer/activate/App.vue`
- 修改：`src/renderer/main/views/Activate.vue`

## 优势

1. **减少 IPC 调用**：激活、登录接口直接前端调用
2. **代码更清晰**：Vue 组件直接处理业务逻辑
3. **session_cookie 统一管理**：Pinia store 便于访问