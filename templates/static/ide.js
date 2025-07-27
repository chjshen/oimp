// Monaco Editor 本地加载
require.config({ paths: { 'vs': '/static/monaco/min/vs' } });
window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        // 指向本地 worker 文件
        return '/static/monaco/min/vs/base/worker/workerMain.js';
    }
};
let editor, currentFile = '';
let isDirty = false;
let isRestoringTreeSelection = false;
let pendingTreeData = null;
let isRefreshingTree = false;
let debounceTreeChangedTimer = null;
document.addEventListener('DOMContentLoaded', async function () {
    // 刷新按钮事件绑定
    var btn = document.getElementById('btn-refresh-file');
    if (btn) btn.onclick = function() { reloadFile(); };
    // 移除 btn-refresh-tree 相关逻辑
    var btnTree = document.getElementById('btn-refresh-tree');
    if (btnTree) {
        // 移除 btn-refresh-tree 相关逻辑
    }
    var editorDiv = document.getElementById('editor');
    if (!editorDiv) return;
    require(["vs/editor/editor.main"], function () {
        editor = monaco.editor.create(editorDiv, {
            value: '',
            language: 'markdown',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 15,
        });
        window.editor = editor;
        // 实时预览
        editor.onDidChangeModelContent(function () {
            if (!isDirty) {
                isDirty = true;
                updateCurrentFileDisplay();
            }
            // 不再依赖 ws 推送，直接前端实时渲染
            updatePreviewFromEditor();
        });


        // 光标变动时预览区跟随
        editor.onDidChangeCursorPosition(function (e) {
            scrollPreviewToEditorLine(e.position.lineNumber);
        });
        // 实时预览渲染函数
        function updatePreviewFromEditor() {
            const content = editor.getValue();
            // 替换 file://additional_file/xxx 为 /files/additional_file/xxx
            const fixedContent = content.replace(/file:\/\/additional_file\//g, '/files/additional_file/');
            // 修正：整体渲染 markdown，避免按行分割，支持多行公式
            const html = marked.parse(fixedContent);
            // console.log('【调试】updatePreviewFromEditor 渲染 html:', html);
            const previewDiv = document.getElementById('preview-html');
            if (previewDiv) {
                previewDiv.innerHTML = html;
                // 确保 KaTeX 渲染
                if (window.renderMathInElement) {
                    try {
                        window.renderMathInElement(previewDiv, {
                            delimiters: [
                                { left: '$$', right: '$$', display: true },
                                { left: '$', right: '$', display: false }
                            ],
                            throwOnError: false
                        });
                    } catch (e) { console.error('KaTeX渲染失败', e); }
                } else {
                    setTimeout(() => {
                        if (window.renderMathInElement) {
                            try {
                                window.renderMathInElement(previewDiv, {
                                    delimiters: [
                                        { left: '$$', right: '$$', display: true },
                                        { left: '$', right: '$', display: false }
                                    ],
                                    throwOnError: false
                                });
                            } catch (e) { }
                        }
                    }, 200);
                }
            }
        }
        // 预览区滚动到对应行
        function scrollPreviewToEditorLine(line) {
            const previewDiv = document.getElementById('preview-html');
            if (previewDiv) {
                const el = previewDiv.querySelector(`[data-line='${line}']`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
        // 文件树懒加载
        $('#file-tree').jstree({
            'core': {
                'themes': {
                    'name': 'default-dark',
                    'dots': true,
                    'icons': true
                },
                'data': function (obj, cb) {
                    if (obj.id === '#') {
                        fetch('/api/tree').then(r => r.json()).then(data => cb(data));
                    } else {
                        // 用真实目录名（data.path）作为 path 参数
                        const path = obj.data && typeof obj.data.path === 'string' ? obj.data.path : obj.id;
                        fetch('/api/tree?path=' + encodeURIComponent(path)).then(r => r.json()).then(data => cb(data));
                    }
                },
                'check_callback': true
            },
            'plugins': ['wholerow']
        });

        // 自动展开题目ID目录并自动打开第一个md文件
        $('#file-tree').on('ready.jstree', function (e, data) {
            const tree = $('#file-tree').jstree(true);
            const root = tree.get_node('#').children[0];
            tree.open_node(root, function () {
                // 查找第一个md文件
                const allNodes = tree.get_json(root, { flat: true });
                const firstMd = allNodes.find(n => n.data && n.data.type === 'file' && n.text.toLowerCase().endsWith('.md'));
                if (firstMd) {
                    setTimeout(function () {
                        tree.deselect_all();
                        tree.select_node(firstMd.id);
                        // 强制加载
                        loadFile(firstMd.data.path);
                    }, 100);
                }
            });
        });

        // jstree节点渲染时，灰色不可编辑文件
        $('#file-tree').on('after_open.jstree refresh.jstree', function (e, data) {
            const tree = $('#file-tree').jstree(true);
            tree.get_json(data.node || '#', { flat: true }).forEach(function (n) {
                if (n.data && n.data.type === 'file') {
                    const ext = n.text.split('.').pop().toLowerCase();
                    // id 已为安全 id
                    const anchorId = '#' + n.id + '_anchor';
                    if (['md', 'cpp', 'cc', 'in', 'out', 'ans'].indexOf(ext) === -1) {
                        $(anchorId).css({ 'color': '#1f1f1f', 'pointer-events': 'none', 'cursor': 'not-allowed' });
                    } else {
                        $(anchorId).css({ 'color': '', 'pointer-events': '', 'cursor': '' });
                    }
                }
            });
        });

        // 只在 editor 初始化后绑定 select_node 事件
        $('#file-tree').off('select_node.jstree');
        $('#file-tree').on('select_node.jstree', function (e, data) {
            if (isRestoringTreeSelection) {
                // console.log('跳过 select_node 事件（正在恢复选中）');
                return;
            }
            if (data.node && data.node.data && data.node.data.type === 'file') {
                const path = data.node.data.path;
                const ext = path.split('.').pop().toLowerCase();
                // 只允许特定后缀可编辑
                if (["md", "in", "ans", "out", "txt", "cpp", "cc"].indexOf(ext) !== -1) {
                    loadFile(path);
                } else {
                    // 取消选中
                    setTimeout(() => $('#file-tree').jstree('deselect_node', data.node), 0);
                }
            } else if (data.node && data.node.data && data.node.data.type === 'dir') {
                $('#file-tree').jstree('toggle_node', data.node);
            }
        });

        let lastSavedContent = '';
        let isMdDirty = false;
        let currentIsMarkdown = false;
        // 初始化 textarea 到 #editor 内部
        let mdTextarea = document.getElementById('md-textarea');
        if (!mdTextarea) {
            mdTextarea = document.createElement('textarea');
            mdTextarea.id = 'md-textarea';
            mdTextarea.style.cssText = 'display:none; position:absolute; left:0; top:0; width:100%; height:100%; resize:none; font-size:15px; font-family:inherit; padding:12px 18px 32px 18px; box-sizing:border-box; outline:none; background:#18181b; color:#e5e7eb; border:none; z-index:2;';
            document.getElementById('editor').appendChild(mdTextarea);
        }
        // 切换到markdown编辑器
        function switchToMarkdownEditor(content) {
            // 隐藏 Monaco Editor domNode，仅显示 textarea
            if (window.editor && editor.getDomNode()) editor.getDomNode().style.display = 'none';
            mdTextarea.style.display = 'block';
            mdTextarea.value = content;
            currentIsMarkdown = true;
            isMdDirty = false;
            updateCurrentFileDisplay();
            // 显示预览区
            document.getElementById('preview').style.display = '';
            // 重新绑定光标和滚动同步
            mdTextarea.removeEventListener('keyup', syncPreviewToMdTextareaBlock);
            mdTextarea.removeEventListener('click', syncPreviewToMdTextareaBlock);
            mdTextarea.removeEventListener('scroll', syncPreviewToMdTextareaScroll);
            mdTextarea.addEventListener('keyup', syncPreviewToMdTextareaBlock);
            mdTextarea.addEventListener('click', syncPreviewToMdTextareaBlock);
            mdTextarea.addEventListener('scroll', syncPreviewToMdTextareaScroll);
        }
        // 切换到Monaco编辑器
        function switchToMonacoEditor(content, lang) {
            mdTextarea.style.display = 'none';
            if (window.editor && editor.getDomNode()) editor.getDomNode().style.display = '';
            editor.setValue(content);
            if (lang) monaco.editor.setModelLanguage(editor.getModel(), lang);
            currentIsMarkdown = false;
            isDirty = false;
            updateCurrentFileDisplay();
            // 隐藏预览区
            document.getElementById('preview').style.display = 'none';
            
            // 为C++文件添加右侧功能按钮
            if (lang === 'cpp') {
                addCppToolbar();
            } else {
                removeCppToolbar();
            }
        }
        
        // 添加C++工具栏
        function addCppToolbar() {
            removeCppToolbar(); // 先移除已存在的
            
            const toolbar = document.createElement('div');
            toolbar.id = 'cpp-toolbar';
            toolbar.style.cssText = 'position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:8px;z-index:100;';
            
            // 保存按钮
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '保存';
            saveBtn.title = '保存当前文件 (Ctrl+S)';
            saveBtn.style.cssText = 'padding:6px 12px;background:#f3f4f6;color:#222;border:1px solid #d1d5db;border-radius:5px;cursor:pointer;font-size:12px;transition:background 0.2s;';
            saveBtn.onmouseenter = () => saveBtn.style.background = '#e5e7eb';
            saveBtn.onmouseleave = () => saveBtn.style.background = '#f3f4f6';
            saveBtn.onclick = saveFile;
            
            // 编译按钮
            const compileBtn = document.createElement('button');
            compileBtn.textContent = '编译';
            compileBtn.title = '保存并编译当前文件';
            compileBtn.style.cssText = saveBtn.style.cssText;
            compileBtn.onmouseenter = () => compileBtn.style.background = '#e5e7eb';
            compileBtn.onmouseleave = () => compileBtn.style.background = '#f3f4f6';
            compileBtn.onclick = compileCurrentFile;
            
            // 检查文件类型 - 使用当前正在编辑的文件路径
            const fileName = currentFile ? currentFile.split('/').pop() : '';
            console.log('addCppToolbar - currentFile:', currentFile, 'fileName:', fileName);
            const isValidator = fileName === 'validator.cpp';
            const isChecker = fileName === 'checker.cpp';
            const isGenerator = fileName === 'generator.cpp';
            
            // 所有C++文件都显示保存和编译按钮
            toolbar.appendChild(saveBtn);
            toolbar.appendChild(compileBtn);
            
            // 添加运行按钮 - 对于普通C++文件和generator.cpp
            if (!isValidator && !isChecker) {
                const runBtn = document.createElement('button');
                runBtn.textContent = '运行';
                runBtn.title = '编译并运行当前程序，传入参数"1"';
                runBtn.style.cssText = saveBtn.style.cssText;
                runBtn.onmouseenter = () => runBtn.style.background = '#e5e7eb';
                runBtn.onmouseleave = () => runBtn.style.background = '#f3f4f6';
                runBtn.onclick = runCurrentFile;
                
                toolbar.appendChild(runBtn);
            }
            
            if (isValidator) {
                // validator文件：显示测试验证器按钮
                const validatorBtn = document.createElement('button');
                validatorBtn.textContent = '测试验证器';
                validatorBtn.title = '编译并测试validator，使用sample中的in文件';
                validatorBtn.style.cssText = saveBtn.style.cssText;
                validatorBtn.onmouseenter = () => validatorBtn.style.background = '#e5e7eb';
                validatorBtn.onmouseleave = () => validatorBtn.style.background = '#f3f4f6';
                validatorBtn.onclick = runValidatorTest;
                
                toolbar.appendChild(validatorBtn);
            } else if (!isChecker && !isGenerator) {
                // 普通C++文件（非validator、checker、generator）：显示diff按钮
                const diffBtn = document.createElement('button');
                diffBtn.textContent = 'diff';
                diffBtn.title = '编译并测试样例，显示与标准答案的差异';
                diffBtn.style.cssText = saveBtn.style.cssText;
                diffBtn.onmouseenter = () => diffBtn.style.background = '#e5e7eb';
                diffBtn.onmouseleave = () => diffBtn.style.background = '#f3f4f6';
                diffBtn.onclick = runDiffTest;
                
                toolbar.appendChild(diffBtn);
            }
            // checker.cpp 只显示保存和编译按钮
            
            document.getElementById('editor').appendChild(toolbar);
        }
        
        // 运行validator测试
        async function runValidatorTest() {
            if (!currentFile) {
                showSaveMsg('错误：未选择文件', true);
                return;
            }
            
            // 先保存文件
            await saveFile();
            
            const ext = currentFile.split('.').pop().toLowerCase();
            if (!['cpp', 'cc', 'cxx'].includes(ext)) {
                showSaveMsg('错误：不是C++文件', true);
                return;
            }
            
            // 检查是否是validator文件
            const fileName = currentFile.split('/').pop();
            if (fileName !== 'validator.cpp') {
                showSaveMsg('错误：只有validator.cpp文件支持此功能', true);
                return;
            }
            
            // 获取sample文件列表
            try {
                const sampleRes = await fetch('/api/tree?path=sample');
                if (!sampleRes.ok) {
                    showSaveMsg('错误：无法获取sample目录', true);
                    return;
                }
                const sampleFiles = await sampleRes.json();
                const inFiles = sampleFiles.filter(f => f.text.endsWith('.in')).map(f => f.text);
                
                if (inFiles.length === 0) {
                    showSaveMsg('错误：sample目录中没有.in文件', true);
                    return;
                }
                
                // 构建命令序列
                const commands = [];
                const problemId = getCurrentProblemId();
                
                // 获取平台信息并选择跨平台命令
                let rmCmd = 'rm -f'; // 默认使用rm
                let fileCheckCmd = 'if [ -f'; // 默认使用bash语法
                try {
                    const platformRes = await fetch('/api/platform');
                    if (platformRes.ok) {
                        const platformData = await platformRes.json();
                        rmCmd = platformData.rmCommand || 'rm -f';
                        fileCheckCmd = platformData.fileCheckCommand || 'if [ -f';
                        console.log(`[VALIDATOR] 平台信息:`, platformData);
                    }
                } catch (err) {
                    console.warn('无法获取平台信息，使用默认命令');
                }
                console.log(`[VALIDATOR] 最终使用的命令:`, { rmCmd, fileCheckCmd });
                
                // 构建清理、编译和检查命令
                const executablePath = `${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}`;
                const cleanCmd = `${rmCmd} "${executablePath}"`;
                const compileCmd = `g++ -O2 -std=c++14 -o "${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}" "${problemId}/${currentFile}"`;
                
                // 先添加清理命令
                commands.push(cleanCmd);
                console.log(`[VALIDATOR] 清理命令:`, cleanCmd);
                
                // 再添加编译命令
                commands.push(compileCmd);
                console.log(`[VALIDATOR] 编译命令:`, compileCmd);
                
                // 添加编译结果检查命令
                const checkCompileCmd = `${fileCheckCmd} "${executablePath}" ]; then echo "编译成功: ${executablePath} 已生成"; else echo "编译失败: ${executablePath} 不存在"; exit 1; fi`;
                commands.push(checkCompileCmd);
                console.log(`[VALIDATOR] 编译检查命令:`, checkCompileCmd);
                
                // 构建所有sample的validator测试命令
                const testCommands = [];
                for (const inFile of inFiles) {
                    // 单个sample的validator测试命令
                    const singleTestCmd = `"${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}" < ${problemId}/sample/${inFile}`;
                    testCommands.push(singleTestCmd);
                    
                    console.log(`[VALIDATOR] 构建测试命令 ${testCommands.length}:`, {
                        inFile,
                        singleTestCmd
                    });
                }
                
                // 添加所有测试命令
                commands.push(...testCommands);
                
                console.log(`[VALIDATOR] 总共 ${commands.length} 个命令:`, commands);
                
                // 在终端中执行命令
                if (window.terminalWs && window.terminalWs.readyState === WebSocket.OPEN) {
                    // 清空终端显示并滚动到底部
                    if (window.term) {
                        window.term.clear();
                        // 确保滚动到底部
                        setTimeout(() => {
                            window.term.scrollToBottom();
                        }, 100);
                    }
                    
                    // 逐个发送命令到终端
                    for (let i = 0; i < commands.length; i++) {
                        const cmd = commands[i];
                        console.log(`[VALIDATOR] 发送第 ${i + 1}/${commands.length} 个命令:`, cmd);
                        
                        // 检查命令类型并显示相应提示
                        if (cmd.includes('rm -f')) {
                            showSaveMsg('清理旧的可执行文件...');
                        } else if (cmd.includes('g++') && cmd.includes('-o')) {
                            showSaveMsg(`正在编译 validator.cpp...`);
                        } else if (cmd.includes('if [ -f') || (cmd.includes('if exist') && cmd.includes('echo.'))) {
                            showSaveMsg('检查编译结果...');
                        } else {
                            const sampleMatch = cmd.match(/sample(\d+)\.in/);
                            if (sampleMatch) {
                                showSaveMsg(`验证 sample${sampleMatch[1]}...`);
                            } else {
                                showSaveMsg(`执行命令 ${i + 1}/${commands.length}...`);
                            }
                        }
                        
                        window.terminalWs.send(cmd + '\r');
                        
                        // 发送命令后立即滚动到底部
                        setTimeout(() => {
                            scrollTerminalToBottom();
                        }, 50);
                        
                        // 等待一段时间再发送下一个命令
                        if (i < commands.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000)); // 增加等待时间
                        }
                    }
                    
                    showSaveMsg('所有validator测试命令已发送到终端');
                } else {
                    showSaveMsg('错误：终端WebSocket连接不可用', true);
                }
                
            } catch (err) {
                showSaveMsg('validator测试失败: ' + err.message, true);
            }
        }
        
        // 自动滚动终端到底部
        function scrollTerminalToBottom() {
            if (window.term) {
                // 滚动到最底部
                window.term.scrollLines(window.term.buffer.active.viewportY);
            }
        }
        
        // 清除终端内容
        function clearTerminal() {
            if (window.term) {
                window.term.clear();
            }
        }
        
        // 清除终端内容并滚动到底部
        function clearTerminalAndScroll() {
            clearTerminal();
            // 延迟滚动确保清除完成
            setTimeout(() => {
                scrollTerminalToBottom();
            }, 50);
        }
        
        // 将函数挂载到window对象，方便控制台测试
        window.scrollTerminalToBottom = scrollTerminalToBottom;
        window.clearTerminal = clearTerminal;
        window.clearTerminalAndScroll = clearTerminalAndScroll;
        
        // 移除C++工具栏
        function removeCppToolbar() {
            const toolbar = document.getElementById('cpp-toolbar');
            if (toolbar) toolbar.remove();
        }
        
        // 编译当前文件
        async function compileCurrentFile() {
            if (!currentFile) {
                showSaveMsg('错误：未选择文件', true);
                return;
            }
            
            // 先保存文件
            await saveFile();
            
            const ext = currentFile.split('.').pop().toLowerCase();
            if (!['cpp', 'cc', 'cxx'].includes(ext)) {
                showSaveMsg('错误：不是C++文件', true);
                return;
            }
            
            // 获取平台信息
            let rmCmd = 'rm -f'; // 默认使用rm
            try {
                const platformRes = await fetch('/api/platform');
                if (platformRes.ok) {
                    const platformData = await platformRes.json();
                    rmCmd = platformData.rmCommand || 'rm -f';
                }
            } catch (err) {
                console.warn('无法获取平台信息，使用默认命令');
            }
            
            // 构建清理和编译命令
            const fileName = currentFile.split('/').pop();
            const problemId = getCurrentProblemId();
            const executablePath = `${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}`;
            const cleanCmd = `${rmCmd} "${executablePath}"`;
            const compileCmd = `g++ -O2 -std=c++14 -o "${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}" "${problemId}/${currentFile}"`;
            
            // 在终端中执行编译命令
            if (window.terminalWs && window.terminalWs.readyState === WebSocket.OPEN) {
                // 清空终端显示并滚动到底部
                clearTerminalAndScroll();
                
                // 发送清理命令
                console.log(`[COMPILE] 发送清理命令:`, cleanCmd);
                showSaveMsg('清理旧的可执行文件...');
                window.terminalWs.send(cleanCmd + '\r');
                
                // 延迟发送编译命令
                setTimeout(() => {
                    console.log(`[COMPILE] 发送编译命令:`, compileCmd);
                    showSaveMsg(`正在编译 ${currentFile}...`);
                    window.terminalWs.send(compileCmd + '\r');
                    
                    // 发送命令后立即滚动到底部
                    setTimeout(() => {
                        scrollTerminalToBottom();
                    }, 50);
                }, 500);
                
                showSaveMsg('编译命令已发送到终端');
            } else {
                showSaveMsg('错误：终端WebSocket连接不可用', true);
            }
        }
        
        // 运行当前文件
        async function runCurrentFile() {
            if (!currentFile) {
                showSaveMsg('错误：未选择文件', true);
                return;
            }
            
            // 先保存文件
            await saveFile();
            
            const ext = currentFile.split('.').pop().toLowerCase();
            if (!['cpp', 'cc', 'cxx'].includes(ext)) {
                showSaveMsg('错误：不是C++文件', true);
                return;
            }
            
            // 检查是否是特殊文件
            const fileName = currentFile.split('/').pop();
            if (['validator.cpp', 'checker.cpp'].includes(fileName)) {
                showSaveMsg('错误：特殊文件不支持直接运行', true);
                return;
            }
            
            // 获取平台信息
            let rmCmd = 'rm -f'; // 默认使用rm
            let isWindows = false; // 默认不是Windows
            let fileCheckCommand = 'if [ -f'; // 默认使用Unix/Linux/macOS语法
            try {
                const platformRes = await fetch('/api/platform');
                if (platformRes.ok) {
                    const platformData = await platformRes.json();
                    rmCmd = platformData.rmCommand || 'rm -f';
                    isWindows = platformData.isWindows || false;
                    fileCheckCommand = platformData.fileCheckCommand || 'if [ -f';
                }
            } catch (err) {
                console.warn('无法获取平台信息，使用默认命令');
            }
            
            // 构建清理、编译和运行命令
            const problemId = getCurrentProblemId();
            const executablePath = `${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}`;
            const cleanCmd = `${rmCmd} "${executablePath}"`;
            const compileCmd = `g++ -O2 -std=c++14 -o "${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}" "${problemId}/${currentFile}"`;
            
            // 构建跨平台的文件检查和运行命令
            let fileCheckCmd;
            if (isWindows) {
                // Windows平台使用cmd语法
                fileCheckCmd = `if exist "${executablePath}" ("${executablePath}" 1)`;
            } else {
                // Unix/Linux/macOS平台使用bash语法
                fileCheckCmd = `if [ -f "${executablePath}" ]; then "${executablePath}" 1; fi`;
            }
            
            // 在终端中执行命令
            if (window.terminalWs && window.terminalWs.readyState === WebSocket.OPEN) {
                // 清空终端显示并滚动到底部
                clearTerminalAndScroll();
                
                // 发送清理命令
                console.log(`[RUN] 发送清理命令:`, cleanCmd);
                showSaveMsg('清理旧的可执行文件...');
                window.terminalWs.send(cleanCmd + '\r');
                
                // 延迟发送编译命令
                setTimeout(() => {
                    console.log(`[RUN] 发送编译命令:`, compileCmd);
                    showSaveMsg(`正在编译 ${currentFile}...`);
                    window.terminalWs.send(compileCmd + '\r');
                    
                    // 编译完成后运行程序
                    setTimeout(() => {
                        // 检查可执行文件是否存在并直接运行或不执行
                        console.log(`[RUN] 发送运行命令:`, fileCheckCmd);
                        showSaveMsg(`正在运行 ${currentFile}...`);
                        window.terminalWs.send(fileCheckCmd + '\r');
                        
                        // 发送命令后立即滚动到底部
                        setTimeout(() => {
                            scrollTerminalToBottom();
                        }, 50);
                    }, 1000);
                    
                    // 发送命令后立即滚动到底部
                    setTimeout(() => {
                        scrollTerminalToBottom();
                    }, 50);
                }, 500);
                
                showSaveMsg('运行命令已发送到终端');
            } else {
                showSaveMsg('错误：终端WebSocket连接不可用', true);
            }
        }
        
        // 运行diff测试
        async function runDiffTest() {
            if (!currentFile) {
                showSaveMsg('错误：未选择文件', true);
                return;
            }
            
            // 先保存文件
            await saveFile();
            
            const ext = currentFile.split('.').pop().toLowerCase();
            if (!['cpp', 'cc', 'cxx'].includes(ext)) {
                showSaveMsg('错误：不是C++文件', true);
                return;
            }
            
            // 检查是否是特殊文件
            const fileName = currentFile.split('/').pop();
            if (['validator.cpp', 'check.cpp', 'generator.cpp'].includes(fileName)) {
                showSaveMsg('错误：validator.cpp、check.cpp、generator.cpp 不支持diff测试', true);
                return;
            }
            
            // 获取sample文件列表
            try {
                const sampleRes = await fetch('/api/tree?path=sample');
                if (!sampleRes.ok) {
                    showSaveMsg('错误：无法获取sample目录', true);
                    return;
                }
                const sampleFiles = await sampleRes.json();
                const inFiles = sampleFiles.filter(f => f.text.endsWith('.in')).map(f => f.text);
                
                if (inFiles.length === 0) {
                    showSaveMsg('错误：sample目录中没有.in文件', true);
                    return;
                }
                
                // 构建命令序列
                const commands = [];
                const problemId = getCurrentProblemId();
                const baseName = fileName.replace(/\.(cpp|cc|cxx)$/, '');
                
                // 获取平台信息并选择跨平台命令
                let diffCmd = 'diff -B -w'; // 默认使用diff，忽略空行和空白字符
                let rmCmd = 'rm -f'; // 默认使用rm
                let isWindows = false; // 默认不是Windows
                let fileCheckCommand = 'if [ -f'; // 默认使用bash语法
                try {
                    const platformRes = await fetch('/api/platform');
                    if (platformRes.ok) {
                        const platformData = await platformRes.json();
                        diffCmd = platformData.diffCommand; // 已经包含了忽略参数
                        rmCmd = platformData.rmCommand || 'rm -f';
                        isWindows = platformData.isWindows || false;
                        fileCheckCommand = platformData.fileCheckCommand || 'if [ -f';
                        console.log(`[DIFF] 平台信息:`, platformData);
                        console.log(`[DIFF] 使用忽略空白和空行的diff命令:`, diffCmd);
                    }
                } catch (err) {
                    console.warn('无法获取平台信息，使用默认命令');
                }
                console.log(`[DIFF] 最终使用的命令:`, { diffCmd, rmCmd, fileCheckCommand });
                
                // 构建清理、编译和检查命令
                const executablePath = `${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}`;
                const cleanCmd = `${rmCmd} "${executablePath}"`;
                const compileCmd = `g++ -O2 -std=c++14 -o "${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}" "${problemId}/${currentFile}"`;
                const mkdirCmd = `mkdir -p ${problemId}/outputs/${baseName}`;
                
                // 先添加清理命令
                commands.push(cleanCmd);
                console.log(`[DIFF] 清理命令:`, cleanCmd);
                
                // 再添加编译命令
                commands.push(compileCmd);
                console.log(`[DIFF] 编译命令:`, compileCmd);
                
                // 添加跨平台的编译结果检查命令（无echo输出）
                let checkCompileCmd;
                if (isWindows) {
                    // Windows平台使用cmd语法，无echo输出
                    checkCompileCmd = `if exist "${executablePath}" (echo.) else (echo.)`;
                } else {
                    // Unix/Linux/macOS平台使用bash语法，无echo输出
                    checkCompileCmd = `if [ -f "${executablePath}" ]; then true; else true; fi`;
                }
                commands.push(checkCompileCmd);
                
                console.log(`[DIFF] 编译检查命令:`, checkCompileCmd);
                
                // 构建所有sample的测试命令
                const testCommands = [];
                for (const inFile of inFiles) {
                    const ansFile = inFile.replace('.in', '.ans');
                    const outputFile = inFile.replace('.in', '.out');
                    // 使用平台特定的比较命令，已包含忽略空白和空行参数
                    const diffCmdFinal = `${diffCmd} "${problemId}/outputs/${baseName}/${outputFile}" "${problemId}/sample/${ansFile}"`;
                    
                    // 单个sample的测试命令
                    const singleTestCmd = `"${problemId}/${currentFile.replace(/\.(cpp|cc|cxx)$/, '')}" < "${problemId}/sample/${inFile}" > "${problemId}/outputs/${baseName}/${outputFile}" && ${diffCmdFinal}`;
                    testCommands.push(singleTestCmd);
                    
                    console.log(`[DIFF] 构建测试命令 ${testCommands.length}:`, {
                        inFile,
                        ansFile,
                        outputFile,
                        diffCmd,
                        diffCmdFinal,
                        singleTestCmd
                    });
                }
                
                // 添加mkdir命令
                commands.push(mkdirCmd);
                console.log(`[DIFF] 创建目录命令:`, mkdirCmd);
                
                // 添加所有测试命令
                commands.push(...testCommands);
                
                console.log(`[DIFF] 总共 ${commands.length} 个命令:`, commands);
                
                // 在终端中执行命令
                if (window.terminalWs && window.terminalWs.readyState === WebSocket.OPEN) {
                    // 清空终端显示并滚动到底部
                    if (window.term) {
                        window.term.clear();
                        // 确保滚动到底部
                        setTimeout(() => {
                            window.term.scrollToBottom();
                        }, 100);
                    }
                    
                    // 逐个发送命令到终端
                    for (let i = 0; i < commands.length; i++) {
                        const cmd = commands[i];
                        console.log(`[DIFF] 发送第 ${i + 1}/${commands.length} 个命令:`, cmd);
                        
                        // 检查命令类型并显示相应提示
                        if (cmd.includes('rm -f')) {
                            showSaveMsg('清理旧的可执行文件...');
                        } else if (cmd.includes('g++') && cmd.includes('-o')) {
                            showSaveMsg(`正在编译 ${currentFile}...`);
                        } else if (cmd.includes('if [ -f')) {
                            showSaveMsg('检查编译结果...');
                        } else if (cmd.includes('mkdir')) {
                            showSaveMsg('创建输出目录...');
                        } else {
                            const sampleMatch = cmd.match(/sample(\d+)\.in/);
                            if (sampleMatch) {
                                showSaveMsg(`测试 sample${sampleMatch[1]}...`);
                            } else {
                                showSaveMsg(`执行命令 ${i + 1}/${commands.length}...`);
                            }
                        }
                        
                        window.terminalWs.send(cmd + '\r');
                        
                        // 发送命令后立即滚动到底部
                        setTimeout(() => {
                            scrollTerminalToBottom();
                        }, 50);
                        
                        // 等待一段时间再发送下一个命令
                        if (i < commands.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000)); // 增加等待时间，让用户看到编译结果
                        }
                    }
                    
                    showSaveMsg('所有diff测试命令已发送到终端');
                } else {
                    showSaveMsg('错误：终端WebSocket连接不可用', true);
                }
                
            } catch (err) {
                showSaveMsg('diff测试失败: ' + err.message, true);
            }
        }
        
        // 监听textarea内容变化
        mdTextarea.addEventListener('input', function () {
            isMdDirty = mdTextarea.value !== lastSavedContent;
            updateCurrentFileDisplay();
            updatePreviewFromMdTextarea();
        });
        // Ctrl+S保存
        mdTextarea.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveFile();
            }
        });
        // 粘贴图片
        mdTextarea.addEventListener('paste', async function (event) {
            const items = event.clipboardData && event.clipboardData.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    event.preventDefault();
                    const file = item.getAsFile();
                    const ext = file.type.split('/')[1] || 'png';
                    const rand = Array.from({ length: 16 }, () => Math.random().toString(36)[2]).join('');
                    const filename = rand + '.' + ext;
                    let problemId = getCurrentProblemId && getCurrentProblemId();
                    if (!problemId) {
                        alert('无法识别题目ID，图片粘贴失败');
                        return;
                    }
                    const formData = new FormData();
                    formData.append('file', file, filename);
                    formData.append('filename', filename);
                    formData.append('problemId', problemId);
                    try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data && data.relPath) {
                            // 在光标处插入markdown图片语法
                            const start = mdTextarea.selectionStart;
                            const end = mdTextarea.selectionEnd;
                            const insertText = `![粘贴图片](file://additional_file/${filename})`;
                            mdTextarea.value = mdTextarea.value.slice(0, start) + insertText + mdTextarea.value.slice(end);
                            mdTextarea.selectionStart = mdTextarea.selectionEnd = start + insertText.length;
                            isMdDirty = true;
                            updateCurrentFileDisplay();
                            updatePreviewFromMdTextarea();
                        } else {
                            alert('图片上传失败');
                        }
                    } catch (e) {
                        alert('图片上传异常: ' + e.message);
                    }
                }
            }
        });
        // 配置 marked 高亮
        if (window.marked && window.hljs) {
            marked.setOptions({
                highlight: function (code, lang) {
                    if (window.hljs && lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    // 未定义语言自动降级为 text
                    return hljs.highlight(code, { language: 'text' }).value;
                },
                langPrefix: 'language-'
            });
        }
        // marked renderer with data-line for sync
        if (window.marked) {
            const renderer = new marked.Renderer();
            let lineNoMap = [];
            function safeInline(text) {
                if (typeof text === 'string') return text;
                if (text && typeof text.text === 'string') return marked.parseInline(text.text);
                return '';
            }
            renderer.paragraph = function(text) {
                const line = lineNoMap.shift() || 1;
                return `<p data-line="${line}">${safeInline(text)}</p>`;
            };
            renderer.code = function(code, infostring, escaped) {
                const line = lineNoMap.shift() || 1;
                let codeStr = '';
                if (typeof code === 'string') codeStr = code;
                else if (code && typeof code.text === 'string') codeStr = code.text;
                else if (code && typeof code.raw === 'string') codeStr = code.raw;
                return `<pre data-line="${line}"><code>${codeStr}</code></pre>`;
            };
            renderer.heading = function(...args) {
                // console.log('【调试】heading args:', args);
                let text = '';
                let level = 2;
                // marked 5.x+ 只传一个对象
                if (args.length === 1 && typeof args[0] === 'object') {
                    const obj = args[0];
                    text = obj.text || '';
                    level = obj.depth || 2;
                } else {
                    // 兼容老版本
                    text = args[0];
                    level = args[1];
                    if (typeof level === 'object' && level && typeof level.level === 'number') {
                        level = level.level;
                    }
                    if (typeof text === 'object' && text && typeof text.level === 'number') {
                        level = text.level;
                        text = text.text || '';
                    }
                }
                const line = lineNoMap.shift() || 1;
                return `<h${level} data-line="${line}">${safeInline(text)}</h${level}>`;
            };
            renderer.listitem = function(text) {
                const line = lineNoMap.shift() || 1;
                return `<li data-line="${line}">${safeInline(text)}</li>`;
            };
            marked.use({ renderer });
            window._markedLineNoMap = lineNoMap;
        }
        // 预览区整体渲染markdown
        function updatePreviewFromMdTextarea() {
            const content = mdTextarea.value;
            // 替换 file://additional_file/xxx 为 /files/additional_file/xxx
            const fixedContent = content.replace(/file:\/\/additional_file\//g, '/files/additional_file/');
            // 统计每一行的起始行号，简单做法：每行都 push 行号
            if (window._markedLineNoMap) {
                window._markedLineNoMap.length = 0;
                const lines = fixedContent.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    window._markedLineNoMap.push(i + 1);
                }
            }
            const html = marked.parse(fixedContent);
            // console.log('【调试】updatePreviewFromMdTextarea 渲染 html:', html);
            const previewDiv = document.getElementById('preview-html');
            if (previewDiv) {
                previewDiv.innerHTML = html;
                // 代码高亮
                if (window.hljs) {
                    previewDiv.querySelectorAll('pre code').forEach(function (block) {
                        window.hljs.highlightElement(block);
                        if (!block.classList.contains('hljs')) block.classList.add('hljs');
                    });
                }
                // 代码块复制按钮和样例导入按钮
                // 新逻辑：找到"样例/示例"标题后，依次为其后所有代码块添加按钮，编号顺延，取消后后续编号顺延
                // 只处理第一个"样例/示例"标题后的所有代码块
                const preList = Array.from(previewDiv.querySelectorAll('pre'));
                const headingList = Array.from(previewDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                // 找到第一个"样例/示例"标题
                let firstSampleHeading = null;
                for (let h of headingList) {
                    if (/样例|示例|Sample|Example/i.test(h.textContent)) {
                        firstSampleHeading = h;
                        break;
                    }
                }
                if (firstSampleHeading) {
                    // 找到 heading 后的所有 pre（包括所有后续pre，不管中间有没有新heading）
                    let cur = firstSampleHeading.nextElementSibling;
                    let codeBlocks = [];
                    while (cur) {
                        if (cur.tagName === 'PRE') codeBlocks.push(cur);
                        cur = cur.nextElementSibling;
                    }
                    // 用于保存每个代码块的"是否被取消"状态
                    let cancelState = codeBlocks.map(() => false);
                    // 渲染所有按钮的函数
                    function renderSampleBtns() {
                        // 先移除所有已存在的按钮容器
                        codeBlocks.forEach(pre => {
                            // 移除外部按钮容器
                            if (pre.previousElementSibling && pre.previousElementSibling.classList && pre.previousElementSibling.classList.contains('sample-btn-outer-bar')) {
                                pre.previousElementSibling.remove();
                            }
                            // 移除旧的复制按钮
                            const oldCopyBtn = pre.querySelector('.copy-btn');
                            if (oldCopyBtn) {
                                oldCopyBtn.remove();
                            }
                        });
                        // 递推编号和类型
                        let seq = 0;
                        codeBlocks.forEach((pre, i) => {
                            if (cancelState[i]) return;
                            // 复制按钮（保留在pre右上角）
                                const copyBtn = document.createElement('button');
                                copyBtn.textContent = '复制';
                                copyBtn.className = 'copy-btn';
                                copyBtn.style.cssText = 'position:absolute;top:6px;right:12px;font-size:12px;padding:2px 8px;border-radius:5px;background:#f3f4f6;color:#222;border:1px solid #d1d5db;cursor:pointer;z-index:10;transition:background 0.2s;';
                                copyBtn.onmouseenter = function() { this.style.background = '#f3f4f6'; };
                                copyBtn.onmouseleave = function() { this.style.background = 'transparent'; };
                                copyBtn.onclick = function (e) {
                                    e.stopPropagation();
                                    const code = pre.querySelector('code');
                                    if (code) {
                                        navigator.clipboard.writeText(code.innerText);
                                        copyBtn.textContent = '已复制';
                                        setTimeout(() => { copyBtn.textContent = '复制'; }, 1200);
                                    }
                                };
                                pre.style.position = 'relative';
                                pre.appendChild(copyBtn);
                            // 外部按钮容器
                            const outerBar = document.createElement('div');
                            outerBar.className = 'sample-btn-outer-bar';
                            outerBar.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;margin-bottom:2px;';
                            
                            const buttonGroup = document.createElement('div');
                            buttonGroup.style.cssText = 'display:inline-flex;align-items:center;border-radius:5px;overflow:hidden;';
                            
                            const bar = document.createElement('div');
                            bar.className = 'sample-btn-bar';
                            bar.style.cssText = 'display:flex;align-items:center;';
                            let idx = seq + 1;
                            let type = (idx % 2 === 1) ? 'in' : 'ans';
                            let fileIdx = Math.floor((idx + 1) / 2).toString().padStart(2, '0');
                            const btn = document.createElement('button');
                            btn.textContent = `写入 sample${fileIdx}.${type}`;
                            btn.className = 'import-sample-btn';
                            btn.title = `将此代码块内容导入 sample/${'sample'+fileIdx+'.'+type}`;
                            btn.style.cssText = 'font-size:12px;padding:2px 12px;background:transparent;color:#222;border:none;cursor:pointer;z-index:10;transition:background 0.2s;';
                            btn.onmouseenter = function() { this.style.background = '#f3f4f6'; };
                            btn.onmouseleave = function() { this.style.background = 'transparent'; };
                            btn.onclick = async function (e) {
                                e.stopPropagation();
                                const code = pre.querySelector('code');
                                if (code) {
                                    const content = code.innerText.replace(/\r?\n$/, '');
                                    const msg = `即将写入文件: sample/sample${fileIdx}.${type}\n\n内容如下（UTF-8编码）：\n\n${content.length > 200 ? content.slice(0,200)+'...（内容过长已截断）' : content}`;
                                    if (!window.confirm(msg)) return;
                                    const res = await fetch('/api/file', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json; charset=utf-8' },
                                        body: JSON.stringify({ path: `sample/sample${fileIdx}.${type}`, content })
                                    });
                                    if (res.ok) {
                                        showSaveMsg(`已导入 sample${fileIdx}.${type}`);
                                    } else {
                                        showSaveMsg(`导入 sample${fileIdx}.${type} 失败`, true);
                                    }
                                }
                            };
                            // 导入按钮
                            const importBtn = document.createElement('button');
                            importBtn.textContent = `读入 sample${fileIdx}.${type}`;
                            importBtn.className = 'import-from-sample-btn';
                            importBtn.title = `将 sample/${'sample'+fileIdx+'.'+type} 文件内容导入此代码块，并同步到 Markdown`;
                            importBtn.style.cssText = btn.style.cssText;
                            importBtn.onmouseenter = btn.onmouseenter;
                            importBtn.onmouseleave = btn.onmouseleave;
                            importBtn.onclick = async function (e) {
                                e.stopPropagation();
                                // 拉取 sample 文件内容
                                const res = await fetch(`/api/file?path=sample/sample${fileIdx}.${type}`);
                                if (!res.ok) {
                                    showSaveMsg(`读取 sample${fileIdx}.${type} 失败`, true);
                                    return;
                                }
                                const content = await res.text();
                                // 找到 pre > code
                                const code = pre.querySelector('code');
                                if (!code) return;
                                // 替换 code 内容
                                code.innerText = content;
                                // 动画高亮
                                pre.classList.add('import-flash');
                                setTimeout(() => pre.classList.remove('import-flash'), 1200);
                                // 同步修改 markdown 源码
                                // 1. 找到该代码块在 markdown 源码中的起止行
                                const md = mdTextarea.value;
                                const lines = md.split('\n');
                                let codeBlockIdx = 0, startLine = -1, endLine = -1, inCode = false;
                                for (let i = 0; i < lines.length; i++) {
                                    if (/^```/.test(lines[i])) {
                                        inCode = !inCode;
                                        if (inCode) {
                                            codeBlockIdx++;
                                            if (codeBlockIdx === idx) startLine = i + 1;
                                        } else {
                                            if (codeBlockIdx === idx && startLine !== -1) {
                                                endLine = i;
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (startLine !== -1 && endLine !== -1) {
                                    lines.splice(startLine, endLine - startLine, ...content.replace(/\r/g, '').split('\n'));
                                    mdTextarea.value = lines.join('\n');
                                    isMdDirty = true;
                                    updateCurrentFileDisplay();
                                    updatePreviewFromMdTextarea();
                                }
                                showSaveMsg(`已导入 sample${fileIdx}.${type} 到代码块`);
                            };
                            bar.appendChild(importBtn);
                            // 竖线分隔符
                            const separator = document.createElement('span');
                            separator.style.cssText = 'width:1px;height:16px;background:#d1d5db;';
                            // bar.appendChild(separator);
                            bar.appendChild(btn);
                            // 竖线分隔符
                            const separator2 = document.createElement('span');
                            separator2.style.cssText = 'width:1px;height:16px;background:#d1d5db;';
                            // bar.appendChild(separator2);
                            const cancelBtn = document.createElement('button');
                            cancelBtn.textContent = '取消';
                            cancelBtn.className = 'cancel-sample-btn';
                            cancelBtn.title = '取消本代码块的导入，后续编号顺延';
                            cancelBtn.style.cssText = 'font-size:12px;padding:2px 12px;background:transparent;color:#222;border:none;cursor:pointer;z-index:10;transition:background 0.2s;';
                            cancelBtn.onmouseenter = function() { this.style.background = '#f3f4f6'; };
                            cancelBtn.onmouseleave = function() { this.style.background = 'transparent'; };
                            cancelBtn.onclick = function (e) {
                                e.stopPropagation();
                                cancelState[i] = true;
                                renderSampleBtns();
                            };
                            bar.appendChild(cancelBtn);
                            buttonGroup.appendChild(bar);
                            outerBar.appendChild(buttonGroup);
                            pre.parentNode.insertBefore(outerBar, pre);
                            seq++;
                        });
                    }
                    renderSampleBtns();
                }
                if (window.renderMathInElement) {
                    try {
                        window.renderMathInElement(previewDiv, {
                            delimiters: [
                                { left: '$$', right: '$$', display: true },
                                { left: '$', right: '$', display: false }
                            ],
                            throwOnError: false
                        });
                    } catch (e) { console.error('KaTeX渲染失败', e); }
                }
            }
        }
        // textarea 光标变动时预览区段落/代码块级同步
        mdTextarea.addEventListener('keyup', syncPreviewToMdTextareaBlock);
        mdTextarea.addEventListener('click', syncPreviewToMdTextareaBlock);
        function syncPreviewToMdTextareaBlock() {
            const pos = mdTextarea.selectionStart;
            const textUptoPos = mdTextarea.value.slice(0, pos);
            const lines = textUptoPos.split('\n');
            const lineNum = lines.length;
            const previewDiv = document.getElementById('preview-html');
            if (previewDiv) {
                const el = previewDiv.querySelector(`[data-line='${lineNum}']`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        // 滚动同步函数
        function syncPreviewToMdTextareaScroll() {
            const scrollTop = mdTextarea.scrollTop;
            const lineHeight = parseInt(window.getComputedStyle(mdTextarea).lineHeight) || 20;
            const allLines = mdTextarea.value.split('\n');
            const firstVisibleLine = Math.floor(scrollTop / lineHeight);
            const previewDiv = document.getElementById('preview-html');
            if (previewDiv) {
                const el = previewDiv.querySelector(`[data-line='${firstVisibleLine+1}']`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        // textarea 滚动时预览区同步到首个可见段落
        mdTextarea.addEventListener('scroll', function () {
            const scrollTop = mdTextarea.scrollTop;
            const lineHeight = parseInt(window.getComputedStyle(mdTextarea).lineHeight) || 20;
            const allLines = mdTextarea.value.split('\n');
            const firstVisibleLine = Math.floor(scrollTop / lineHeight);
            // 找到首个可见段落的起始行
            let blockStart = 0, inCode = false;
            for (let i = 0; i <= firstVisibleLine; i++) {
                const line = allLines[i];
                if (/^```/.test(line)) inCode = !inCode;
                if (!inCode && line.trim() === '' && i < firstVisibleLine) blockStart = i + 1;
            }
            // 取该段落内容
            let blockEnd = allLines.length;
            inCode = false;
            for (let i = blockStart; i < allLines.length; i++) {
                const line = allLines[i];
                if (/^```/.test(line)) inCode = !inCode;
                if (!inCode && line.trim() === '' && i > blockStart) { blockEnd = i; break; }
            }
            const blockText = allLines.slice(blockStart, blockEnd).join('\n').trim();
            const previewDiv = document.getElementById('preview-html');
            if (previewDiv && blockText) {
                let found = null;
                previewDiv.childNodes.forEach(el => {
                    if (!found && el.textContent && el.textContent.trim().replace(/\s+/g, '') === blockText.replace(/\s+/g, '')) {
                        found = el;
                    }
                });
                if (found) {
                    found.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // 合并唯一 loadFile 逻辑，增加调试日志和错误处理
        async function loadFile(path) {
            console.log('loadFile', path);
            if (isDirty || isMdDirty) {
                if (!confirm('当前文件有未保存内容，是否保存后切换？')) return;
                await saveFile();
            }
            try {
                const res = await fetch('/api/file?path=' + encodeURIComponent(path));
                if (!res.ok) throw new Error('文件加载失败: ' + res.status);
                const text = await res.text();
                // 先设置当前文件，这样addCppToolbar()就能获取到正确的文件名
                currentFile = path;
                const ext = path.split('.').pop();
                let lang = 'plaintext';
                if (ext === 'md') {
                    switchToMarkdownEditor(text);
                    updatePreviewFromMdTextarea();
                    removeCppToolbar(); // 移除C++工具栏
                } else {
                    const isCpp = ext === 'cpp' || ext === 'cc' || ext === 'cxx';
                    switchToMonacoEditor(text, isCpp ? 'cpp' :
                        ext === 'js' ? 'javascript' :
                            ext === 'json' ? 'json' :
                                (ext === 'yaml' || ext === 'yml') ? 'yaml' : 'plaintext');
                    
                    // 如果是C++文件，添加工具栏
                    if (isCpp) {
                        addCppToolbar();
                    } else {
                        removeCppToolbar(); // 移除C++工具栏
                    }
                }
                lastSavedContent = text;
                isDirty = false;
                isMdDirty = false;
                updateCurrentFileDisplay();
                // 预览markdown
            } catch (err) {
                showSaveMsg('加载文件失败: ' + err.message, true);
                console.error('加载文件失败', err);
            }
        }
        window.loadFile = loadFile;
        // 保存文件内容
        async function saveFile() {
            if (!currentFile) return showSaveMsg('未选择文件', true);
            let content = '';
            if (currentIsMarkdown) {
                content = mdTextarea.value;
            } else {
                content = editor.getValue();
            }
            const res = await fetch('/api/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentFile, content })
            });
            if (res.ok) {
                lastSavedContent = content;
                isDirty = false;
                isMdDirty = false;
                updateCurrentFileDisplay();
                showSaveMsg('已保存');
            }
            else showSaveMsg('保存失败', true);
        }
        function updateCurrentFileDisplay() {
            const el = document.getElementById('current-file');
            el.textContent = currentFile ? ((isDirty || isMdDirty) ? currentFile + ' *' : currentFile) : '';
        }
        // 重载文件内容
        function reloadFile() { if (currentFile) loadFile(currentFile); }
        // Ctrl+S 保存
        window.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
        });
    });
});


// 顶部消息条函数，需在所有用到它的函数之前定义
function showSaveMsg(msg, error) {
    // 创建消息容器（如果不存在）
    let container = document.getElementById('save-msg-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'save-msg-container';
        container.style.cssText = 'position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 3000; display: flex; flex-direction: column; align-items: center; gap: 10px;';
        document.body.appendChild(container);
    }
    
    // 创建消息元素
    const bar = document.createElement('div');
    bar.className = 'save-msg-item';
    bar.textContent = msg;
    bar.style.cssText = `
        background: ${error ? '#ef4444' : '#22c55e'};
        color: #fff;
        font-size: 15px;
        padding: 9px 32px;
        border-radius: 9px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.13);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s, top 0.18s;
        font-weight: bold;
        letter-spacing: 1px;
        position: relative;
    `;
    
    container.appendChild(bar);
    
    // 显示消息
    setTimeout(() => {
        bar.style.opacity = '1';
        bar.style.top = '20px';
    }, 10);
    
    // 2秒后隐藏并移除消息
    setTimeout(() => {
        bar.style.opacity = '0';
        bar.style.top = '12px';
        // 动画结束后移除元素
        setTimeout(() => {
            if (bar.parentNode) {
                bar.parentNode.removeChild(bar);
                // 如果没有更多消息，移除容器
                if (container.children.length === 0) {
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }
            }
        }, 180);
    }, 2000);
}
// 题目状态可视化
let lastStatus = {};
let statusFailCount = 0;
async function fetchStatus() {
    if (statusFailCount >= 5) return;
    const panel = document.getElementById('status-panel');
    const keys = ['problem', 'std', 'generator', 'validator', 'testsample', 'data', 'check', 'package'];
    if (!panel._statusNodes) panel._statusNodes = {};
    try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('status.json 不存在');
        const status = await res.json();
        // 首次渲染
        if (!panel.hasChildNodes() || Object.keys(panel._statusNodes).length !== keys.length) {
            panel.innerHTML = '';
            keys.forEach(k => {
                const s = status[k] || {};
                let st = (s.status || 'unknown').toLowerCase();
                let desc = s.desc || k;
                let dotClass = 'status-dot-unknown', cardClass = 'status-unknown', text = '需重做';
                if (st === 'done') { dotClass = 'status-dot-done'; cardClass = 'status-done'; text = '完成'; }
                else if (st === 'pending') { dotClass = 'status-dot-pending'; cardClass = 'status-pending'; text = '待处理'; }
                else if (st === 'need-redo') { dotClass = 'status-dot-need-redo'; cardClass = 'status-need-redo'; text = '需重做'; }
                else if (st === 'error' || st === 'failed') { dotClass = 'status-dot-error'; cardClass = 'status-error'; text = '失败'; }
                let tooltip = `<b>${k}</b>\n状态: ${s.status || '未知'}\n说明: ${desc}`;
                if (s.time) tooltip += `\n时间: ${s.time}`;
                const node = document.createElement('span');
                node.className = `status-card ${cardClass}`;
                node.setAttribute('data-tooltip', tooltip.replace(/"/g, '&quot;'));
                node.innerHTML = `<span class=\"status-dot ${dotClass}\"></span><span style=\"display:block;font-weight:500;line-height:1.1;\">${k}</span><span style=\"display:block;margin-left:0;font-size:11px;line-height:1.1;\">${text}</span>`;
                panel.appendChild(node);
                panel._statusNodes[k] = node;
            });
            setupStatusTooltip(panel);
        } else {
            // 增量刷新
            keys.forEach(k => {
                const s = status[k] || {};
                const last = lastStatus[k] || {};
                if (JSON.stringify(s) !== JSON.stringify(last)) {
                    let st = (s.status || 'unknown').toLowerCase();
                    let desc = s.desc || k;
                    let dotClass = 'status-dot-unknown', cardClass = 'status-unknown', text = '需重做';
                    if (st === 'done') { dotClass = 'status-dot-done'; cardClass = 'status-done'; text = '完成'; }
                    else if (st === 'pending') { dotClass = 'status-dot-pending'; cardClass = 'status-pending'; text = '待处理'; }
                    else if (st === 'need-redo') { dotClass = 'status-dot-need-redo'; cardClass = 'status-need-redo'; text = '需重做'; }
                    else if (st === 'error' || st === 'failed') { dotClass = 'status-dot-error'; cardClass = 'status-error'; text = '失败'; }
                    let tooltip = `<b>${k}</b>\n状态: ${s.status || '未知'}\n说明: ${desc}`;
                    if (s.time) tooltip += `\n时间: ${s.time}`;
                    const node = panel._statusNodes[k];
                    // 先移除所有动画类
                    node.classList.remove('status-changed', 'status-done', 'status-pending', 'status-need-redo', 'status-error', 'status-failed');
                    node.className = `status-card ${cardClass}`;
                    node.classList.add('status-changed');
                    node.setAttribute('data-tooltip', tooltip.replace(/"/g, '&quot;'));
                    node.innerHTML = `<span class=\"status-dot ${dotClass}\"></span><span style=\"display:block;font-weight:500;line-height:1.1;\">${k}</span><span style=\"display:block;margin-left:0;font-size:11px;line-height:1.1;\">${text}</span>`;
                    setTimeout(() => node.classList.remove('status-changed'), 2000);
                }
            });
        }
        lastStatus = status;
    } catch (e) {
        statusFailCount++;
        panel.innerHTML = '<span style="color:#b91c1c;font-size:12px;">状态加载失败</span>';
        panel._statusNodes = {};
        lastStatus = {};
        if (statusFailCount >= 5) {
            panel.innerHTML = '<span style="color:#b91c1c;font-size:12px;">状态加载失败（已停止自动刷新）</span>';
        }
    }
}
// tooltip 逻辑
function setupStatusTooltip(panel) {
    let tooltip = document.getElementById('status-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'status-tooltip';
        tooltip.className = 'status-tooltip';
        document.body.appendChild(tooltip);
    }
    panel.querySelectorAll('.status-card').forEach(card => {
        card.addEventListener('mouseenter', e => {
            tooltip.innerHTML = card.getAttribute('data-tooltip').replace(/\n/g, '<br>');
            tooltip.style.opacity = 1;
            const rect = card.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        });
        card.addEventListener('mouseleave', e => {
            tooltip.style.opacity = 0;
        });
    });
}
// 页面加载后自动刷新一次
document.addEventListener('DOMContentLoaded', fetchStatus);
setInterval(fetchStatus, 2000);


// 命令执行与日志弹窗
function runCommandInTerminal(cmd) {
    // 自动带上题目ID作为最后一个参数
    const problemId = window.problemName || getCurrentProblemId();
    if (!problemId) {
        alert('无法自动识别题目ID');
        return;
    }
    
    // 构建完整命令
    const fullCommand = `oimp ${cmd} ${problemId}`;
    
    // 在终端中显示命令
    if (window.term) {
        window.term.focus();
        window.term.write(`${fullCommand}\r`);
    }
    
    // 通过WebSocket发送命令到后端执行
    if (window.terminalWs && window.terminalWs.readyState === WebSocket.OPEN) {
        window.terminalWs.send(fullCommand + '\r');
    } else {
        console.error('WebSocket连接未建立，无法执行命令');
        alert('终端连接未建立，请刷新页面重试');
    }
}
// 自动获取题目ID（取文件树根节点或目录名）
function getCurrentProblemId() {
    // 尝试从文件树根节点获取
    const tree = document.querySelector('#file-tree .jstree-anchor');
    if (tree) return tree.textContent.trim();
    // 或从当前目录推断
    if (window.location.pathname && window.location.pathname.length > 1) {
        return window.location.pathname.split('/')[1];
    }
    return '';
}


// 编辑器和预览区自适应高度，终端始终显示
function resizeLayout() {
    // 使用全局的syncMainHeight函数来确保所有区域都正确同步
    if (window.syncMainHeight) {
        window.syncMainHeight();
    }
}
window.addEventListener('resize', resizeLayout);
window.addEventListener('DOMContentLoaded', resizeLayout);
// 拖动分割条实现左右分栏自定义宽度
(function () {
    const dragbar = document.getElementById('dragbar');
    const ideMain = document.getElementById('ide-main');
    const preview = document.getElementById('preview');
    const idePreviewMain = document.getElementById('ide-preview-main');
    const previewHtml = document.getElementById('preview-html');
    let dragging = false;
    let lastUserSelect = '';
    dragbar.addEventListener('mousedown', function (e) {
        dragging = true;
        document.body.style.cursor = 'col-resize';
        lastUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        if (previewHtml) previewHtml.style.pointerEvents = 'none';
        e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        const totalWidth = idePreviewMain.offsetWidth;
        let leftWidth = e.clientX - idePreviewMain.getBoundingClientRect().left;
        // 限制最小/最大宽度
        leftWidth = Math.max(200, Math.min(leftWidth, totalWidth - 200));
        ideMain.style.width = leftWidth + 'px';
        preview.style.width = (totalWidth - leftWidth - dragbar.offsetWidth) + 'px';
    });
    window.addEventListener('mouseup', function (e) {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = lastUserSelect;
            if (previewHtml) previewHtml.style.pointerEvents = '';
        }
    });
})();

//< !--终端窗口最大化 / 最小化按钮-- >

(function () {
    const terminalDiv = document.getElementById('terminal');
    const previewMain = document.getElementById('ide-preview-main');
    if (!terminalDiv || !previewMain) return;
    // 按钮容器
    const btnBar = document.createElement('div');
    btnBar.className = 'terminal-btn-bar';
    btnBar.style.position = 'absolute';
    btnBar.style.right = '12px';
    btnBar.style.top = '6px';
    btnBar.style.zIndex = '20';
    btnBar.style.display = 'flex';
    btnBar.style.gap = '6px';
    // 最小化按钮
    const minBtn = document.createElement('button');
    minBtn.textContent = '_';
    minBtn.setAttribute('data-tooltip', '最小化终端');
    minBtn.className = 'min-btn';
    minBtn.onclick = function () {
        terminalDiv.style.height = '36px';
        terminalDiv.style.minHeight = '0';
        terminalDiv.style.maxHeight = '36px';
        previewMain.style.height = `calc(100vh - 40px - 36px)`;
        if (window.syncMainHeight) window.syncMainHeight();
        if (window.fitAddon) window.fitAddon.fit();
    };
    // 最大化按钮
    const maxBtn = document.createElement('button');
    maxBtn.textContent = '^';
    maxBtn.setAttribute('data-tooltip', '最大化终端');
    maxBtn.className = 'max-btn';
    maxBtn.onclick = function () {
        terminalDiv.style.height = '90vh';
        terminalDiv.style.minHeight = '200px';
        terminalDiv.style.maxHeight = 'none';
        previewMain.style.height = 'calc(1vh - 40px)';
        if (window.syncMainHeight) window.syncMainHeight();
        if (window.fitAddon) window.fitAddon.fit();
    };
    // 还原按钮
    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = '=';
    restoreBtn.setAttribute('data-tooltip', '还原终端');
    restoreBtn.className = 'restore-btn';
    restoreBtn.onclick = function () {
        terminalDiv.style.height = '180px';
        terminalDiv.style.minHeight = '';
        terminalDiv.style.maxHeight = '';
        previewMain.style.height = `calc(100vh - 40px - 180px)`;
        if (window.syncMainHeight) window.syncMainHeight();
        if (window.fitAddon) window.fitAddon.fit();
    };
    // 字体缩小按钮
    const fontMinusBtn = document.createElement('button');
    fontMinusBtn.textContent = 'A-';
    fontMinusBtn.setAttribute('data-tooltip', '减小终端字体');
    fontMinusBtn.className = 'font-btn';
    fontMinusBtn.onclick = function () {
        if (window.term) {
            let size = getTerminalFontSize();
            size = Math.max(8, size - 1);
            setTerminalFontSize(size);
            if (window.fitAddon) window.fitAddon.fit();
        }
    };
    // 兼容 xterm.js 4.x/5.x 的字体大小读写
    function getTerminalFontSize() {
        if (window.term && window.term.getOption) {
            return window.term.getOption('fontSize');
        } else if (window.term && window.term.options && window.term.options.fontSize) {
            return window.term.options.fontSize;
        } else {
            return 14;
        }
    }
    function setTerminalFontSize(size) {
        if (window.term && window.term.setOption) {
            window.term.setOption('fontSize', size);
        } else if (window.term && window.term.options) {
            window.term.options.fontSize = size;
            if (window.term.refresh && window.term.rows) {
                window.term.refresh(0, window.term.rows - 1);
            }
        }
    }
    // 字体放大按钮
    const fontPlusBtn = document.createElement('button');
    fontPlusBtn.textContent = 'A+';
    fontPlusBtn.setAttribute('data-tooltip', '增大终端字体');
    fontPlusBtn.className = 'font-btn';
    fontPlusBtn.onclick = function () {
        if (window.term) {
            let size = getTerminalFontSize();
            size = Math.min(40, size + 1);
            setTerminalFontSize(size);
            if (window.fitAddon) window.fitAddon.fit();
        }
    };
    btnBar.appendChild(minBtn);
    btnBar.appendChild(maxBtn);
    btnBar.appendChild(restoreBtn);
    btnBar.appendChild(fontMinusBtn);
    btnBar.appendChild(fontPlusBtn);
    terminalDiv.style.position = 'relative';
    terminalDiv.appendChild(btnBar);
    // 自定义 tooltip 逻辑
    let tooltip = document.getElementById('terminal-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'terminal-tooltip';
        tooltip.className = 'terminal-tooltip';
        document.body.appendChild(tooltip);
    }
    function showTooltip(e, text) {
        tooltip.textContent = text;
        tooltip.style.opacity = 1;
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.bottom + 6) + 'px';
    }
    function hideTooltip() {
        tooltip.style.opacity = 0;
    }
    [minBtn, maxBtn, restoreBtn, fontMinusBtn, fontPlusBtn].forEach(btn => {
        btn.addEventListener('mouseenter', e => showTooltip(e, btn.getAttribute('data-tooltip')));
        btn.addEventListener('mouseleave', hideTooltip);
    });
    if (terminalDiv) {
        terminalDiv.addEventListener('transitionend', function(e) {
            if (window.fitAddon) window.fitAddon.fit();
        });
    }
})();

// 文件树显示/隐藏按钮逻辑
(function () {
    const btn = document.getElementById('toggle-tree-btn');
    const fileTreeWrap = document.getElementById('file-tree-wrap');
    const ideMain = document.getElementById('ide-main');
    let treeVisible = true;
    function updateBtn() {
        btn.title = treeVisible ? '隐藏文件树' : '显示文件树';
        btn.innerHTML = treeVisible
            ? '<svg class="tree-arrow-svg" width="12" height="12" viewBox="0 0 18 18" style="display:block;transition:transform 0.08s;"><polyline points="12,4 6,9 12,14" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg class="tree-arrow-svg" width="12" height="12" viewBox="0 0 18 18" style="display:block;transition:transform 0.08s;"><polyline points="6,4 12,9 6,14" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        btn.style.background = treeVisible ? 'transparent' : '#e0e7ef';
    }
    btn.onclick = function (e) {
        e.stopPropagation();
        treeVisible = !treeVisible;
        if (treeVisible) {
            fileTreeWrap.classList.remove('hide-anim');
            fileTreeWrap.classList.add('show-anim');
            fileTreeWrap.style.display = '';
            setTimeout(() => {
                fileTreeWrap.style.width = '';
                ideMain.style.width = '';
            }, 220);
        } else {
            fileTreeWrap.classList.remove('show-anim');
            fileTreeWrap.classList.add('hide-anim');
            setTimeout(() => {
                fileTreeWrap.style.display = 'none';
                ideMain.style.width = '100%';
            }, 220);
        }
        updateBtn();
        if (window.editor && window.editor.layout) window.editor.layout();
    };
    updateBtn();
})();
// 文件树出现/隐藏动画
const treeAnimStyle = document.createElement('style');
treeAnimStyle.innerHTML = `
      #file-tree-wrap {
        transition: width 0.22s cubic-bezier(.4,1.6,.4,1), opacity 0.18s;
        will-change: width, opacity;
        overflow: hidden;
      }
      #file-tree-wrap.hide-anim {
        width: 0 !important;
        min-width: 0 !important;
        opacity: 0;
        pointer-events: none;
      }
      #file-tree-wrap.show-anim {
        opacity: 1;
      }
    `;
document.head.appendChild(treeAnimStyle);
// 按钮动画和 hover 效果
const style = document.createElement('style');
style.innerHTML = `
      #toggle-tree-btn { transition: background 0.08s, box-shadow 0.08s, border-radius 0.08s, border-color 0.08s; border-radius: 7px; border: 1.5px solid transparent; }
      #toggle-tree-btn:hover { background: #e0e7ef !important; box-shadow: 0 2px 8px #bae6fd; border-color: #60a5fa; }
      #toggle-tree-btn:hover .tree-arrow-svg { transition: transform 0.08s; transform: scale(1.25); filter: drop-shadow(0 0 2px #60a5fa); }
      #toggle-tree-btn:active .tree-arrow-svg { transition: transform 0.08s; transform: scale(0.95); }
    `;
document.head.appendChild(style);
// 新建文件/文件夹按钮 hover 效果和 tooltip
style.innerHTML += `
      #btn-new-file:hover, #btn-new-folder:hover {
        background: #e0e7ef !important;
        box-shadow: 0 2px 8px #bae6fd;
        border-color: #60a5fa;
      }
      #btn-new-file:active svg, #btn-new-folder:active svg {
        transform: scale(0.95);
      }
    `;
// 新建按钮自定义 tooltip
function addBtnTooltip(btn, text) {
    let tooltip = null;
    btn.removeAttribute('title');
    btn.addEventListener('mouseenter', function (e) {
        if (tooltip) return;
        tooltip = document.createElement('div');
        tooltip.textContent = text;
        tooltip.style.position = 'fixed';
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 8) + 'px';
        tooltip.style.background = '#222';
        tooltip.style.color = '#fff';
        tooltip.style.fontSize = '13px';
        tooltip.style.padding = '3px 10px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        tooltip.style.zIndex = 9999;
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    });
    btn.addEventListener('mousemove', function (e) {
        if (tooltip) {
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY - 8) + 'px';
        }
    });
    btn.addEventListener('mouseleave', function () {
        if (tooltip) { document.body.removeChild(tooltip); tooltip = null; }
    });
}
addBtnTooltip(document.getElementById('btn-new-file'), '新建文件');
addBtnTooltip(document.getElementById('btn-new-folder'), '新建文件夹');
// 顶部保存/重载按钮 hover 效果和 tooltip
style.innerHTML += `
      #btn-save:hover, #btn-reload:hover {
        background: #e0e7ef !important;
        box-shadow: 0 2px 8px #bae6fd;
        border-color: #60a5fa;
      }
      #btn-save:active svg, #btn-reload:active svg {
        transform: scale(0.95);
      }
        pre code.language-text,
pre code.language-plaintext,
pre code.language-txt {
  background: #f8fafc !important;   /* 你喜欢的背景色 */
  color: #334155 !important;        /* 你喜欢的字体颜色 */
  border-radius: 8px;               /* 圆角大小 */
  font-size: 15px;                  /* 字号 */
  padding: 0.7em 1em;               /* 内边距 */
  font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
  border: none;                     /* 去掉边框 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); /* 可选：阴影 */
  line-height: 1.7;
  /* 你可以继续加其它自定义属性 */
}
    `;
addBtnTooltip(document.getElementById('btn-save'), '保存 (Ctrl+S)');
addBtnTooltip(document.getElementById('btn-reload'), '重载');
document.addEventListener('DOMContentLoaded', function () {
    if (window.saveFile && window.reloadFile) {
        document.getElementById('btn-save').onclick = saveFile;
        document.getElementById('btn-reload').onclick = reloadFile;
    }
});

// 文件树和editor之间的拖动条
(function () {
    const dragbar = document.getElementById('tree-dragbar');
    const fileTree = document.getElementById('file-tree');
    const editorDiv = document.getElementById('editor');
    const ideMain = document.getElementById('ide-main');
    let dragging = false;
    let lastUserSelect = '';
    dragbar.addEventListener('mousedown', function (e) {
        dragging = true;
        document.body.style.cursor = 'col-resize';
        lastUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        const mainRect = ideMain.getBoundingClientRect();
        let leftWidth = e.clientX - mainRect.left;
        // 限制最小/最大宽度
        leftWidth = Math.max(120, Math.min(leftWidth, mainRect.width - 120));
        fileTree.style.width = leftWidth + 'px';
        editorDiv.style.width = (mainRect.width - leftWidth - dragbar.offsetWidth) + 'px';
        if (window.editor && window.editor.layout) window.editor.layout();
    });
    window.addEventListener('mouseup', function (e) {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = lastUserSelect;
        }
    });
})();

// 终端窗口上方拖动条，调整主内容区和终端高度
(function () {
    const dragbar = document.getElementById('terminal-dragbar');
    const terminal = document.getElementById('terminal');
    let dragging = false;
    let lastUserSelect = '';
    
    dragbar.addEventListener('mousedown', function (e) {
        dragging = true;
        document.body.style.cursor = 'row-resize';
        lastUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    window.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        const topbar = document.getElementById('topbar');
        const workflowBar = document.getElementById('workflow-bar');
        const previewMain = document.getElementById('ide-preview-main');
        const ideMain = document.getElementById('ide-main');
        const fileTree = document.getElementById('file-tree');
        const editorDiv = document.getElementById('editor');
        const previewDiv = document.getElementById('preview');
        
        const totalHeight = window.innerHeight - topbar.offsetHeight - (workflowBar ? workflowBar.offsetHeight : 0);
        const minTerm = 200, minMain = 80;
        let newTermHeight = totalHeight - (e.clientY - topbar.getBoundingClientRect().bottom);
        newTermHeight = Math.max(minTerm, Math.min(newTermHeight, totalHeight - minMain));
        
        // 设置终端高度
        terminal.style.height = newTermHeight + 'px';
        
        // 计算主区域高度
        const mainHeight = totalHeight - newTermHeight;
        
        // 直接设置所有主区域的高度，确保实时同步
        if (previewMain) previewMain.style.height = mainHeight + 'px';
        if (ideMain) ideMain.style.height = mainHeight + 'px';
        if (fileTree) fileTree.style.height = mainHeight + 'px';
        if (editorDiv) editorDiv.style.height = mainHeight + 'px';
        if (previewDiv) previewDiv.style.height = mainHeight + 'px';
        
        // 同步编辑器布局
        if (window.editor && window.editor.layout) {
            window.editor.layout();
        }
        
        if (window.fitAddon) window.fitAddon.fit();
    });
    
    window.addEventListener('mouseup', function (e) {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = lastUserSelect;
            
            // 最终同步一次，确保所有区域都正确
            if (window.syncMainHeight) {
                window.syncMainHeight();
            }
            
            if (window.fitAddon) window.fitAddon.fit();
        }
    });
})();

