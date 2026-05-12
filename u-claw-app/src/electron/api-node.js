// ===== Node.js API Request Helper =====
import axios from 'axios'; 
import { API_BASE } from "./utils/env.js";

function apiRequest(path, options = {}) { 
  let method = 'GET';
  let body = null; 
  let timeout = 0;

  if (options && typeof options === 'object' && Object.keys(options).length > 0) {
    if (options.method) {
      method = options.method;
      body = options.body; 
      if (options.timeout) timeout = options.timeout;
    } else {
      body = options;
      method = 'POST';
    }
  }

  const url = `${API_BASE}${path}`;
  const timestamp = new Date().toLocaleTimeString();

  // 打印请求
  console.log(`%c[API] %c${timestamp} %c${method} %c${path}`);
  if (body) {
    console.log(`%c[API] %cBody:`, body);
  }

  const config = { method, url, headers: { 'Content-Type': 'application/json' }, timeout };
  if (body) config.data = body;

  return axios(config)
    .then(res => {
      const parsed = res.data;
      if (parsed.success) {
        console.log(`%c[API] %c${path} %c✓ OK`, parsed);
      } else {
        console.log(`%c[API] %c${path} %c✗ ${parsed.message || 'failed'}`, parsed);
      }
      return parsed;
    })
    .catch(e => {
      if (e.code === 'ECONNABORTED' || e.message.includes('timeout')) {
        console.log(`%c[API] %c${path} %c✗ Request Timeout`);
        return { success: false, message: 'Request timeout' };
      }
      console.log(`%c[API] %c${path} %c✗ Network Error: ${e.message}`);
      return { success: false, message: e.message };
    });
}

export { apiRequest };