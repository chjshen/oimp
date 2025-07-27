const path = require("path");
const fs = require("fs").promises;
const express = require("express");
const chokidar = require("chokidar");
const { marked } = require("marked");
const chalk = require("chalk");
const hljs = require("highlight.js");
const { markedHighlight } = require("marked-highlight");
const katex = require("katex");
const http = require("http");
const WebSocket = require("ws");
const pty = require('node-pty');
const multer = require('multer');
// const upload = multer({ dest: path.join(__dirname, '../../', problemName, 'tmp') }); // 移除顶层

// 动态导入open模块
let open;
try {
  const openModule = require("open");
  open = openModule.default || openModule;
} catch (error) {
  console.log(chalk.yellow("⚠️  open模块未安装，将不会自动打开浏览器"));
  open = null;
}

const terminalWss = new WebSocket.Server({ noServer: true });
const lspWss = new WebSocket.Server({ noServer: true });
const wss = new WebSocket.Server({ noServer: true }); // 预览/热重载 ws
let upgradeRegistered = false;
function registerUpgrade(server) {
  if (upgradeRegistered) return;
  server.on('upgrade', (req, socket, head) => {
    console.log('[WS-UPGRADE] upgrade event:', req.url);
    if (req.url === '/api/terminal') {
      console.log('[WS-UPGRADE] Handling /api/terminal');
      terminalWss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] /api/terminal connected');
        terminalWss.emit('connection', ws, req);
      });
    } else if (req.url === '/api/lsp') {
      console.log('[WS-UPGRADE] Handling /api/lsp');
      lspWss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] /api/lsp connected');
        lspWss.emit('connection', ws, req);
      });
    } else if (req.url === '/' || req.url.startsWith('/?')) {
      console.log('[WS-UPGRADE] Handling / or /?');
      wss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] / or /? connected');
        wss.emit('connection', ws, req);
      });
    } else {
      console.log('[WS-UPGRADE] Unknown ws path, closing:', req.url);
      socket.destroy();
    }
  });
  upgradeRegistered = true;
}

// 命令执行 WebSocket
const runWss = new WebSocket.Server({ noServer: true });