// 让文件树和editor随窗口大小自适应
function syncTreeEditorHeight() {
    // 使用全局的syncMainHeight函数来确保所有区域都正确同步
    if (window.syncMainHeight) {
        window.syncMainHeight();
    }
}
window.addEventListener('resize', syncTreeEditorHeight);
document.addEventListener('DOMContentLoaded', syncTreeEditorHeight);
// 其它地方如终端拖动、最大化/还原等也应调用 syncTreeEditorHeight
// 在相关函数中已调用 syncMainHeight()，可在其中加 syncTreeEditorHeight();
// 这里补一份定时器兜底
setInterval(syncTreeEditorHeight, 1000);

// 新建文件/文件夹按钮逻辑
document.getElementById('btn-new-file').onclick = async function () {
    const tree = $('#file-tree').jstree(true);
    const sel = tree.get_selected()[0];
    let parentPath = '';
    if (sel) {
        const node = tree.get_node(sel);
        parentPath = node.data && node.data.type === 'dir' ? node.data.path : (node.parent === '#' ? '' : tree.get_node(node.parent).data.path);
    }
    const filename = prompt('请输入新文件名（如 newfile.md）：');
    if (!filename) return;
    const relPath = parentPath ? parentPath + '/' + filename : filename;
    // 创建空文件
    const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relPath, content: '' })
    });
    if (res.ok) {
        showSaveMsg('新建文件成功');
    } else {
        showSaveMsg('新建文件失败', true);
    }
};
document.getElementById('btn-new-folder').onclick = async function () {
    const tree = $('#file-tree').jstree(true);
    const sel = tree.get_selected()[0];
    let parentPath = '';
    if (sel) {
        const node = tree.get_node(sel);
        parentPath = node.data && node.data.type === 'dir' ? node.data.path : (node.parent === '#' ? '' : tree.get_node(node.parent).data.path);
    }
    const foldername = prompt('请输入新文件夹名（如 newfolder）：');
    if (!foldername) return;
    const relPath = parentPath ? parentPath + '/' + foldername : foldername;
    // 创建空文件夹（通过新建一个 .keep 文件实现）
    const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relPath + '/.keep', content: '' })
    });
    if (res.ok) {
        showSaveMsg('新建文件夹成功');
    } else {
        showSaveMsg('新建文件夹失败', true);
    }
};


