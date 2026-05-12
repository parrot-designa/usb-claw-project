import fs from 'fs';
import path from 'path';
import { getPaths, writeOpenClawConfig } from '../paths.js';

// 确保已安装的插件配置到 openclw.json
async function ensurePlugins() {
  const { appRoot } = getPaths();
  const extensionsDir = path.join(appRoot, 'extensions');

  // 如果 extensions 目录不存在，跳过
  if (!fs.existsSync(extensionsDir)) {
    console.log(`插件目录不存在，跳过: ${extensionsDir}`);
    return;
  }

  // 扫描 extensions 目录下的插件
  let pluginEntries;
  try {
    const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
    pluginEntries = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginJsonPath = path.join(extensionsDir, entry.name, 'openclaw.plugin.json');
      if (!fs.existsSync(pluginJsonPath)) continue;

      try {
        const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        // 从 openclaw.plugin.json 读取插件标识，优先用 id，其次用 name，最后用目录名
        const pluginName = pluginJson.id || pluginJson.name || entry.name;
        pluginEntries.push(pluginName);
        console.log(`发现已安装插件: ${pluginName}`);
      } catch (e) {
        console.warn(`跳过无效插件目录: ${entry.name}`);
      }
    }
  } catch (e) {
    console.error(`扫描插件目录失败: ${e.message}`);
    return;
  }

  if (pluginEntries.length === 0) {
    console.log(`未发现已安装插件`);
    return;
  }

  // 构建插件配置
  const pluginsEntriesObj = {};
  for (const pluginName of pluginEntries) {
    pluginsEntriesObj[pluginName] = { enabled: true };
  }

  await writeOpenClawConfig({
    plugins: {
      load: { paths: pluginEntries.map(name => path.join(extensionsDir, name)) },
      entries: pluginsEntriesObj,
      allow: pluginEntries
    }
  }, "plugins");
}

export { ensurePlugins };