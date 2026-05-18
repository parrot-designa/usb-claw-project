import { WechatManager } from './wechat';
import { RUNTIME_DIR,getAppRoot,getDataRoot } from '../paths';
import { IS_DEV } from '../utils/env'; 
import { safeSend } from "../window-manager.js";
import path from 'path'; 
import fs from 'fs';


let wechatManager = null;

export function initWechat(){
    const wechatRuntimeDir = fs.existsSync(path.join(RUNTIME_DIR, 'openclaw.cmd'))
        ? RUNTIME_DIR 
        : RUNTIME_DIR;
    wechatManager = new WechatManager({ runtimeDir: wechatRuntimeDir, usbRuntime: path.join(getAppRoot(), 'runtime'), dataDir: getDataRoot(), isDev:IS_DEV });
    wechatManager.on('status', (status) => {
        safeSend('wechat-status', status);
    });
    wechatManager.on('qr-url', (url) => {
        console.log("出现二维码===>",url)
        safeSend('wechat-qr-url', url);
    });
    wechatManager.on('qr-text', (text) => {
         console.log("出现二维码文本===>",text)
        safeSend('wechat-qr-text', text);
    });
    wechatManager.on('log', (msg) => {
        safeSend('wechat-log', msg);
    });

}

export function getWechatManagerInstance(){
    return wechatManager;
}