// 终端初始化
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        if (window.Terminal && window.FitAddon) {
            let term = new Terminal({ fontSize: 14 });
            let fitAddon = new window.FitAddon.FitAddon();
            term.loadAddon(fitAddon);
            term.open(document.getElementById('terminal'));
            fitAddon.fit();
            const ws = new WebSocket(`ws://${location.host}/api/terminal`);
            ws.onmessage = e => {
                term.write(e.data);
                // 移除自动滚动留两行逻辑
            };
            term.onData(data => ws.send(data));
            window.term = term;
            window.fitAddon = fitAddon;
            window.terminalWs = ws;
            window.addEventListener('resize', function () {
                if (fitAddon) fitAddon.fit();
            });
            // 给终端容器加底部 padding
            document.getElementById('terminal').style.paddingBottom = '32px';
        } else {
            console.error('xterm.js or FitAddon not loaded');
        }
    }, 0);
});

// ===== WebSocket 自动刷新文件树和状态面板 =====
(function () {
    let ws = null;
    let reconnectTimer = null;
    let reconnectCount = 0;
    function connectWS() {
        ws = new window.WebSocket('ws://' + window.location.host);
        ws.onopen = function () {
            reconnectCount = 0;
        };
        ws.onmessage = async function (event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'tree_changed') {
                    // console.log('WS tree_changed arrived', data);
                    // 拉取最新树数据
                    const doRefreshTree = async (treeData) => {
                        const $tree = $('#file-tree');
                        const tree = $tree.jstree(true);
                        // 记录当前展开和选中节点 path
                        function getOpenedNodePaths(tree) {
                            const all = tree.get_json('#', { flat: true });
                            return all.filter(n => n.state && n.state.opened).map(n => n.data && n.data.path).filter(Boolean);
                        }
                        function getSelectedNodePaths(tree) {
                            if (typeof tree.get_selected === 'function') {
                                return getNodePaths(tree, tree.get_selected());
                            }
                            const all = tree.get_json('#', { flat: true });
                            return all.filter(n => n.state && n.state.selected).map(n => n.data && n.data.path).filter(Boolean);
                        }
                        const openedPaths = getOpenedNodePaths(tree);
                        const selectedPaths = getSelectedNodePaths(tree);
                        tree.settings.core.data = treeData;
                        isRefreshingTree = true;
                        $tree.one('refresh.jstree', function () {
                            const tree2 = $tree.jstree(true);
                            isRestoringTreeSelection = true;
                            // 恢复展开
                            openedPaths.forEach(path => {
                                const id = findNodeIdByPath(tree2, path);
                                // console.log('恢复展开', path, '->', id);
                                if (id) tree2.open_node(id, null, false);
                            });
                            // 恢复选中
                            let found = false;
                            for (const path of selectedPaths) {
                                const id = findNodeIdByPath(tree2, path);
                                // console.log('恢复选中', path, '->', id);
                                if (id) {
                                    tree2.deselect_all();
                                    tree2.select_node(id, false, false);
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                const all = tree2.get_json('#', { flat: true });
                                const firstMd = all.find(n => n.data && n.data.type === 'file' && n.text.toLowerCase().endsWith('.md'));
                                if (firstMd) {
                                    tree2.deselect_all();
                                    tree2.select_node(firstMd.id, false, false);
                                    loadFile(firstMd.data.path);
                                    // console.log('未能恢复选中，自动选中第一个md文件', firstMd.data.path);
                                } else {
                                    // console.log('未能恢复选中，也未找到md文件');
                                }
                            }
                            isRestoringTreeSelection = false;
                            isRefreshingTree = false;
                            // 如果有新的 pendingTreeData，立即再次刷新
                            if (pendingTreeData) {
                                const nextData = pendingTreeData;
                                pendingTreeData = null;
                                setTimeout(() => doRefreshTree(nextData), 0);
                            }
                        });
                        tree.refresh(true, true);
                    };
                    // 防抖处理
                    if (isRefreshingTree) {
                        // 正在刷新，存下最新数据
                        clearTimeout(debounceTreeChangedTimer);
                        debounceTreeChangedTimer = setTimeout(async () => {
                            const res = await fetch('/api/tree');
                            const treeData = await res.json();
                            pendingTreeData = treeData;
                        }, 1000);
                    } else {
                        clearTimeout(debounceTreeChangedTimer);
                        debounceTreeChangedTimer = setTimeout(async () => {
                            const res = await fetch('/api/tree');
                            const treeData = await res.json();
                            pendingTreeData = null;
                            doRefreshTree(treeData);
                        }, 1000);
                    }
                    return;
                } else if (data.type === 'status_changed') {
                    fetchStatus && fetchStatus();
                }
            } catch (e) {
                console.error("error:",e.message,e);
             }
        };
        ws.onclose = function () {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectWS, Math.min(5000, 1000 + 1000 * reconnectCount++));
        };
        ws.onerror = function () {
            ws.close();
        };
    }
    connectWS();
})();