module.exports = async function watchCommand(problemName, options = {}) {
  // 使 problemDir 为 <题目ID> 的上一级目录，实际题目目录为 problemDir/problemName
  const parentDir = process.cwd();
  const problemDir = path.join(parentDir, problemName);
  const port = options.port || 3000;

  try {
    // 检查题目目录是否存在
    await fs.access(problemDir);
  } catch (error) {
    console.error(chalk.red(`题目目录 ${problemName} 不存在`));
    console.log(chalk.yellow(`💡 请先运行 'oimp init ${problemName}' 创建题目`));
    process.exit(1);
  }

  const upload = multer({ dest: path.join(__dirname, '../../', problemName, 'tmp') });

  // 查找所有problem*.md和solution/*.md文件
  async function findMarkdownFiles(dir) {
    const files = [];
    try {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isFile() && /^problem.*\.md$/i.test(item)) {
          files.push(fullPath);
        } else if (stat.isDirectory() && item === 'solution') {
          // 查找solution目录下所有md文件
          const solItems = await fs.readdir(fullPath);
          for (const solItem of solItems) {
            if (/\.md$/i.test(solItem)) {
              files.push(path.join(fullPath, solItem));
            }
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`读取目录失败: ${error.message}`));
    }
    return files;
  }

  const markdownFiles = await findMarkdownFiles(problemDir);
  if (markdownFiles.length === 0) {
    console.error(chalk.red(`在题目目录中未找到 problem*.md 或 solution/*.md 文件`));
    process.exit(1);
  }

  console.log(chalk.blue(`🚀 启动watch模式，监听题目: ${problemName}`));
  console.log(chalk.gray(`📁 题目目录: ${problemDir}`));
  console.log(chalk.gray(`📄 发现 ${markdownFiles.length} 个markdown文件:`));
  markdownFiles.forEach(file => {
    console.log(chalk.gray(`   - ${path.relative(problemDir, file)}`));
  });

  // 创建Express服务器
  const app = express();
  
  // 添加静态文件服务
  app.use('/static', express.static(path.join(__dirname, '../../templates/static')));
  
  // 添加题目目录的静态文件服务，用于图片等资源
  app.use('/images', express.static(path.join(problemDir, 'images')));
  app.use('/assets', express.static(path.join(problemDir, 'assets')));
  
  // 添加题目目录的静态文件服务，支持相对路径访问
  app.use('/files', express.static(problemDir));

  // 配置marked扩展
  marked.use(markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          console.error('代码高亮错误:', err);
        }
      }
      return hljs.highlightAuto(code).value;
    }
  }));

  // 自定义数学公式渲染函数
  function renderMathInText(text) {
    // 先渲染块级数学公式，避免与行内公式冲突
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
          errorColor: '#cc0000'
        });
      } catch (error) {
        console.error('KaTeX渲染错误:', error);
        return `<span style="color: #cc0000;">[数学公式渲染错误: ${formula}]</span>`;
      }
    });
    
    // 然后渲染行内数学公式
    text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      // 跳过已经被渲染的块级公式
      if (match.includes('katex')) {
        return match;
      }
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000'
        });
      } catch (error) {
        console.error('KaTeX渲染错误:', error);
        return `<span style="color: #cc0000;">[数学公式渲染错误: $${formula}$]</span>`;
      }
    });
    
    return text;
  }

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // 处理file://协议的文件引用
  function processFileReferences(content) {
    // 将 file://文件名 转换为 /files/additional_file/文件名
    return content.replace(/file:\/\/([^\/\s]+)/g, '/files/additional_file/$1');
  }

  // 生成HTML模板
  function generateHTML(markdownContent, fileName = 'problem.md') {
    // 先处理file://协议的文件引用
    const contentWithFileRefs = processFileReferences(markdownContent);
    
    // 然后渲染数学公式
    const contentWithMath = renderMathInText(contentWithFileRefs);
    
    // 最后渲染markdown（包含代码高亮）
    const htmlContent = marked.parse(contentWithMath);
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${problemName} - ${fileName} 预览</title>
    <link rel="stylesheet" href="/static/katex.min.css">
    <style>
        /* GitHub风格的CSS */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #24292f;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 980px;
            margin: 0 auto;
            padding: 45px 20px;
        }
        .markdown-body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .markdown-body h1 {
            font-size: 2em;
            border-bottom: 1px solid #d0d7de;
            color: #24292f;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 16px;
            margin-top: 24px;
            padding-bottom: 0.3em;
        }
        .markdown-body h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #d0d7de;
            color: #24292f;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 16px;
            margin-top: 24px;
            padding-bottom: 0.3em;
        }
        .markdown-body h3 {
            font-size: 1.25em;
            color: #24292f;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 16px;
            margin-top: 24px;
        }
        .markdown-body h4 {
            font-size: 1em;
            color: #24292f;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 16px;
            margin-top: 24px;
        }
        .markdown-body h5 {
            font-size: 0.875em;
            color: #24292f;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 16px;
            margin-top: 24px;
        }
        .markdown-body h6 {
            font-size: 0.85em;
            color: #57606a;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 16px;
            margin-top: 24px;
        }
        .markdown-body p {
            margin-bottom: 16px;
            margin-top: 0;
        }
        .markdown-body blockquote {
            border-left: 0.25em solid #d0d7de;
            color: #656d76;
            margin: 0 0 16px 0;
            padding: 0 1em;
        }
        .markdown-body ul, .markdown-body ol {
            margin-bottom: 16px;
            margin-top: 0;
            padding-left: 2em;
        }
        .markdown-body li {
            margin-top: 0.25em;
        }
        .markdown-body code {
            background-color: rgba(175, 184, 193, 0.2);
            border-radius: 6px;
            font-size: 85%;
            margin: 0;
            padding: 0.2em 0.4em;
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        .markdown-body pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            font-size: 85%;
            line-height: 1.45;
            overflow: auto;
            padding: 16px;
            margin-bottom: 16px;
            margin-top: 0;
        }
        .markdown-body pre code {
            background-color: transparent;
            border: 0;
            display: inline;
            line-height: inherit;
            margin: 0;
            overflow: visible;
            padding: 0;
            word-wrap: normal;
        }
        .markdown-body table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-bottom: 16px;
            margin-top: 0;
            width: 100%;
        }
        .markdown-body table th, .markdown-body table td {
            border: 1px solid #d0d7de;
            padding: 6px 13px;
        }
        .markdown-body table th {
            background-color: #f6f8fa;
            font-weight: 600;
        }
        .markdown-body table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        .markdown-body img {
            max-width: 100%;
            box-sizing: content-box;
        }
        .markdown-body hr {
            background-color: #d0d7de;
            border: 0;
            height: 0.25em;
            margin: 24px 0;
            padding: 0;
        }
        /* KaTeX数学公式样式 */
        .katex {
            font-size: 1.1em;
        }
        .katex-display {
            margin: 1em 0;
            text-align: center;
        }
        /* 状态栏样式 */
        .status-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #24292f;
            color: white;
            padding: 10px 20px;
            text-align: center;
            font-size: 14px;
            border-top: 1px solid #d0d7de;
        }
        .auto-refresh {
            background: #2da44e;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            margin-left: 10px;
            font-size: 12px;
        }
        .last-updated {
            color: #656d76;
            font-size: 12px;
            margin-top: 20px;
            text-align: center;
            border-top: 1px solid #d0d7de;
            padding-top: 16px;
        }
        /* 代码高亮主题 - GitHub风格 */
        .hljs {
            color: #24292f;
            background: #f6f8fa;
        }
        .hljs-comment, .hljs-punctuation {
            color: #6e7781;
        }
        .hljs-attr, .hljs-attribute, .hljs-meta, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-id {
            color: #953800;
        }
        .hljs-variable, .hljs-literal, .hljs-number, .hljs-doctag {
            color: #0550ae;
        }
        .hljs-params {
            color: #24292f;
        }
        .hljs-function {
            color: #8250df;
        }
        .hljs-tag, .hljs-tag .hljs-name, .hljs-tag .hljs-attr {
            color: #116329;
        }
        .hljs-string, .hljs-regexp {
            color: #0a3069;
        }
        .hljs-built_in, .hljs-builtin-name {
            color: #953800;
        }
        .hljs-keyword, .hljs-selector-tag, .hljs-type {
            color: #cf222e;
        }
        .hljs-subst {
            color: #24292f;
        }
        .hljs-symbol, .hljs-class .hljs-title, .hljs-formula {
            color: #953800;
        }
        .hljs-addition {
            color: #116329;
            background-color: #dafbe1;
        }
        .hljs-deletion {
            color: #82071e;
            background-color: #ffebe9;
        }
        .hljs-meta .hljs-string {
            color: #0a3069;
        }
        .hljs-emphasis {
            font-style: italic;
        }
        .hljs-strong {
            font-weight: 600;
        }
        /* WebSocket连接状态指示器 */
        .ws-status {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #d73a49;
            transition: background-color 0.3s ease;
        }
        .ws-status.connected {
            background: #28a745;
        }
        .ws-status.connecting {
            background: #f6a434;
        }
        /* 更新通知 */
        .update-notification {
            position: fixed;
            top: 50px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 14px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 1000;
        }
        .update-notification.show {
            transform: translateX(0);
        }
    </style>
