import axios from 'axios';
import { useSessionStore } from '@/stores/session.js';
import router from '@renderer/main/router/index.js';

const apiClient = axios.create({
  withCredentials: true // 支持 Cookie 认证
});

/**
 * 会话失效消息
 */
export const SESSION_INVALID_MESSAGE = '当前登录信息已失效，将自动退回到初始激活页面，请检查重新登录';

/**
 * 清除会话 cookie
 */
async function clearSessionCookie() {
  try {
    const sessionStore = useSessionStore();
    sessionStore.clearSessionCookie();
  } catch {
    // store 不可用时通过 IPC 清除
  } 
}

/**
 * 检测响应是否为会话无效错误
 * @param {object} res - axios response data
 * @returns {boolean}
 */
function isSessionInvalid(res) {
  if (!res) return false;
  return ["未登录或会话已过期","会话无效"].includes(res.message) && res.success === false
}

/**
 * 显示会话失效提示并跳转到激活页面
 */
async function handleSessionInvalid() {
  // 显示错误提示
  if (window.showToastVue) {
    window.showToastVue(SESSION_INVALID_MESSAGE, true);
  }
  // 直接使用 vue-router 跳转到激活页面
  router.push('/activate');
}

// 响应拦截器 - 统一处理会话失效
apiClient.interceptors.response.use( 
  async (response) => { 
    console.log("response==>",response); 
    const res = response.data;
    // 检测会话无效
    if (res && isSessionInvalid(res)) {
      res.sessionInvalid = true; 
      return Promise.reject(res);
    }  
    return Promise.resolve(response);
  }
);

/**
 * 通用请求函数
 * @param {string} path - 请求路径
 * @param {object} options - 请求选项
 * @param {string} options.method - 请求方法，默认 GET
 * @param {object} options.body - 请求体（POST/PUT）
 * @returns {Promise<object>} { ok, success, data, message }
 */
export async function apiRequest(path, options = {}) {
  let method = options.method || 'GET';
  let data = options.body || null;
  let params = options.params || null;
  let headers = options.headers || null;

  // 优先从 Pinia store 获取 session_cookie，否则回退到 IPC
  let sessionCookie = null;
  try {
    const sessionStore = useSessionStore();
    sessionCookie = sessionStore.sessionCookie;
  } catch {
    // store 不可用时通过 IPC 获取
  }
  if (!sessionCookie && window.uclaw?.ipcGetSessionCookie) {
    sessionCookie = await window.uclaw.ipcGetSessionCookie();
  }

  if (sessionCookie) {
    // 将 cookie 放入 data 中
    data = { ...data, session_cookie: sessionCookie };
    if(params){
      params = { ...params,session_cookie: sessionCookie };
    }
  }
  console.log("测试",data,`${import.meta.env.VITE_API_BASE_URL}${path}`)

  try {
    const res = await apiClient({
      method,
      url: `${import.meta.env.VITE_API_BASE_URL}${path}`,
      data,
      params,
      headers,
      withCredentials: true
    });
    return { ok: true, ...res.data };
  } catch (e) { 
    // 会话失效 - 拦截器已标记
    if (e.sessionInvalid) {
      await clearSessionCookie();
      await handleSessionInvalid();
      return { ok: false, sessionInvalid: true, message: SESSION_INVALID_MESSAGE, data: SESSION_INVALID_MESSAGE };
    }

    if (e.response) {
      return { ok: false, ...e.response.data };
    }
    return { ok: false, success: false, message: e.message };
  }
}