// 辅助函数：根据 path 查找节点 id
function findNodeIdByPath(tree, path) {
    const all = tree.get_json('#', { flat: true });
    const found = all.find(n => n.data && n.data.path === path);
    return found && found.id;
}

// 辅助函数：获取节点 path 列表
function getNodePaths(tree, ids) {
    return ids.map(id => {
        const node = tree.get_node(id, false);
        return node && node.data && node.data.path;
    }).filter(Boolean);
}

// 工作流按钮事件处理函数
function setupWorkflowButtons() {

    // 题目状态按钮
    const statusBtn = document.getElementById('workflow-status');
    if (statusBtn) {
        statusBtn.addEventListener('click', function() {
            runCommandInTerminal('status');
        });
    }

    // 编辑题目元数据按钮
    const editBtn = document.getElementById('workflow-edit');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            runCommandInTerminal('edit');
        });
    }

    // 修复按钮
    const fixBtn = document.getElementById('workflow-fix');
    if (fixBtn) {
        fixBtn.addEventListener('click', function() {
            runCommandInTerminal('fix');
        });
    }

    // 快照按钮
    const snapshotBtn = document.getElementById('workflow-snapshot');
    if (snapshotBtn) {
        snapshotBtn.addEventListener('click', function() {
            runCommandInTerminal('snapshot list');
        });
    }

    // 编辑题面按钮
    const editProblemBtn = document.getElementById('workflow-edit-problem');
    if (editProblemBtn) {
        editProblemBtn.addEventListener('click', function() {
            const problemId = getCurrentProblemId();
            const filePath = `${problemId}/problem_zh.md`;
            // 只在文件树中选中该文件
            selectFileInTree(filePath);
        });
    }

    // 生成样例按钮
    const genSampleBtn = document.getElementById('workflow-gen-sample');
    if (genSampleBtn) {
        genSampleBtn.addEventListener('click', function() {
            const problemId = getCurrentProblemId();
            const filePath = `${problemId}/problem_zh.md`;
            // 只在文件树中选中该文件
            selectFileInTree(filePath);
        });
    }

    // 编辑标程按钮
    const editStdBtn = document.getElementById('workflow-edit-std');
    if (editStdBtn) {
        editStdBtn.addEventListener('click', function() {
            const problemId = getCurrentProblemId();
            const filePath = `${problemId}/src/std.cpp`;
            // 只在文件树中选中该文件
            selectFileInTree(filePath);
        });
    }

    // 编辑数据生成器按钮
    const editGeneratorBtn = document.getElementById('workflow-edit-generator');
    if (editGeneratorBtn) {
        editGeneratorBtn.addEventListener('click', function() {
            const problemId = getCurrentProblemId();
            const filePath = `${problemId}/src/generator.cpp`;
            // 只在文件树中选中该文件
            selectFileInTree(filePath);
        });
    }

    // 编辑输入验证器按钮
    const editValidatorBtn = document.getElementById('workflow-edit-validator');
    if (editValidatorBtn) {
        editValidatorBtn.addEventListener('click', function() {
            const problemId = getCurrentProblemId();
            const filePath = `${problemId}/src/validator.cpp`;
            // 只在文件树中选中该文件
            selectFileInTree(filePath);
        });
    }

    // 编辑评测器按钮
    const editCheckerBtn = document.getElementById('workflow-edit-checker');
    if (editCheckerBtn) {
        editCheckerBtn.addEventListener('click', function() {
            const problemId = getCurrentProblemId();
            const filePath = `${problemId}/src/checker.cpp`;
            // 只在文件树中选中该文件
            selectFileInTree(filePath);
        });
    }

    // 测试样例按钮
    const testsampleBtn = document.getElementById('workflow-testsample');
    if (testsampleBtn) {
        testsampleBtn.addEventListener('click', function() {
            runCommandInTerminal('testsample');
        });
    }

    // 检查按钮
    const checkBtn = document.getElementById('workflow-check');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            runCommandInTerminal('check');
        });
    }

    // 生成数据按钮
    const gendataBtn = document.getElementById('workflow-gendata');
    if (gendataBtn) {
        gendataBtn.addEventListener('click', function() {
            runCommandInTerminal('gendata');
        });
    }

    // 打包按钮
    const packageBtn = document.getElementById('workflow-package');
    if (packageBtn) {
        packageBtn.addEventListener('click', function() {
            runCommandInTerminal('package');
        });
    }

    // 工作流区域hover事件处理
    const workflowBar = document.getElementById('workflow-bar');
    const terminal = document.getElementById('terminal');
    const previewMain = document.getElementById('ide-preview-main');
    let lastTermHeight = null; // 记录展开前的终端高度
    if (workflowBar && terminal && previewMain) {
        workflowBar.addEventListener('mouseenter', function() {
            const topbar = document.getElementById('topbar');
            const workflowExpandedHeight = 250; // 工作流展开后的高度
            const totalHeight = window.innerHeight - topbar.offsetHeight;
            const availableHeight = totalHeight - workflowExpandedHeight; // 减去工作流展开高度后的可用高度
            const currentTermHeight = terminal.offsetHeight;
            lastTermHeight = currentTermHeight; // 记录展开前高度
            let newTermHeight;
            if (currentTermHeight > 300 && currentTermHeight < availableHeight) {
                newTermHeight = currentTermHeight;
            } else if (currentTermHeight <= 300) {
                newTermHeight = 300;
            } else {
                newTermHeight = Math.floor(availableHeight * 0.7);
            }
            newTermHeight = Math.max(300, newTermHeight);
            
            // 设置终端和主区高度
            terminal.style.height = newTermHeight + 'px';
            previewMain.style.height = (totalHeight - newTermHeight) + 'px';
            
            // 直接同步所有区域高度，确保实时响应
            const ideMain = document.getElementById('ide-main');
            const fileTree = document.getElementById('file-tree');
            const editorDiv = document.getElementById('editor');
            const previewDiv = document.getElementById('preview');
            const mainHeight = totalHeight - newTermHeight;
            
            if (ideMain) ideMain.style.height = mainHeight + 'px';
            if (fileTree) fileTree.style.height = mainHeight + 'px';
            if (editorDiv) editorDiv.style.height = mainHeight + 'px';
            if (previewDiv) previewDiv.style.height = mainHeight + 'px';
            
            // 同步编辑器布局
            if (window.editor && window.editor.layout) {
                window.editor.layout();
            }
            
            // 适配终端
            if (window.fitAddon) window.fitAddon.fit();
        });
        workflowBar.addEventListener('mouseleave', function() {
            const topbar = document.getElementById('topbar');
            const totalHeight = window.innerHeight - topbar.offsetHeight;
            let restoreHeight = lastTermHeight || 200;
            
            // 设置终端和主区高度
            terminal.style.height = restoreHeight + 'px';
            previewMain.style.height = (totalHeight - restoreHeight) + 'px';
            
            // 直接同步所有区域高度，确保实时响应
            const ideMain = document.getElementById('ide-main');
            const fileTree = document.getElementById('file-tree');
            const editorDiv = document.getElementById('editor');
            const previewDiv = document.getElementById('preview');
            const mainHeight = totalHeight - restoreHeight;
            
            if (ideMain) ideMain.style.height = mainHeight + 'px';
            if (fileTree) fileTree.style.height = mainHeight + 'px';
            if (editorDiv) editorDiv.style.height = mainHeight + 'px';
            if (previewDiv) previewDiv.style.height = mainHeight + 'px';
            
            // 同步编辑器布局
            if (window.editor && window.editor.layout) {
                window.editor.layout();
            }
            
            // 适配终端
            if (window.fitAddon) window.fitAddon.fit();
        });
    }
}

