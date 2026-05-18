import { app } from "electron";

export const IS_DEV = !app.isPackaged;

export const env = {
  get(key, defaultValue) {
    return process.env[key] ?? defaultValue;
  },
  rendererPort: process.env.VITE_RENDERER_PORT ?? 8080,
  apiHost: process.env.VITE_UCLAW_API_HOST ?? 'localhost',
  apiPort: process.env.VITE_UCLAW_API_PORT ?? 3000,
  appName:  process.env.VITE_APP_NAME,
  gatewayDefaultPort: process.env.VITE_GATEWAY_DEFAULT_PORT,
  gatewayMaxPort:  process.env.VITE_GATEWAY_MAX_PORT,
  gatewayStartUpTimeout: process.env.VITE_GATEWAY_STARTUP_TIMEOUT
}; 
export const APP_NAME = env.appName;
export const GATEWAY_DEFAULT_PORT = Number(env.gatewayDefaultPort);
export const GATEWAY_MAX_PORT = env.gatewayMaxPort;
export const GATEWAY_STARTUP_TIMEOUT = env.gatewayStartUpTimeout;
export const API_HOST = env.apiHost;
export const API_PORT = env.apiPort;
export const API_BASE = `http://${API_HOST}:${API_PORT}`;
export const RENDER_PORT = env.rendererPort;