</head>
<body>
    <div class="ws-status" id="wsStatus"></div>
    <div class="update-notification" id="updateNotification">
        📝 文件已更新，正在刷新...
    </div>
    <div class="container">
        <div class="markdown-body">
            ${htmlContent}
        </div>
        <div class="last-updated">
            最后更新: <span id="lastUpdated">${new Date().toLocaleString('zh-CN')}</span>
        </div>
    </div>
    <!--div class="status-bar">
        <span>🚀 实时预览模式</span>
        <span class="auto-refresh">WebSocket连接</span>
        <span>💡 保存markdown文件后页面将自动刷新</span>
    </div-->

    <script>
        // WebSocket连接管理
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const reconnectDelay = 1000;
        
        const wsStatus = document.getElementById('wsStatus');
        const updateNotification = document.getElementById('updateNotification');
        const lastUpdated = document.getElementById('lastUpdated');
        
        function updateWsStatus(status) {
            wsStatus.className = 'ws-status ' + status;
        }
        
        function showUpdateNotification() {
            updateNotification.classList.add('show');
            setTimeout(() => {
                updateNotification.classList.remove('show');
            }, 3000);
        }
        
        function connectWebSocket() {
            try {
                ws = new WebSocket('ws://' + window.location.host);
                
                ws.onopen = function() {
                    console.log('WebSocket连接已建立');
                    updateWsStatus('connected');
                    reconnectAttempts = 0;
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    if (data.type === 'file_updated') {
                        console.log('收到文件更新通知:', data.file);
                        showUpdateNotification();
                        lastUpdated.textContent = new Date().toLocaleString('zh-CN');
                        
                        // 检查当前页面是否正在预览变更的文件
                        const currentPath = window.location.pathname;
                        const changedFile = data.file.replace(/\.md$/, '');
                        const currentFile = currentPath === '/' ? 'problem_zh' : currentPath.substring(1);
                        
                        // 处理solution目录下的文件
                        let targetRoute = changedFile;
                        if (data.filePath && data.filePath.startsWith('solution/')) {
                            targetRoute = data.filePath.replace(/\.md$/, '');
                        }
                        
                        // 如果变更的文件不是当前预览的文件，则切换到该文件
                        if (currentFile !== changedFile || (data.filePath && data.filePath.startsWith('solution/') && !currentPath.includes('solution'))) {
                            console.log('切换到文件:', targetRoute);
                            window.location.href = '/' + targetRoute;
                        } else {
                            // 延迟刷新页面，给用户时间看到通知
                            setTimeout(() => {
                                window.location.reload();
                            }, 500);
                        }
                    }
                };
                
                ws.onclose = function() {
                    console.log('WebSocket连接已关闭');
                    updateWsStatus('connecting');
                    
                    // 自动重连
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        console.log(\`尝试重连 (\${reconnectAttempts}/\${maxReconnectAttempts})...\`);
                        setTimeout(connectWebSocket, reconnectDelay * reconnectAttempts);
                    } else {
                        updateWsStatus('');
                        console.log('WebSocket重连失败，请刷新页面');
                    }
                };
                
                ws.onerror = function(error) {
                    console.error('WebSocket错误:', error);
                    updateWsStatus('');
                };
                
            } catch (error) {
                console.error('WebSocket连接失败:', error);
                updateWsStatus('');
            }
        }
        
        // 页面加载完成后连接WebSocket
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM加载完成，连接WebSocket...');
            connectWebSocket();
        });
        
        // 页面卸载时关闭WebSocket
        window.addEventListener('beforeunload', function() {
            if (ws) {
                ws.close();
            }
        });
    </script>
</body>
</html>`;
  }

  // 异步读取markdown文件
  async function readMarkdownFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(chalk.red(`读取文件失败: ${filePath}`), error.message);
      return `# 文件读取错误\n\n无法读取文件: ${path.basename(filePath)}\n\n错误信息: ${error.message}`;
    }
  }

  // 创建HTTP服务器
  const server = http.createServer(app);
  // 注册唯一 ws upgrade，合并所有 ws 路径
  server.on('upgrade', (req, socket, head) => {
    console.log('[WS-UPGRADE] upgrade event:', req.url);
    if (req.url === '/api/terminal') {
      console.log('[WS-UPGRADE] Handling /api/terminal');
      terminalWss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] /api/terminal connected');
        terminalWss.emit('connection', ws, req);
      });
    } else if (req.url === '/api/lsp') {
      console.log('[WS-UPGRADE] Handling /api/lsp');
      lspWss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] /api/lsp connected');
        lspWss.emit('connection', ws, req);
      });
    } else if (req.url === '/api/runws') {
      console.log('[WS-UPGRADE] Handling /api/runws');
      runWss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] /api/runws connected');
        runWss.emit('connection', ws, req);
      });
    } else if (req.url === '/' || req.url.startsWith('/?')) {
      console.log('[WS-UPGRADE] Handling / or /?');
      wss.handleUpgrade(req, socket, head, ws => {
        console.log('[WS-CONN] / or /? connected');
        wss.emit('connection', ws, req);
      });
    } else {
      console.log('[WS-UPGRADE] Unknown ws path, closing:', req.url);
      socket.destroy();
    }
  });
  
  // 存储连接的客户端
  const clients = new Set();
  
  // WebSocket连接处理
  wss.on('connection', (ws, req) => {
    console.log('[WS-EVENT] wss connection:', req.url);
    console.log(chalk.green('🔗 WebSocket客户端已连接'));
    clients.add(ws);
    
    ws.on('close', () => {
      console.log(chalk.yellow('🔌 WebSocket客户端已断开'));
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error(chalk.red('WebSocket错误:'), error);
      clients.delete(ws);
    });
    
    // 设置连接超时，防止僵尸连接
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(chalk.yellow('⏰ WebSocket连接超时，强制关闭'));
        ws.close();
      }
    }, 300000); // 5分钟超时
    
    ws.on('close', () => {
      clearTimeout(connectionTimeout);
    });
  });
  
  // 广播消息给所有连接的客户端
  function broadcastMessage(message) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // ====== Web IDE 路由与API ======
  // 1. IDE 主页面
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../templates/static/ide.html'));
  });

  // 2. 文件树 API
  function safeId(relPath) {
    return relPath.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  async function buildFileTreeAsync(dir, rel = '') {
    const tree = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);
      const relPath = path.join(rel, item.name);
      if (item.isDirectory()) {
        // 递归获取子节点
        const children = await buildFileTreeAsync(fullPath, relPath);
        tree.push({
          id: safeId(relPath),
          text: item.name,
          children, // 这里是数组
          data: { type: 'dir', path: relPath, rawId: relPath }
        });
      } else if (item.isFile()) {
        tree.push({
          id: safeId(relPath),
          text: item.name,
          icon: 'jstree-file',
          children: false,
          data: { type: 'file', path: relPath, rawId: relPath }
        });
      }
    }
    return tree;
  }
  app.get('/api/tree', async (req, res) => {
    try {
      const relPath = req.query.path || '';
      const absPath = path.join(problemDir, relPath);
      const tree = await buildFileTreeAsync(absPath, relPath);
      // 根目录时包一层题目ID节点
      if (!relPath) {
        res.json([
          {
            id: '',
            text: path.basename(problemDir),
            children: tree,
            data: { type: 'dir', path: '' }
          }
        ]);
      } else {
        res.json(tree);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. 文件读写 API
  app.get('/api/file', async (req, res) => {
    const relPath = req.query.path;
    if (!relPath) return res.status(400).send('缺少 path 参数');
    const absPath = path.join(problemDir, relPath);
    try {
      const stat = await fs.stat(absPath);
      if (!stat.isFile()) return res.status(400).send('不是文件');
      const content = await fs.readFile(absPath, 'utf8');
      res.send(content);
    } catch (e) {
      res.status(404).send('文件不存在');
    }
  });
  app.post('/api/file', express.json({ limit: '2mb' }), async (req, res) => {
    const { path: relPath, content } = req.body;
    if (!relPath) return res.status(400).send('缺少 path');
    const absPath = path.join(problemDir, relPath);
    try {
      // 写文件前自动创建父目录
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, content, 'utf8');
      res.send('ok');
    } catch (e) {
      res.status(500).send('写入失败');
    }
  });
  // 新增图片上传 API
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        console.error('图片上传失败: 未收到文件, req.body:', req.body);
        return res.status(400).json({ error: '未收到文件' });
      }
      const { filename, problemId } = req.body;
      if (!filename || !problemId) {
        console.error('图片上传失败: 缺少参数, req.body:', req.body);
        return res.status(400).json({ error: '缺少参数' });
      }
      const tempPath = req.file.path;
      const targetDir = path.join(problemDir, 'additional_file');
      await fs.mkdir(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, filename);
      await fs.rename(tempPath, targetPath);
      res.json({ relPath: `additional_file/${filename}` });
    } catch (e) {
      console.error('图片保存失败:', e, 'req.body:', req.body, 'req.file:', req.file);
      res.status(500).json({ error: '图片保存失败', detail: e.message });
    }
  });
  // 题目状态 API
  app.get('/api/status', async (req, res) => {
    try {
      const statusPath = path.join(problemDir, 'status.json');
      const content = await fs.readFile(statusPath, 'utf8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(content);
    } catch (e) {
      res.status(404).json({ error: 'status.json 不存在', detail: e.message });
    }
  });

  // 4. 终端 WebSocket (xterm.js)
  terminalWss.on('connection', (ws, req) => {
    console.log('[WS-EVENT] terminalWss connection:', req.url);
    const shell = process.env.SHELL || 'bash';
    console.log('[PTY] Spawning shell:', shell, 'cwd:', problemDir);
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cwd: path.resolve(problemDir,"../"),
      env: process.env
    });
    ptyProcess.on('data', data => {
      console.log('[PTY] shell output:', JSON.stringify(data));
      ws.send(data);
    });
    ws.on('message', msg => ptyProcess.write(msg));
    ws.on('close', () => {
      console.log('[WS-EVENT] terminal ws closed, killing pty');
      ptyProcess.kill();
    });
  });
  lspWss.on('connection', (ws, req) => {
    console.log('[WS-EVENT] lspWss connection:', req.url);
    // 启动 clangd 进程
    const clangd = spawn('clangd', [], { cwd: problemDir });
    // WebSocket <-> clangd 双向转发
    ws.on('message', msg => clangd.stdin.write(msg));
    clangd.stdout.on('data', data => ws.send(data));
    clangd.stderr.on('data', data => ws.send(data));
    ws.on('close', () => clangd.kill());
  });

  // 命令执行 API（仅启动 ws 通道，实际执行通过 ws）
  app.post('/api/run', express.json(), (req, res) => {
    const { cmd } = req.body;
    if (!['check','package','gendata','testsample'].includes(cmd)) {
      return res.status(400).json({ error: '不支持的命令' });
    }
    // 前端需先建立 ws 连接 /api/runws，收到 run 指令后执行
    res.json({ ok: true });
  });

  // 获取平台信息 API
  app.get('/api/platform', (req, res) => {
    const platform = process.platform;
    const isWindows = platform === 'win32';
    
    // 平台特定的diff命令，忽略空白字符和空行
    const diffCommand = isWindows ? 'fc /W' : 'diff -B -w';
    const rmCommand = isWindows ? 'del /f /q' : 'rm -f';
    const fileCheckCommand = isWindows ? 'if exist' : 'if [ -f';
    
    // 平台特定的diff命令变体
    const diffCommandIgnoreWhitespace = isWindows ? 'fc /W' : 'diff -w';
    const diffCommandIgnoreBlankLines = isWindows ? 'fc' : 'diff -B';
    const diffCommandIgnoreAll = isWindows ? 'fc /W' : 'diff -B -w';
    
    res.json({ 
      platform, 
      isWindows, 
      diffCommand,
      rmCommand,
      fileCheckCommand,
      // Windows下fc命令的语法
      fcSyntax: isWindows ? 'fc [/W] file1 file2' : null,
      // Unix下diff命令的语法  
      diffSyntax: !isWindows ? 'diff [-B -w] file1 file2' : null,
      // Windows下del命令的语法
      delSyntax: isWindows ? 'del /f /q file' : null,
      // Unix下rm命令的语法
      rmSyntax: !isWindows ? 'rm -f file' : null,
      // Windows下文件检查语法
      fileCheckSyntax: isWindows ? 'if exist file' : null,
      // Unix下文件检查语法
      unixFileCheckSyntax: !isWindows ? 'if [ -f file ]' : null,
      // 新增的diff命令变体
      diffCommandIgnoreWhitespace,
      diffCommandIgnoreBlankLines,
      diffCommandIgnoreAll,
      // 详细说明
      diffOptions: {
        ignoreWhitespace: isWindows ? 'fc /W (忽略空白字符)' : 'diff -w (忽略空白字符)',
        ignoreBlankLines: isWindows ? 'fc (默认忽略空行变化)' : 'diff -B (忽略空行)',
        ignoreAll: isWindows ? 'fc /W (忽略空白和空行)' : 'diff -B -w (忽略空白和空行)'
      }
    });
  });

  // 编译 API
  app.post('/api/compile', express.json(), async (req, res) => {
    const { path: relPath, problemId } = req.body;
    if (!relPath) {
      return res.status(400).json({ error: '缺少文件路径' });
    }
    
    try {
      const filePath = path.join(problemDir, relPath);
      const ext = path.extname(filePath).toLowerCase();
      
      // 检查文件类型
      if (!['.cpp', '.cc', '.cxx'].includes(ext)) {
        return res.status(400).json({ error: '不支持的文件类型，仅支持 .cpp, .cc, .cxx' });
      }
      
      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ error: '文件不存在' });
      }
      
      // 生成输出文件名
      const outputPath = path.join(path.dirname(filePath), path.basename(filePath, ext));
      
      // 执行编译
      const { execSync } = require('child_process');
      const compileCmd = `g++ -O2 -std=c++14 -o "${outputPath}" "${filePath}"`;
      
      try {
        const result = execSync(compileCmd, { 
          cwd: path.dirname(filePath),
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        res.json({ 
          success: true, 
          output: '编译成功',
          executable: path.basename(outputPath)
        });
      } catch (error) {
        res.status(500).json({ 
          error: '编译失败',
          output: error.stdout || error.stderr || error.message
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: '服务器错误',
        output: error.message 
      });
    }
  });
  // ws 处理
  runWss.on('connection', (ws, req) => {
    let proc = null;
    ws.on('message', msg => {
      let data;
      try { data = JSON.parse(msg); } catch { return; }
      // 支持命令启动
      if (data && data.cmd && ['check','package','gendata','testsample'].includes(data.cmd)) {
        const oimpCmd = `oimp ${data.cmd} ${problemName}`;
        const { spawn } = require('child_process');
        proc = spawn('sh', ['-c', oimpCmd], { cwd: parentDir });
        ws.send(JSON.stringify({ type: 'start', cmd: data.cmd }));
        proc.stdout.on('data', chunk => {
          ws.send(JSON.stringify({ type: 'stdout', data: chunk.toString() }));
        });
        proc.stderr.on('data', chunk => {
          ws.send(JSON.stringify({ type: 'stderr', data: chunk.toString() }));
        });
        proc.on('close', code => {
          ws.send(JSON.stringify({ type: 'close', code }));
        });
      }
      // 支持交互输入
      if (data && typeof data.input === 'string' && proc && proc.stdin) {
        proc.stdin.write(data.input);
      }
    });
  });

  // 设置路由
  app.get('/', async (req, res) => {
    try {
      const firstFile = markdownFiles[0];
      const fileName = path.basename(firstFile);
      const content = await readMarkdownFile(firstFile);
      const html = generateHTML(content, fileName);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error(chalk.red('生成HTML失败:'), error);
      res.status(500).send('服务器内部错误');
    }
  });

  // 为每个markdown文件创建路由
  for (const filePath of markdownFiles) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(problemDir, filePath);
    const route = `/${relativePath.replace(/\.md$/, '')}`;
    app.get(route, async (req, res) => {
      try {
        const content = await readMarkdownFile(filePath);
        const html = generateHTML(content, fileName);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } catch (error) {
        console.error(chalk.red(`生成HTML失败 (${fileName}):`), error);
        res.status(500).send('服务器内部错误');
      }
    });
  }

  // 启动服务器
  server.listen(port, async () => {
    console.log(chalk.green(`✅ 预览服务器已启动: http://localhost:${port}`));
    console.log(chalk.gray(`📝 正在监听 ${markdownFiles.length} 个文件`));
    console.log(chalk.gray(`💡 保存markdown文件后页面将自动刷新`));
    console.log(chalk.gray(`🛑 按 Ctrl+C 停止服务器`));
    
    // 自动打开浏览器
    if (open) {
      try {
        await open(`http://localhost:${port}`);
      } catch (error) {
        console.log(chalk.yellow('⚠️  无法自动打开浏览器'));
      }
    }

    // 设置文件监听
    const watcher = chokidar.watch(problemDir, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      },
      usePolling: false,
      interval: 100,
      depth: 6,
      ignored: /node_modules|\.snapshots|\.git/
    });

    watcher.on('change', async (filePath) => {
      const fileName = path.basename(filePath);
      const relativePath = path.relative(problemDir, filePath);
      console.log(chalk.blue(`📝 文件已更新: ${relativePath}`));
      
      // 广播更新消息给所有连接的客户端
      broadcastMessage({
        type: 'file_updated',
        file: fileName,
        filePath: relativePath,
        timestamp: new Date().toISOString()
      });
      // 目录内容变化时也推送 tree_changed
      broadcastMessage({ type: 'tree_changed', timestamp: new Date().toISOString() });
      // status.json 变化时推送 status_changed
      if (fileName === 'status.json') {
        broadcastMessage({ type: 'status_changed', timestamp: new Date().toISOString() });
      }
    });
    watcher.on('add', (filePath) => {
      broadcastMessage({ type: 'tree_changed', timestamp: new Date().toISOString() });
    });
    watcher.on('unlink', (filePath) => {
      broadcastMessage({ type: 'tree_changed', timestamp: new Date().toISOString() });
    });
    watcher.on('addDir', (dirPath) => {
      broadcastMessage({ type: 'tree_changed', timestamp: new Date().toISOString() });
    });
    watcher.on('unlinkDir', (dirPath) => {
      broadcastMessage({ type: 'tree_changed', timestamp: new Date().toISOString() });
    });

    watcher.on('error', (error) => {
      console.error(chalk.red('文件监听错误:'), error);
    });
    
    watcher.on('ready', () => {
      console.log(chalk.green('📁 文件监听器已就绪'));
    });

    // 优雅关闭函数
    const gracefulShutdown = async (signal) => {
      console.log(chalk.yellow(`\n🛑 收到信号 ${signal}，正在关闭watch服务器...`));
      
      try {
        // 强制关闭所有WebSocket连接
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.close();
          }
        });
        clients.clear();
        
        // 关闭WebSocket服务器
        wss.close();
        
        // 关闭文件监听
        await watcher.close();
        
        // 设置超时关闭HTTP服务器
        const closeTimeout = setTimeout(() => {
          console.log(chalk.yellow('⚠️  强制关闭服务器...'));
          process.exit(0);
        }, 3000);
        
        server.close(() => {
          clearTimeout(closeTimeout);
          console.log(chalk.green('✅ watch服务器已关闭'));
          process.exit(0);
        });
        
      } catch (error) {
        console.error(chalk.red('关闭服务器时出错:'), error);
        process.exit(1);
      }
    };

    // 监听多种关闭信号
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
  });
}