// 在文件树中选中指定文件并模拟点击
function selectFileInTree(filePath) {
    // 获取jsTree实例
    const $tree = $('#file-tree');
    if (!$tree.length) {
        console.warn('文件树未找到');
        return;
    }
    
    const tree = $tree.jstree(true);
    if (!tree) {
        console.warn('jsTree实例未找到');
        return;
    }
    
    // 去掉路径中的题目ID部分，只保留相对路径
    // 例如：mahadon/problem_zh.md -> problem_zh.md
    // 例如：mahadon/src/std.cpp -> src/std.cpp
    const relativePath = filePath.replace(/^[^\/]+\//, '');
    
    // 查找文件节点
    const allNodes = tree.get_json('#', { flat: true });
    const targetNode = allNodes.find(node => {
        return node.data && node.data.path === relativePath;
    });
    
    if (targetNode) {
        // 确保节点可见（展开父节点）
        console.log('找到目标节点:', targetNode);
        
        // 递归展开所有父节点
        function expandParents(nodeId) {
            const node = tree.get_node(nodeId);
            if (node && node.parent && node.parent !== '#') {
                // 先展开父节点
                expandParents(node.parent);
                // 然后展开当前父节点
                if (tree.is_closed(node.parent)) {
                    tree.open_node(node.parent, null, false);
                }
            }
        }
        
        // 展开目标节点的所有父节点
        expandParents(targetNode.id);
        
        // 选中目标节点
        tree.deselect_all();
        tree.select_node(targetNode.id, false, false);
        
        // 模拟点击节点，触发相应的逻辑（如打开文件）
        tree.trigger('select_node.jstree', [targetNode.id, { originalEvent: { type: 'click' } }]);
        
        console.log(`已选中并模拟点击文件: ${relativePath}`);
    } else {
        console.warn(`未找到文件: ${relativePath} (原始路径: ${filePath})`);
    }
}

// 在DOM加载完成后设置工作流按钮事件
document.addEventListener('DOMContentLoaded', function() {
    // 延迟执行，确保所有元素都已加载
    setTimeout(setupWorkflowButtons, 100);
});

// 全局同步主区高度函数，考虑workflow-bar实际高度
function syncMainHeight() {
    const previewMain = document.getElementById('ide-preview-main');
    const ideMain = document.getElementById('ide-main');
    const fileTree = document.getElementById('file-tree');
    const editorDiv = document.getElementById('editor');
    const previewDiv = document.getElementById('preview');
    const topbar = document.getElementById('topbar');
    const workflowBar = document.getElementById('workflow-bar');
    const terminal = document.getElementById('terminal');
    
    // 计算总高度，减去topbar和workflow-bar的实际高度
    const totalHeight = window.innerHeight - (topbar ? topbar.offsetHeight : 0) - (workflowBar ? workflowBar.offsetHeight : 0);
    
    // 终端高度
    const termH = terminal ? terminal.offsetHeight : 200;
    
    // 主区高度
    const mainH = Math.max(0, totalHeight - termH);
    
    // 同步所有主区域的高度
    if (previewMain) previewMain.style.height = mainH + 'px';
    if (ideMain) ideMain.style.height = mainH + 'px';
    if (fileTree) fileTree.style.height = mainH + 'px';
    if (editorDiv) editorDiv.style.height = mainH + 'px';
    if (previewDiv) previewDiv.style.height = mainH + 'px';
    
    // 同步编辑器布局（如果有Monaco编辑器）
    if (window.editor && window.editor.layout) {
        window.editor.layout();
    }
}
window.syncMainHeight = syncMainHeight;
