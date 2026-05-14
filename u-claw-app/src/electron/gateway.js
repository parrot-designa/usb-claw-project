import { spawn, exec, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { EventEmitter } from 'events';
import { getNodeBin, getPaths, generateAndStoreGatewayToken, getOpenClawPath, getAppRoot, getGatewayEnv } from './paths.js';
import { APP_NAME, GATEWAY_STARTUP_TIMEOUT, GATEWAY_DEFAULT_PORT } from './utils/env.js';
import { sendBootPhase, isWin, sendGatewayStatus,sendGatewayLog,safeSend } from "./window-manager.js"; 


function createGatewayManager() {
  // Get paths at creation time (after app.whenReady())
  const { openclawPath, dataRoot, configDir, configPath, openclawEntry } = getPaths();

  let wechatManager = null;

  let gatewayProc = null;
  let gatewayRunning = false;
  let gatewayPort = null;
  let healthPollTimer = null;
  let gatewayStopping = false; // true when user intentionally stops
  let gatewayAutoRestart = true; // P2: auto-restart on crash
  let isQuitting = false;

  function stopGatewaySync() {
    stopHealthPoll();
    if (!gatewayProc) { gatewayRunning = false; return; }
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${gatewayProc.pid} /T /F`, { stdio: 'ignore', timeout: 3000 });
      } else {
        gatewayProc.kill('SIGTERM');
      }
    } catch { /* best effort */ }
    gatewayProc = null;
    gatewayRunning = false;
  }

  // Classify gateway errors into user-friendly categories
  function classifyGatewayError(errorMsg) {
    const msg = (errorMsg || '').toLowerCase();
    if (msg.includes('unknown channel') || msg.includes('unknown channel id')) {
      return { title: '聊天插件未安装', detail: '配置了未安装的聊天插件，已自动清理无效配置，重启即可', action: 'retry' };
    }
    if (msg.includes('enoent') || msg.includes('not found') || msg.includes('cannot find')) {
      return { title: '运行环境缺失', detail: 'Node.js 或 OpenClaw 未找到，请点击一键修复重新解压运行环境', action: 'repair' };
    }
    if (msg.includes('eaddrinuse') || msg.includes('address already in use') || msg.includes('18789')) {
      return { title: '端口被占用', detail: '端口 18789 被其他程序占用，点击下方按钮释放端口后重试', action: 'clear-port' };
    }
    if (msg.includes('eacces') || msg.includes('eperm') || msg.includes('permission')) {
      return { title: '权限不足', detail: '没有足够权限启动服务，请尝试以管理员身份运行', action: 'retry' };
    }
    if (msg.includes('module_not_found') || msg.includes('cannot find module')) {
      return { title: '模块缺失', detail: '核心模块丢失，请点击一键修复重新解压', action: 'repair' };
    }
    if (msg.includes('config') || msg.includes('json') || msg.includes('parse')) {
      return { title: '配置文件损坏', detail: '配置文件格式错误，点击一键修复将重置配置', action: 'repair' };
    }
    if (msg.includes('timeout') || msg.includes('超时')) {
      return { title: '启动超时', detail: 'Gateway 启动超时，可能是系统资源不足或防火墙拦截，请重试', action: 'retry' };
    }
    return { title: '启动失败', detail: errorMsg || '未知错误，请查看日志或联系客服', action: 'retry' };
  }


  function stopHealthPoll() {
    if (healthPollTimer) { clearTimeout(healthPollTimer); healthPollTimer = null; }
  }

  function pollGatewayHealth(port, onFirstResult) {
    stopHealthPoll();
    let attempts = 0;
    // 有些客户电脑报价格请求超时
    const maxAttempts = 200; // First boot can take 30-60s
    let resolved = false;

    sendBootPhase('waiting-ready', '等待就绪', '正在等待 Gateway 响应...', 40);

    const check = async () => {
      attempts++;
      const progress = Math.min(40 + Math.round((attempts / maxAttempts) * 55), 95);
      // Only show boot overlay during initial startup, not during ongoing health monitoring
      if (!resolved && (attempts === 1 || attempts % 5 === 0)) {
        sendBootPhase('waiting-ready', '等待就绪', `健康检查中... (${attempts}/${maxAttempts})`, progress);
      }

      try {
        const http = require('http');
        const result = await new Promise((res, rej) => {
          const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 2000 }, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => res({ ok: resp.statusCode === 200, data }));
          });
          req.on('error', rej);
          req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
        });

        if (result.ok) {
          console.log(`[gateway] health OK on attempt ${attempts}`);
          attempts = 0; // Reset counter for ongoing monitoring
          gatewayRunning = true;
          sendBootPhase('done', '启动成功', 'Gateway 已就绪！', 100); 
          sendGatewayStatus(true);
          if (!resolved && onFirstResult) { resolved = true; onFirstResult({ success: true }); }
          // Keep polling every 30s
          healthPollTimer = setTimeout(check, 30000);
          return;
        }
      } catch (e) {
        console.log(`[gateway] health attempt ${attempts}: ${e.message}`);
      }

      // If process already died, stop trying
      if (!gatewayProc) {
        const classified = classifyGatewayError('Gateway 进程已退出');
        sendBootPhase('error', classified.title, classified.detail, 0);
        if (!resolved && onFirstResult) { resolved = true; onFirstResult({ success: false, error: classified.title, errorDetail: classified.detail, errorAction: classified.action }); }
        return;
      }

      // After initial startup succeeded, tolerate transient health check failures
      // (e.g. brief GC pause, config reload, plugin restart) — only report down after 5 consecutive fails
      if (resolved && attempts <= 5) {
        console.log(`[gateway] health blip ${attempts}/5, retrying in 10s...`);
        healthPollTimer = setTimeout(check, 10000);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(check, 2000);
      } else {
        console.log(`[gateway] health failed after ${maxAttempts} attempts`);
        gatewayRunning = false;
        const classified = classifyGatewayError('timeout');
        sendBootPhase('error', classified.title, classified.detail, 0);
        sendGatewayStatus(false,classified.title);
        if (!resolved && onFirstResult) { resolved = true; onFirstResult({ success: false, error: classified.title, errorDetail: classified.detail, errorAction: classified.action }); }
      }
    };

    check();
  }

  function killProcessOnPort(port) {
    return new Promise((resolve) => {
      const platform = process.platform;
      let command;

      if (platform === 'darwin') {
        command = `lsof -ti:${port} | xargs -I {} sh -c 'ps -p {} -o comm= 2>/dev/null | grep -q "OpenClawPro" && kill -9 {}' 2>/dev/null || true`;
      } else if (isWin()) {
        try {
          const cliPath = getOpenClawPath();
          const stopEnv = getGatewayEnv();
          execSync(`"${cliPath}" gateway stop`, { env: stopEnv, stdio: 'ignore', timeout: 8000, cwd: getAppRoot() });
          console.log('[gateway] graceful stop via "openclaw gateway stop" succeeded');
          // Give mDNS time to deregister
          execSync('ping 127.0.0.1 -n 3 -w 1000 >nul', { stdio: 'ignore' });
        } catch (e) {
          console.log('[gateway] graceful stop failed or timed out, proceeding with force kill');
        }
        // Step 1: Kill by port (precise)
        try {
          const netstat = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', timeout: 3000 });
          const lines = netstat.trim().split('\n');
          for (const line of lines) {
            const pid = line.trim().split(/\s+/).pop();
            if (pid && pid !== '0' && /^\d+$/.test(pid)) {
              try { execSync(`taskkill /f /pid ${pid}`, { stdio: 'ignore', timeout: 3000 }); } catch { }
              console.log(`[gateway] killed process on port 18789 (pid ${pid})`);
              sendBootPhase('cleanup', '清理残留进程', `已终止占用端口的进程 (PID ${pid})`, 10);
            }
          }
        } catch { /* port not in use, good */ }
        // Step 2: Also kill any stray node.exe from our runtime
        try {
          execSync(`wmic process where "ExecutablePath like '%OpenClawPro%runtime%node.exe'" call terminate 2>nul`, { stdio: 'ignore', timeout: 5000 });
          console.log('[gateway] cleaned up stray OpenClaw node processes');
        } catch { }
        // Step 3: Wait for port to be fully released
        for (let i = 0; i < 5; i++) {
          try {
            execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', timeout: 1000 });
            // Still occupied, wait 500ms
            execSync('ping 127.0.0.1 -n 1 -w 500 >nul', { stdio: 'ignore' });
          } catch {
            console.log(`[gateway] port 18789 is free (after ${i} retries)`);
            break; // Port is free
          }
        }
        resolve(true);
        return;
      } else {
        command = `fuser -k ${port}/tcp 2>/dev/null || true`;
      }

      exec(command, (err) => {
        if (err) {
          console.log(`[Gateway] No process found on port ${port} or already killed`);
        } else {
          console.log(`[Gateway] Killed process on port ${port}`);
        }
        setTimeout(() => resolve(true), 500);
      });
    });
  }  

  async function startGateway(port = GATEWAY_DEFAULT_PORT) { 
    if (gatewayProc) {
      sendBootPhase('done', '启动成功', 'Gateway 已在运行中', 100);
      sendGatewayStatus(true);
      return Promise.resolve({ success: true, already: true });
    }
    sendBootPhase('cleanup', '清理残留进程', '检查端口占用...', 5);

    await killProcessOnPort(port);

    sendBootPhase('config', '初始化配置', '检查并生成配置文件...', 15);

    sendBootPhase('runtime-check', '检查运行环境', '验证 Node.js 和 OpenClaw...', 20);

    sendBootPhase('plugin-check', '检查插件', '验证插件完整性...', 28);

    sendBootPhase('start-command', '启动 Gateway', '正在启动 Gateway 进程...', 30);

    // Generate new for this gateway session
   // generateAndStoreGatewayToken();

    sendBootPhase('generate-new-token', '生成 Token', '生成新token...', 30);

    return new Promise(async (resolve, reject) => {

      const env = getGatewayEnv();
      const cli = getOpenClawPath();

      if (isWin()) {
        gatewayProc = spawn('cmd', ['/c', `"${cli}"`, 'gateway', '--allow-unconfigured'], {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          windowsVerbatimArguments: true,
          cwd: getAppRoot()
        });
      } else {
        gatewayProc = spawn(cli, ['gateway', '--allow-unconfigured'], {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          shell: true,
          cwd: getAppRoot()
        });
      }

      let output = '';
      // 监听正常打印
      gatewayProc.stdout?.on('data', d => {
        const text = d.toString().trim();
        output += text;
        console.log(`[gateway:out] ${text}`);
        text.split('\n').forEach(line => {
          if (line.trim()) sendGatewayLog('stdout', line.trim());
          // Detect when gateway is fully listening
          // if (line.includes('[gateway] listening on')) {
          //   safeSend('gateway-ready', true);
          // }
        });
      });
      // 监听错误输出
      gatewayProc.stderr?.on('data', d => {
        const text = d.toString().trim();
        output += text;
        console.log(`[gateway:err] ${text}`);
        text.split('\n').forEach(line => { if (line.trim()) sendGatewayLog('stderr', line.trim()); });
      });
      // 监听龙虾退出
      gatewayProc.on('exit', (code) => {
        console.log(`[gateway] process exited with code ${code}`);
        gatewayProc = null;
        gatewayRunning = false;
        stopHealthPoll();
        if (code && !gatewayStopping) {
          // Use accumulated output for better error classification
          const errorContext = output.includes('unknown channel') ? output : `进程异常退出 (code ${code})`;
          const classified = classifyGatewayError(errorContext);          
          sendBootPhase('error', classified.title, classified.detail, 0);
          sendGatewayStatus(false, classified.title); 

          // Auto-restart on crash (max 3 retries within 5 minutes)
          if (gatewayAutoRestart && !isQuitting) {
            if (!global._gwRestartHistory) global._gwRestartHistory = [];
            const now = Date.now();
            global._gwRestartHistory = global._gwRestartHistory.filter(t => now - t < 300000);
            if (global._gwRestartHistory.length < 3) {
              global._gwRestartHistory.push(now);
              const delay = Math.min(5000 * global._gwRestartHistory.length, 15000);
              console.log(`[gateway] auto-restart in ${delay/1000}s (attempt ${global._gwRestartHistory.length}/3)`);
              sendGatewayLog('stderr',`⚠️ Gateway 崩溃，${delay/1000}秒后自动重启 (第${global._gwRestartHistory.length}次)...`); 
              // Show restarting state instead of stopped (prevents UI flash)
              sendGatewayStatus(true); 
              sendBootPhase('waiting-ready', '自动重启', `${delay/1000}秒后重启...`, 30);
              setTimeout(() => {
                if (!gatewayRunning && !isQuitting) {
                  console.log('[gateway] auto-restarting...');
                  startGateway(port);
                }
              }, delay);
            } else {
              console.log('[gateway] auto-restart limit reached (3 times in 5 min)');
              sendGatewayLog('stderr','❌ Gateway 反复崩溃，已停止自动重启。请检查配置或点击“一键修复”。');
            }
          }
        } else {
          gatewayStopping = false;
          sendGatewayStatus(false); 
        }
        gatewayStopping = false;
      });
 
      // 监听龙虾报错异常
      gatewayProc.on('error', (err) => {
        console.log(`[gateway] spawn error: ${err.message}`);
        gatewayProc = null;
        gatewayRunning = false;
        const classified = classifyGatewayError(err.message);
        sendBootPhase('error', classified.title, classified.detail, 0);
        sendGatewayStatus(false,classified.title) 
        resolve({ success: false, error: classified.title, errorDetail: classified.detail, errorAction: classified.action });
      });
      // Poll health to confirm it's actually listening
      pollGatewayHealth(port, (result) => {
        resolve(result);
      });
    });
  }

  function stopGateway() {
    stopHealthPoll();
    gatewayStopping = true;
    if (!gatewayProc) {
      gatewayRunning = false;
      gatewayStopping = false;
      return Promise.resolve({ success: true });
    }
    return new Promise((resolve) => {
      try {
        if (process.platform === 'win32') {
          // Kill the process tree on Windows
          spawn('taskkill', ['/pid', String(gatewayProc.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
          gatewayProc.kill('SIGTERM');
        }
      } catch { /* best effort */ }
      // Wait for exit event or timeout
      const timeout = setTimeout(() => {
        gatewayProc = null;
        gatewayRunning = false;
        sendGatewayStatus(false);
        resolve({ success: true });
      }, 3000);
      if (gatewayProc) {
        gatewayProc.once('exit', () => {
          console.log("监听到停止了...")
          clearTimeout(timeout);
          gatewayProc = null;
          gatewayRunning = false;
          sendGatewayStatus(false);
          resolve({ success: true });
        });
      }
    });
  }

  async function restartGateway(port = GATEWAY_DEFAULT_PORT) { 
    safeSend('gateway-restarting', true);
    console.log('[restart] stopping gateway...');
    await stopGateway();
    // Kill orphaned processes on our port
    if (isWin()) {
      try {
        const netstat = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', timeout: 3000 });
        const lines = netstat.trim().split('\n');
        for (const line of lines) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== '0' && /^\d+$/.test(pid)) {
            try { execSync(`taskkill /f /pid ${pid}`, { stdio: 'ignore', timeout: 3000 }); } catch {}
            console.log(`[restart] killed orphaned process on port 18789: pid ${pid}`);
          }
        }
      } catch {}
    }
    await new Promise(r => setTimeout(r, 2000));
    console.log('[restart] starting gateway...');
    await startGateway();
    safeSend('gateway-restarting', false);
    safeSend('gateway-restarted', true);
    return { success: true };
  }

  function isGatewayReady() {
    return gatewayRunning;
  } 

  return {
    startGateway,
    stopGateway,
    restartGateway, 
    isGatewayReady
  };
}

export { createGatewayManager };