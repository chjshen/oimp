#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const staticDir = path.join(__dirname);

// 依赖列表
const deps = [
  {
    name: 'jQuery',
    files: ['jquery.min.js'],
    url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
    target: staticDir
  },
  {
    name: 'jsTree',
    files: ['jstree.js', 'themes/default/style.min.css'],
    url: [
      'https://cdn.jsdelivr.net/npm/jstree@3.3.15/dist/jstree.js',
      'https://cdn.jsdelivr.net/npm/jstree@3.3.15/dist/themes/default/style.min.css'
    ],
    target: path.join(staticDir, 'jstree')
  },
  {
    name: 'Monaco Editor',
    files: ['min/vs/loader.js'],
    url: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js',
    target: path.join(staticDir, 'monaco')
  },
  {
    name: 'xterm.js',
    files: ['xterm.js', 'xterm.css'],
    url: [
      'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js',
      'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css'
    ],
    target: path.join(staticDir, 'xterm')
  },
  {
    name: 'reconnecting-websocket',
    files: ['reconnecting-websocket.js'],
    url: 'https://cdn.jsdelivr.net/npm/reconnecting-websocket@4.4.0/dist/reconnecting-websocket.js',
    target: path.join(staticDir, 'reconnecting-websocket')
  },
  {
    name: 'monaco-languageclient',
    files: ['monaco-languageclient.js'],
    url: 'https://cdn.jsdelivr.net/npm/monaco-languageclient@0.15.0/lib/monaco-languageclient.js',
    target: path.join(staticDir, 'monaco-languageclient')
  },
  {
    name: 'katex',
    files: ['katex.min.js', 'katex.min.css'],
    url: [
      'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
      'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
    ],
    target: staticDir
  }
];

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      fs.unlinkSync(dest);
      cb(new Error(`Failed to get '${url}' (${response.statusCode})`));
      return;
    }
    response.pipe(file);
    file.on('finish', () => file.close(cb));
  }).on('error', (err) => {
    fs.unlinkSync(dest);
    cb(err);
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

(async function main() {
  for (const dep of deps) {
    const files = Array.isArray(dep.files) ? dep.files : [dep.files];
    const urls = Array.isArray(dep.url) ? dep.url : [dep.url];
    let missing = false;
    for (const file of files) {
      const filePath = path.join(dep.target, file);
      if (!fs.existsSync(filePath)) {
        console.log(`缺失依赖: ${dep.name} -> ${file}`);
        missing = true;
      }
    }
    if (missing) {
      console.log(`正在下载 ${dep.name} ...`);
      for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        const url = urls[i] || urls[0];
        const filePath = path.join(dep.target, file);
        ensureDir(path.dirname(filePath));
        await new Promise((resolve, reject) => {
          download(url, filePath, (err) => {
            if (err) {
              console.error(`下载失败: ${file} (${url})`, err);
              reject(err);
            } else {
              console.log(`已下载: ${file}`);
              resolve();
            }
          });
        });
      }
    } else {
      console.log(`依赖已存在: ${dep.name}`);
    }
  }
  console.log('依赖校验与下载完成。');
})(); 