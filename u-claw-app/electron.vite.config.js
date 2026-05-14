import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { resolve } from 'path';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd());

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function obfuscatorPlugin() {
  return {
    name: 'vite-plugin-javascript-obfuscator',
    apply: 'build',
    closeBundle() {
      if (!isProduction()) return;
      const fs = require('fs');
      const path = require('path');
      const distDir = path.resolve(__dirname, 'dist');

      function walk(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (file.endsWith('.js')) {
            const code = fs.readFileSync(fullPath, 'utf-8');
            const obfuscated = JavaScriptObfuscator.obfuscate(code, {
              compact: true,
              stringArray: true,
              stringArrayThreshold: 0.75,
              obfuscateId: true,
              splitStrings: true,
              shuffleStringArray: true,
            }).getObfuscatedCode();
            fs.writeFileSync(fullPath, obfuscated);
          }
        }
      }
      walk(distDir);
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(),obfuscatorPlugin()],
    define: {
      'process.env.VITE_RENDERER_PORT': JSON.stringify(env.VITE_RENDERER_PORT),
      'process.env.VITE_UCLAW_API_HOST': JSON.stringify(env.VITE_UCLAW_API_HOST),
      'process.env.VITE_UCLAW_API_PORT': JSON.stringify(env.VITE_UCLAW_API_PORT),
      'process.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME),
      'process.env.VITE_GATEWAY_DEFAULT_PORT': JSON.stringify(env.VITE_GATEWAY_DEFAULT_PORT),
      'process.env.VITE_GATEWAY_MAX_PORT': JSON.stringify(env.VITE_GATEWAY_MAX_PORT),
      'process.env.VITE_GATEWAY_STARTUP_TIMEOUT': JSON.stringify(env.VITE_GATEWAY_STARTUP_TIMEOUT),
    },
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/electron/main.js'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin(),obfuscatorPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/electron/preload.js'),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    server: {
      port: 8080,
      proxy: {
        '/api': {
          target: env.VITE_UCLAW_API_BASE,
          changeOrigin: true,
        },
        '/v1': {
          target: env.VITE_UCLAW_API_BASE,
          changeOrigin: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        },
      },
    },
    build: {
      outDir: resolve(__dirname, 'dist/assets'),
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/main/index.html'),
        },
        output: {
          assetFileNames: (info) => {
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(info.name)) {
              return '[name][extname]';
            }
            return '[name]-[hash][extname]';
          },
        },
      },
    },
    plugins: [vue(),obfuscatorPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/main'),
        '@activate': resolve(__dirname, 'src/renderer/activate'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@assets': resolve(__dirname, 'src/assets'),
        '~assets': resolve(__dirname, 'src/assets'),
      },
    },
  },
});