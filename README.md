# OI Tools (oimp)

一个强大的OI（信息学奥林匹克）题目生成和管理工具，支持题目创建、测试数据生成、打包导出以及实时预览功能。

## 📋 版本更新

### v1.3.8 (2025-07-27)
- 🎯 **新增运行功能**：
  - **一键运行**：C++文件编辑器新增运行按钮，支持一键编译并运行当前程序
  - **参数传递**：运行时默认传递参数"1"，适用于generator.cpp等特殊文件
  - **跨平台支持**：自动适配Windows和Unix/Linux/macOS的运行命令差异
  - **终端集成**：运行命令在终端中执行，提供一致的用户体验
- 🛠️ **终端输出优化**：
  - **纯净输出**：运行、diff测试和验证器功能不再在终端中显示多余的echo语句
  - **编译检查**：编译检查过程无输出，仅在文件存在时运行程序
  - **一致行为**：所有功能保持统一的终端输出规范
- 🎨 **界面体验提升**：
  - **消息显示**：顶部消息条显示时间延长至2秒，支持多个消息依次排列显示
  - **动画效果**：消息显示和消失时具有淡入淡出和平滑滑动动画效果
  - **自动清理**：消息动画结束后自动清理DOM元素，避免内存泄漏
- 🧪 **功能完善**：
  - **验证器测试**：完善validator.cpp文件的测试功能，移除多余输出
  - **diff测试**：优化diff测试功能，保持终端输出简洁
  - **跨平台兼容**：所有功能均完善支持Windows、Linux和macOS系统

### v1.3.7 (2025-07-26)
- 🎯 **工作流按钮功能全面实现**：
  - **底部工作流栏**：新增可展开的工作流按钮栏，支持悬停展开和紧凑模式
  - **独立操作区域**：左侧独立按钮组，包含题目状态、编辑题目元数据、修复、快照功能
  - **主工作流区域**：右侧主流程按钮组，包含编辑题面、四个并列编辑按钮、测试样例、检查+生成数据容器、打包
  - **智能按钮显示**：根据当前编辑的文件类型动态显示C++工具栏按钮
  - **一键命令执行**：所有工作流按钮点击即可在终端执行对应命令
  - **文件快速编辑**：编辑类按钮直接打开对应文件进行编辑
  - **深色主题设计**：工作流区域采用深色配色方案，视觉效果更佳
- 🎨 **工作流界面设计**：
  - **悬停展开**：工作流栏初始高度50px，悬停时展开到400px，平滑过渡动画
  - **按钮分组**：独立操作区域垂直排列，主工作流区域水平排列
  - **并列按钮容器**：四个编辑按钮（生成样例、编辑标程、编辑数据生成器、编辑输入验证器）垂直排列
  - **检查和数据生成容器**：检查和生成数据按钮垂直排列，作为一个整体步骤
  - **箭头连接线**：按钮间使用SVG箭头连接，清晰显示工作流程
  - **Tooltip提示**：所有按钮都有详细的tooltip说明，便于理解功能
- 🔧 **命令执行优化**：
  - **统一命令格式**：所有命令通过`runCommandInTerminal()`函数执行，自动添加`oimp`前缀和题目ID
  - **智能题目ID获取**：自动从URL路径或文件树根节点获取当前题目ID
  - **错误处理**：每个按钮都有存在性检查，避免JavaScript错误
  - **延迟绑定**：在DOM加载完成后延迟100ms绑定事件，确保所有元素都已加载
- 📝 **按钮功能映射**：
  - **题目状态**：执行`oimp status <题目ID>`，查看题目完成状态和进度
  - **编辑题目元数据**：执行`oimp edit <题目ID>`，编辑题目基本信息、标签、限制等
  - **修复**：执行`oimp fix <题目ID>`，自动修复题目中的常见问题和错误
  - **快照**：执行`oimp snapshot list <题目ID>`，查看版本快照列表
  - **编辑题面**：直接打开`problem_zh.md`文件进行编辑
  - **生成样例**：直接打开`problem_zh.md`文件进行编辑，在题面中定义样例输入输出
  - **编辑标程**：直接打开`src/std.cpp`文件进行编辑
  - **编辑数据生成器**：直接打开`src/generator.cpp`文件进行编辑
  - **编辑输入验证器**：直接打开`src/validator.cpp`文件进行编辑
  - **测试样例**：执行`oimp testsample <题目ID>`，使用样例数据测试标程和验证器
  - **检查**：执行`oimp check <题目ID>`，检查题目的完整性和正确性
  - **生成数据**：执行`oimp gendata <题目ID>`，使用数据生成器创建测试数据
  - **打包**：执行`oimp package <题目ID>`，将题目打包为可发布的格式
- 🎯 **C++文件编辑器功能大幅增强**：
  - 新增右侧功能按钮栏，包含保存、编译、运行、diff、测试验证器五个核心功能
  - **保存功能**：保存当前编辑的文件（Ctrl+S快捷键支持）
  - **编译功能**：跨平台清理旧文件并编译，实时显示编译过程和结果，自动滚动终端
  - **运行功能**：一键编译并运行当前程序，默认传递参数"1"，支持generator.cpp等特殊文件
  - **diff功能**：自动编译并测试样例，与标准答案进行差异比较
  - **测试验证器功能**：专门针对validator.cpp，编译后使用sample文件测试验证器功能
  - 支持 `.cpp`、`.cc`、`.cxx` 文件类型，自动检测语言并启用C++工具栏
  - 编译和diff结果直接在终端中显示，提供详细的错误信息和差异对比
  - **跨平台全面支持**：自动适配Windows和Unix/Linux/macOS的命令差异
- 🔧 **跨平台命令适配**：
  - **清理命令**：Windows使用`del /f /q`，Unix使用`rm -f`
  - **文件检查**：Windows使用`if exist`，Unix使用`if [ -f ]`
  - **文件比较**：Windows使用`fc`，Unix使用`diff`
  - 后端API自动检测平台并提供对应的命令语法
  - 前端自动获取平台信息并使用正确的命令
- 🛠️ **编译流程优化**：
  - 编译前自动清理旧的可执行文件，确保编译最新代码
  - 编译后自动检查可执行文件是否生成，失败时停止后续操作
  - 编译命令拆分执行，便于定位编译错误
  - 终端自动滚动功能抽象化，统一管理滚动逻辑
  - 编译状态实时提示：清理→编译→检查→测试
- 📝 **Markdown预览样例导入/导出功能**：
  - 在预览区自动检测"样例"或"示例"标题后的代码块
  - **读入按钮**：从 `sample/sampleXX.in/ans` 文件导入内容到代码块，并同步到Markdown源码
  - **写入按钮**：将代码块内容写入到 `sample/sampleXX.in/ans` 文件
  - **取消按钮**：跳过当前代码块，后续编号自动顺延
  - 智能编号：奇数代码块为输入(.in)，偶数代码块为输出(.ans)，编号按 `Math.floor((index)/2)+1` 计算
  - 支持多个样例，自动处理编号和文件类型
  - 所有按钮具有hover效果，操作有动画提示
- 🔧 **diff测试功能**：
  - 自动扫描 `sample` 目录中的所有 `.in` 文件进行测试
  - 输出文件按程序名分类保存到 `outputs/文件主名/` 目录，避免文件冲突
  - 自动创建输出目录，支持多个程序同时测试
  - 与 `sample` 目录中的 `.ans` 文件进行 `diff` 比较，显示详细差异
  - 排除 `validator.cpp`、`check.cpp`、`generator.cpp` 等特殊文件
- 🖥️ **终端集成优化**：
  - 编译和diff命令统一在终端中执行，提供一致的用户体验
  - 编译前自动保存文件，确保测试的是最新代码
  - 终端WebSocket连接状态检查，连接断开时显示友好提示
  - 命令执行前自动清空终端，便于查看最新结果
- 🎨 **界面体验提升**：
  - 右侧按钮栏采用垂直布局，统一的灰色主题和hover效果
  - 按钮提示信息详细，便于理解功能用途
  - 移除复杂的模态框，简化用户交互流程
  - 使用顶部消息条显示操作状态，反馈及时准确

### v1.3.3 (2025-07-xx)
- 🛠️ **判题/样例检测体验大幅提升**：
  - testsample/check/完整性检查等命令自动检测 checker.cpp 是否需要重新编译，变更后自动编译，保证判题准确。
  - testsample 命令每次执行前强制编译 checker.cpp，彻底避免“checker 未编译导致全 WA”问题。
  - checker.cpp 支持直接使用模板，无需手动修改也能自动编译。
  - 判题时 WA 会输出 checker 的详细错误信息，便于定位格式/编码/空格等细节问题。
  - 判题/样例检测所有输入输出文件默认强制使用 UTF-8 编码，避免乱码和 BOM 问题。
- 🖼️ **Web IDE/终端体验优化**：
  - 终端底部留白逻辑优化，改为直接加 padding，避免内容被遮挡且不会强制滚动。
  - 终端自动滚动仅在用户本来就在底部时触发，历史内容浏览体验更好。
  - 终端支持粘贴图片、图片上传、file:// 路径自动转换，图片可直接在 markdown 预览区显示。
- 📝 **图片/文件引用体验提升**：
  - markdown 渲染时自动将 file://additional_file/xxx 路径转换为 /files/additional_file/xxx，图片/文件可直接访问。
  - 题解、题面、预览区等所有 file:// 协议引用均自动适配。
- 🧩 **依赖与兼容性增强**：
  - checker、std、generator、validator 的自动编译逻辑更健壮，支持 mtime 检测、模板复用、变更自动触发。
  - 兼容 macOS/Linux/Windows 下的换行符、编码、BOM 差异。
  - Web IDE 所有依赖均本地化，离线可用。
- 🛡️ **bug 修复与细节优化**：
  - 修复 testsample/check 时 checker 未编译导致全 WA 的问题。
  - 修复终端内容过多时底部内容被遮挡或无法滚动的问题。
  - 修复图片粘贴/上传后 file:// 路径无法预览的问题。
  - 其它大量细节体验优化。

### v1.3.1 (2025-07-xx)
- ✨ **Web IDE/watch 功能大幅升级**：
  - 全新本地 Web IDE，基于 Monaco Editor、jsTree、xterm.js、KaTeX/marked.js，支持文件树、代码编辑、终端、实时预览、题目状态面板等。
  - 预览区支持 GitHub 风格 markdown、代码高亮、图片、数学公式（KaTeX，支持多行/复杂公式），所有依赖本地化，离线可用。
  - 预览区渲染逻辑优化，修复多行公式无法渲染问题。
  - 文件树、编辑器、预览区、终端均支持自适应拖动分栏，布局灵活。
  - 终端支持最大化/最小化/还原/字体调节，按钮样式优化，支持自定义 hover 提示。
  - 顶部状态面板支持增量刷新、失败高亮、顺序自定义、两行显示、未知状态“需重做”。
  - 编辑器内容变动时顶部文件名显示“*”号，保存/加载成功/失败有顶部消息条提示。
  - 预览区由 iframe 改为 div，前端实时渲染 markdown+公式，支持光标同步滚动。
  - 预览区底部 padding 增大，避免最后一行被遮挡。
  - 其它 UI/UX 细节大量优化：按钮、字体、分栏、消息提示、未保存提示、动画等。
- 🛠️ **watch 命令后端重构**：
  - 支持多 markdown 文件、solution 题解文件自动发现与预览。
  - WebSocket 热重载更稳定，支持多客户端、断线重连、状态指示、友好通知。
  - 文件读写、状态 API、终端 API、命令执行 API 全面完善。
  - 兼容更多本地开发场景，提升易用性和稳定性。

### v1.2.0 (2025-07-22)
- 🚦 全流程强制校验：每一步未完成禁止后续命令，流程闭环，极大降低遗漏和背锅风险
- 🟢 checklist 彩色状态+文字提示，done为绿色，need-redo为黄色，未完成为红色，汇总建议更友好
- 📝 generate/check/package/checklist 等命令全部兼容新状态结构
- 🕒 need-redo 机制：generator/validator/std.cpp 变更自动回退后续状态，强制重新生成/检查
- 💾 init 自动初始化 .snapshots 及快照元数据，快照机制更健壮
- 📦 package 阶段快照说明支持交互式选择历史说明、常用模板或自定义输入，体验更高效
- 🧹 彻底移除老字段，所有命令只操作 checklist 7 步，结构更清晰

### v1.1.4 (2025-07-22)
- 🧹 清理无用依赖和临时文件，移除 .yarnclean、测试脚本、历史测试目录
- 🛠️ 依赖管理规范化，rimraf/mkdirp/archiver 等依赖分类修正
- 📝 增加自动化和人工混合测试流程建议，完善测试报告模板
- ⚡ 项目结构更简洁，便于维护和发布

### v1.1.1 (2025-07-21)
- ✨ **edit命令大幅增强**：
  - 支持题目ID（目录名）交互式修改，自动重命名目录
  - 支持交互式选择/切换checker类型，自动补全checker模板
  - 支持补全缺失的 generator、validator、testlib.h、solution/stdsol.md 等模板文件
  - 支持标签补全、其他标签输入、题目信息和评测配置交互式编辑
  - 自动生成/更新 status.json 题目状态文件
  - 交互体验与 init.js 完全一致，便于题目后期维护和迁移

### v1.1.0 (2025-07-20)
- ✨ **智能文件切换**: 修改不同markdown文件时自动切换到对应预览页面
- 🔧 **路由优化**: 修复solution目录下文件的路由问题，支持 `/solution/stdsol` 路径
- 📝 **题解文件监听**: 扩展文件监听范围，支持监听 `solution/*.md` 文件
- 🎯 **文件路径处理**: 改进文件路径匹配逻辑，正确处理solution目录下的文件
- 🔄 **WebSocket消息增强**: 发送完整的文件路径信息，支持更精确的文件切换
- 🛠️ **代码优化**: 改进文件变更检测和页面切换逻辑

## ✨ 功能特性

- 🚀 **题目初始化**: 快速创建标准化的OI题目结构
- 📝 **实时预览**: 支持GitHub风格的代码预览，包含代码高亮、数学公式和图片显示
- 🔧 **题目编辑**: 交互式编辑题目信息（标题、标签、时间/内存限制、checker类型、题目ID等），支持目录重命名和模板补全
- 🧪 **测试数据生成**: 自动生成测试数据
- 📦 **题目打包**: 将题目打包为zip文件
- ✅ **完整性检查**: 检查题目的完整性
- 📊 **状态管理**: 查看题目状态和测试样例
- 🔄 **文件监听**: 实时监听文件变化并自动刷新预览
- 🖼️ **图片支持**: 支持本地和网络图片显示，多种格式兼容
- 📝 **题解支持**: 题解文件支持file://协议，可引用图片和文档
- 🛡️ **判题安全**: checker.cpp/判题器自动编译，变更必定生效，避免“未编译导致全 WA”
- 🧑‍💻 **编码兼容**: 所有输入输出/样例/答案/模板文件强制使用 UTF-8 编码，避免乱码和 BOM 问题
- 💻 **C++文件编辑器**: 集成Monaco Editor，支持语法高亮、智能补全，右侧功能按钮栏提供保存、编译、diff测试功能
- 🔨 **一键编译**: 通过终端窗口执行编译，实时显示编译过程和错误信息
- 🧪 **自动测试**: diff功能自动编译并测试样例，与标准答案进行差异比较，输出文件按程序名分类管理
- 📝 **样例导入/导出**: 预览区自动检测样例代码块，提供读入、写入、取消按钮，支持与sample文件双向同步

## 📦 安装

```bash
# 克隆项目
git clone https://github.com/chjshen/oimp.git
cd oimp

# 安装依赖
yarn install

# 全局安装（可选）
npm link
```

## 🚦 推荐使用流程

1. **初始化题目**
   ```bash
   oimp init <题目ID>
   ```
   交互式输入题目信息、标签、限制等，自动生成标准目录结构和模板文件。

2. **启动 Web IDE 实时预览/编辑**
   ```bash
   oimp watch <题目ID>
   ```
   浏览器自动打开 Web IDE，支持文件树、代码编辑、终端、实时预览、图片粘贴、题目状态面板等。

3. **在 Web IDE 中完成题目开发全流程**
   - 编辑题面、标准程序、数据生成器、验证器、checker、题解等
   - 实时预览 markdown、公式、图片，支持图片粘贴/上传
   - C++文件编辑器：右侧按钮栏提供保存、编译、diff测试功能
   - Markdown预览样例功能：自动检测样例代码块，支持读入、写入、取消操作
   - 终端直接运行命令（如 gendata/check/testsample/package）
   - 题目状态面板实时反馈 checklist 进度
   - 所有依赖本地化，离线可用

4. **命令行补充操作（可选）**
   - 也可在命令行用 `oimp testsample <题目ID>`、`oimp check <题目ID>`、`oimp package <题目ID>` 等命令独立执行

---

## 🚀 快速开始

> **推荐：直接用 Web IDE 全流程开发！**

### 1. 创建新题目

```bash
# 创建名为 "fibonacci" 的题目
oimp init fibonacci

# 强制覆盖已存在的目录
oimp init fibonacci --force
```

这将创建以下目录结构：
```
fibonacci/
├── problem_zh.md          # 中文题目描述
├── problem.yaml           # 题目配置信息
├── std.cpp               # 标准解答
├── validator.cpp         # 数据验证器
├── generator.cpp         # 数据生成器
├── checker.cpp           # 自定义评测器
├── additional_file/      # 附加文件目录（图片、文档等）
└── testdata/             # 测试数据目录
    └── config.yaml       # 评测配置
```

### 2. 编辑题目信息

```bash
oimp edit fibonacci
```

交互式编辑以下信息：
- 题目标题
- 题目标签（难度、算法类型等）
- 时间限制
- 内存限制

### 3. 实时预览题目

```bash
# 启动实时预览服务器
oimp watch fibonacci

# 指定端口（可选）
oimp watch fibonacci -p 8080
```

功能特点：
- 🎨 **GitHub风格**: 完全符合GitHub的视觉设计
- 💻 **代码高亮**: 支持C++、Python、Java等多种语言
- 📐 **数学公式**: 支持LaTeX数学公式渲染（使用本地KaTeX资源）
- 🔄 **WebSocket实时更新**: 保存文件后通过WebSocket立即刷新页面
- 📱 **响应式**: 适配不同屏幕尺寸
- 🎯 **工作流按钮**: 底部工作流栏提供一键执行命令和快速编辑功能

#### 🔄 WebSocket实时更新特性
- **⚡ 即时响应**: 文件保存后立即通过WebSocket推送更新消息
- **🔄 自动重连**: 网络断开时自动重连，最多重试5次
- **📊 连接状态**: 右上角显示WebSocket连接状态指示器
- **🔔 更新通知**: 文件更新时显示友好的通知消息
- **📱 多客户端**: 支持多个浏览器窗口同时预览

### 关于数学公式渲染

本工具使用KaTeX进行数学公式渲染，所有必要的资源都已完全本地化：

#### 📁 本地资源目录结构
```
templates/
└── static/
    ├── katex.min.css      # KaTeX样式文件（已修改字体路径）
    ├── katex.min.js       # KaTeX核心JavaScript
    ├── auto-render.min.js # KaTeX自动渲染插件
    └── fonts/
        ├── KaTeX_AMS-Regular.woff2
        ├── KaTeX_Main-Regular.woff2
        ├── KaTeX_Math-Italic.woff2
        └── ... (共60个字体文件)
```

#### ✅ 完全本地化优势
- **🔄 无外部依赖**: 不依赖CDN，离线环境也可正常使用
- **⚡ 快速加载**: 本地资源加载速度更快
- **🛡️ 稳定可靠**: 避免网络问题导致的渲染失败
- **📦 完整字体**: 包含所有KaTeX字体文件，确保数学符号正确显示

#### 📐 支持的数学公式格式
- **行内公式**: `$E = mc^2$`
- **块级公式**: `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`
- **复杂公式**: `$$\begin{align} \nabla \cdot \vec{E} &= \frac{\rho}{\epsilon_0} \end{align}$$`
- **矩阵**: `$$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$$`
- **分数**: `$$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$`

### 关于图片显示功能

本工具支持完整的图片显示功能，包括本地图片和网络图片：

#### 🖼️ 支持的图片格式
- **SVG**: 矢量图形，可缩放，支持文字和复杂图形
- **PNG**: 无损压缩，支持透明度
- **JPG/JPEG**: 有损压缩，文件小，适合照片
- **WebP**: 现代格式，高压缩率，支持透明度和动画

#### 📁 静态文件服务
预览服务器提供以下静态文件路由：
- `/static/` - KaTeX CSS/JS 和字体文件
- `/images/` - 图片文件目录
- `/assets/` - 其他资源文件
- `/files/` - 整个题目目录（包含 additional_file 子目录）

#### 📂 Additional File 目录规范

**重要要求**：所有题目相关的图片文件、文档、资源等都必须放在 `additional_file` 目录中。

##### 📁 标准目录结构
```
题目名称/
├── problem_zh.md          # 题目描述
├── problem.yaml           # 题目配置
├── std.cpp               # 标准解答
├── validator.cpp         # 数据验证器
├── generator.cpp         # 数据生成器
├── checker.cpp           # 自定义评测器
├── additional_file/      # 附加文件目录（必需）
│   ├── images/           # 图片文件目录
│   │   ├── diagram1.png  # 题目图解
│   │   ├── flowchart.svg # 流程图
│   │   └── example.jpg   # 示例图片
│   ├── docs/             # 文档目录
│   │   ├── solution.pdf  # 解题思路文档
│   │   └── reference.md  # 参考资料
│   └── data/             # 数据文件目录
│       ├── sample.in     # 样例输入
│       └── sample.out    # 样例输出
└── testdata/             # 测试数据目录
    └── config.yaml       # 评测配置
```

##### 🎯 使用规范
- **图片文件**: 所有图片必须放在 `additional_file/images/` 目录中
- **文档文件**: 相关文档放在 `additional_file/docs/` 目录中
- **数据文件**: 样例数据放在 `additional_file/data/` 目录中
- **路径引用**: 在markdown中使用 `file://文件名` 格式引用（推荐）或 `additional_file/images/图片名` 格式

#### 🎯 图片路径配置
- **本地图片**: 使用 `file://图片名` 格式（推荐）或 `additional_file/images/图片名` 格式
- **网络图片**: 使用完整URL，如 `https://example.com/image.jpg`
- **Additional File目录**: 所有题目相关的图片文件都必须放在此目录中

#### 📝 图片使用示例

```
# 本地图片显示

## Additional File 目录中的图片（推荐使用file://格式）
![题目图解](file://diagram1.png)
![流程图](file://flowchart.svg)
![示例图片](file://example.jpg)

## 网络图片
![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

## 图片尺寸控制
<img src="file://diagram1.svg" width="300" height="200" alt="自定义尺寸">

## 图片链接
[![点击查看详情](file://example.png)](https://github.com)

## 文件下载链接
[下载样例数据](file://sample.in)
[下载解题思路](file://solution.pdf)

## 与其他元素混合
行内公式：$x^2 + y^2 = z^2$

![图片说明](file://flowchart.svg)

块级公式：
$$E = mc^2$$

```cpp
#include <iostream>
int main() {
    std::cout << "Hello World!" << std::endl;
    return 0;
}
```

![代码示例图片](file://example.png)
```

#### ✅ 图片显示优势
- **🔄 实时更新**: 图片文件修改后自动刷新显示
- **📱 响应式**: 图片自动适配不同屏幕尺寸
- **🔗 多格式**: 支持主流图片格式，兼容性好
- **⚡ 快速加载**: 本地图片加载速度快
- **🛡️ 稳定可靠**: 网络图片加载失败时有友好提示

#### 🔗 file://协议支持

本工具支持使用 `file://` 协议来引用additional_file目录中的文件：

- **图片引用**: `![图片说明](file://image.png)`
- **文件下载**: `[下载文件](file://document.pdf)`
- **自动转换**: `file://文件名` 会自动转换为 `/files/additional_file/文件名`

**优势**：
- **简洁易用**: 只需文件名，无需完整路径
- **统一管理**: 所有文件都在additional_file目录中
- **自动处理**: 系统自动处理路径转换
- **支持多种文件**: 图片、文档、数据文件等

#### 📝 题解文件支持

题解文件 `solution/stdsol.md` 同样支持file://协议：

- **算法图解**: `![算法流程图](file://algorithm_flowchart.svg)`
- **样例分析**: `![样例分析图](file://sample_analysis.png)`
- **参考资料**: `[算法导论](file://reference.pdf)`
- **代码执行**: `![代码执行过程](file://code_execution.png)`

题解模板已预置file://协议的使用示例，方便编写包含丰富图片和文档的题解。

### 4. 生成测试数据

```bash
# 生成默认数量的测试数据
oimp gendata fibonacci

# 生成指定数量的测试数据
oimp gendata fibonacci -c 10
```

### 5. 检查题目完整性

```bash
oimp check fibonacci
```

检查项目：
- 目录结构完整性
- 必要文件是否存在
- 配置文件格式是否正确

### 6. 查看题目状态

```bash
oimp status fibonacci
```

显示：
- 目录完整性状态
- 数据验证状态
- 测试数据生成状态
- 整体检查状态

### 7. 查看测试样例

```bash
oimp testsample fibonacci
```

### 8. 打包题目

```bash
oimp package fibonacci
```

生成 `fibonacci.zip` 文件，包含完整的题目包。

## 📖 详细使用示例

### 示例：创建一个斐波那契数列题目

#### 1. 初始化题目

```bash
oimp init fibonacci
```

#### 2. 编辑题目信息

```bash
oimp edit fibonacci
```

在交互式界面中设置：
- 标题：斐波那契数列
- 标签：入门、动态规划
- 时间限制：1000ms
- 内存限制：256m

#### 3. 编写题目描述

编辑 `fibonacci/problem_zh.md`：

```
# 斐波那契数列

## 题目描述

斐波那契数列是一个经典的数学序列，定义如下：
- F(0) = 0
- F(1) = 1
- F(n) = F(n-1) + F(n-2) (n ≥ 2)

给定一个整数 n，请计算 F(n) 的值。

![斐波那契数列图解](file://fibonacci_diagram.png)

## 输入格式

一行一个整数 n (0 ≤ n ≤ 45)

## 输出格式

一行一个整数，表示 F(n) 的值

## 样例输入

```
5
```

## 样例输出

```
5
```

## 数据范围与提示

- 0 ≤ n ≤ 45
- 可以使用动态规划或矩阵快速幂算法
- 注意处理边界情况

## 解题思路

### 方法一：动态规划

![动态规划流程图](file://dp_flowchart.svg)

```cpp
#include <iostream>
#include <vector>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    
    vector<int> dp(n + 1);
    dp[0] = 0;
    dp[1] = 1;
    
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    
    return dp[n];
}

int main() {
    int n;
    cin >> n;
    cout << fibonacci(n) << endl;
    return 0;
}
```

### 方法二：矩阵快速幂

时间复杂度：$O(\log n)$

$$F(n) = \begin{pmatrix} 1 & 1 \\ 1 & 0 \end{pmatrix}^{n-1} \begin{pmatrix} 1 \\ 0 \end{pmatrix}$$
```

#### 4. 创建附加文件目录

```bash
# 创建additional_file目录结构
mkdir -p fibonacci/additional_file/images
mkdir -p fibonacci/additional_file/docs
mkdir -p fibonacci/additional_file/data

# 将图片文件放入images目录
# 例如：将题目图解、流程图等图片放入 fibonacci/additional_file/images/
```

#### 5. 启动实时预览

```bash
oimp watch fibonacci
```

浏览器会自动打开 `http://localhost:3000`，显示：
- ✅ 美观的GitHub风格界面
- ✅ C++代码语法高亮
- ✅ 数学公式正确渲染
- ✅ 图片正确显示（来自additional_file目录）
- ✅ 表格正确显示

#### 5. 编写标准解答

编辑 `fibonacci/std.cpp`：

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    if (n <= 1) {
        cout << n << endl;
        return 0;
    }
    
    vector<int> dp(n + 1);
    dp[0] = 0;
    dp[1] = 1;
    
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    
    cout << dp[n] << endl;
    return 0;
}
```

#### 6. 编写数据验证器

编辑 `fibonacci/validator.cpp`：

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    if (n < 0 || n > 45) {
        cerr << "n should be between 0 and 45" << endl;
        return 1;
    }
    
    cout << n << endl;
    return 0;
}
```

#### 7. 编写数据生成器

编辑 `fibonacci/generator.cpp`：

```cpp
#include <iostream>
#include <random>
using namespace std;

int main() {
    random_device rd;
    mt19937 gen(rd());
    uniform_int_distribution<> dis(0, 45);
    
    int n = dis(gen);
    cout << n << endl;
    return 0;
}
```

#### 8. 生成测试数据

```bash
oimp gendata fibonacci -c 10
```

#### 9. 检查题目完整性

```bash
oimp check fibonacci
```

#### 10. 编写题解

编辑 `fibonacci/solution/stdsol.md`：

```
# 题解

## 题目分析

### 问题描述
斐波那契数列是一个经典的数学序列...

![题目图解](file://fibonacci_diagram.png)

## 解题思路

### 方法一：动态规划

#### 算法思路
使用动态规划，自底向上计算...

![算法流程图](file://dp_flowchart.svg)

#### 代码实现
```
#include <iostream>
#include <vector>
using namespace std;

int main() {
    // 算法实现
    return 0;
}
```

![代码执行过程](file://code_execution.png)

## 样例分析

### 样例1
**输入**：`5`
**输出**：`5`

![样例1分析图](file://sample1_analysis.png)

## 参考资料
- [算法导论相关章节](file://reference.pdf)
- [相关论文](file://paper.pdf)
```

#### 11. 打包题目

```bash
oimp package fibonacci
```

## 🎨 预览功能详解

### 支持的Markdown特性

#### 代码高亮
支持多种编程语言的语法高亮：

`````
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    return 0;
}
```

```python
def hello():
    print("Hello World")
    return True
```
````

#### 数学公式
支持行内和块级数学公式，使用KaTeX引擎渲染：

```
行内公式：$E = mc^2$

块级公式：
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

复杂公式：
$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

矩阵公式：
$$\begin{pmatrix} 1 & 1 \\ 1 & 0 \end{pmatrix}^{n-1} \begin{pmatrix} 1 \\ 0 \end{pmatrix}$$
```

#### 图片显示
支持本地和网络图片显示，多种格式兼容：

```
# 本地图片（Additional File目录）
![题目图解](file://diagram.png)

# 网络图片
![网络图片](https://example.com/image.jpg)

# 图片尺寸控制
<img src="file://flowchart.svg" width="300" height="200" alt="自定义尺寸">

# 图片链接
[![点击查看详情](file://example.png)](https://github.com)

# 文件下载链接
[下载样例数据](file://sample.in)
[下载解题思路](file://solution.pdf)

# 与其他元素混合显示
行内公式：$x^2 + y^2 = z^2$

![图片说明](file://flowchart.svg)

块级公式：
$$E = mc^2$$

```cpp
#include <iostream>
int main() {
    std::cout << "Hello World!" << std::endl;
    return 0;
}
```

![代码示例图片](file://example.png)
```

#### 表格
支持包含数学公式的表格：

```
| 算法 | 时间复杂度 | 空间复杂度 |
|------|------------|------------|
| 快速排序 | $O(n \log n)$ | $O(\log n)$ |
| 归并排序 | $O(n \log n)$ | $O(n)$ |
| 冒泡排序 | $O(n^2)$ | $O(1)$ |
```

### 预览功能特点

- **实时更新**: 保存文件后页面自动刷新
- **多文件支持**: 自动发现并支持多个 `problem*.md` 文件
- **智能预览**: 单个文件直接预览，多个文件显示选择列表
- **完全内联**: 所有CSS和JS都打包在HTML中，无需外部依赖
- **数学公式**: 支持LaTeX数学公式渲染，使用KaTeX引擎
- **图片显示**: 支持本地和网络图片，多种格式兼容
- **静态文件服务**: 提供完整的静态文件服务，支持Additional File目录

## Web IDE 离线部署与使用

本项目内置本地化 Web IDE，支持 Monaco Editor（含 C++ 智能补全）、xterm.js 终端、文件树浏览、Markdown/C++ 语法高亮等，**所有依赖均本地部署，无需外网**。

### 依赖准备

已自动下载以下依赖到 `templates/static/` 目录：
- Monaco Editor（`monaco/min/vs/`）
- xterm.js 及 CSS（`xterm/`）
- jsTree 及主题（`jstree/`）
- monaco-languageclient、vscode-languageserver-protocol、reconnecting-websocket（LSP 支持）

如需手动更新依赖，可参考：
```sh
# Monaco Editor
mkdir -p templates/static/monaco && curl -L https://registry.npmmirror.com/monaco-editor/-/monaco-editor-0.44.0.tgz | tar -xz -C templates/static/monaco --strip-components=1 package/min
# xterm.js
mkdir -p templates/static/xterm && curl -L https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js -o templates/static/xterm/xterm.js && curl -L https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css -o templates/static/xterm/xterm.css
# jsTree
mkdir -p templates/static/jstree && curl -L https://cdn.jsdelivr.net/npm/jstree@3.3.15/dist/jstree.min.js -o templates/static/jstree/jstree.js && mkdir -p templates/static/jstree/themes/default && curl -L https://cdn.jsdelivr.net/npm/jstree@3.3.15/dist/themes/default/style.min.css -o templates/static/jstree/themes/default/style.min.css
# LSP 相关
mkdir -p templates/static/monaco-languageclient && curl -L https://cdn.jsdelivr.net/npm/monaco-languageclient@0.15.0/lib/monaco-languageclient.min.js -o templates/static/monaco-languageclient/monaco-languageclient.js
mkdir -p templates/static/vscode-languageserver-protocol && curl -L https://cdn.jsdelivr.net/npm/vscode-languageserver-protocol@3.17.5/lib/browser/main.js -o templates/static/vscode-languageserver-protocol/main.js
mkdir -p templates/static/reconnecting-websocket && curl -L https://cdn.jsdelivr.net/npm/reconnecting-websocket@4.4.0/dist/reconnecting-websocket.min.js -o templates/static/reconnecting-websocket/reconnecting-websocket.js
```

### 启动 Web IDE

1. 进入题目根目录，运行：
   ```sh
   oimp watch <题目目录>
   ```
2. 浏览器访问 [http://localhost:3000/ide](http://localhost:3000/ide)

### 功能说明
- **文件树**：浏览、切换、编辑题目目录下所有主要文件
- **Monaco Editor**：支持 Markdown/C++/JSON/YAML 等多种语法高亮
- **C++ 智能补全**：打开 `.cpp` 文件自动启用 LSP（需本机已安装 clangd）
- **C++ 文件编辑器**：右侧功能按钮栏提供保存、编译、diff测试功能
  - **保存**：保存当前文件（Ctrl+S快捷键）
  - **编译**：通过终端执行编译，实时显示编译过程和错误信息
  - **diff**：自动编译并测试样例，与标准答案进行差异比较
- **Markdown 预览样例功能**：自动检测"样例"或"示例"标题后的代码块
  - **读入**：从sample文件导入内容到代码块，并同步到Markdown源码
  - **写入**：将代码块内容写入到sample文件
  - **取消**：跳过当前代码块，后续编号自动顺延
- **工作流按钮栏**：底部可展开的工作流按钮栏，提供一键执行命令和快速编辑功能
  - **独立操作区域**：题目状态、编辑题目元数据、修复、快照
  - **主工作流区域**：编辑题面、四个并列编辑按钮、测试样例、检查+生成数据、打包
  - **悬停展开**：初始紧凑模式，悬停时展开显示完整工作流
  - **一键执行**：点击按钮即可在终端执行对应命令或打开文件
- **终端**：内嵌 xterm.js，直接在题目目录下运行命令
- **本地化依赖**：所有前端依赖均本地部署，无需外网

### LSP 支持
- 默认使用本机 `clangd` 作为 C++ LSP 服务器
- 如需自定义 LSP 路径，请修改 `watch.js` 中相关 spawn 配置

### C++ 文件编辑器功能

#### 右侧功能按钮栏
当打开 `.cpp`、`.cc`、`.cxx` 文件时，编辑器右侧会显示功能按钮栏：

- **保存按钮**：保存当前文件（支持 Ctrl+S 快捷键）
- **编译按钮**：通过终端执行编译，实时显示编译过程和结果
- **diff按钮**：自动编译并测试样例，与标准答案进行差异比较

#### 编译功能
- 自动保存文件后执行编译
- 使用 `g++ -O2 -std=c++14` 编译选项
- 编译过程和错误信息直接在终端中显示
- 支持 `.cpp`、`.cc`、`.cxx` 文件类型

#### diff测试功能
- 自动扫描 `sample` 目录中的所有 `.in` 文件
- 输出文件保存到 `outputs/文件主名/` 目录，避免文件冲突
- 与 `sample` 目录中的 `.ans` 文件进行 `diff` 比较
- 排除 `validator.cpp`、`check.cpp`、`generator.cpp` 等特殊文件

#### 输出目录结构示例
```
mahadon/
├── src/
│   ├── test_diff.cpp          # 源代码文件
│   └── wrong_diff.cpp         # 另一个源代码文件
├── sample/
│   ├── sample01.in            # 样例输入
│   ├── sample01.ans           # 样例答案
│   ├── sample02.in
│   └── sample02.ans
└── outputs/                   # 输出目录
    ├── test_diff/             # 按文件主名分类
    │   ├── sample01.out       # 输出文件
    │   └── sample02.out
    └── wrong_diff/            # 另一个程序的输出
        └── sample01.out
```

### Markdown 预览样例功能

#### 功能概述
在Markdown预览区，当检测到"样例"或"示例"标题后，会自动为代码块添加三个功能按钮：

#### 按钮功能
- **读入按钮**：`读入 sampleXX.in/ans`
  - 从 `sample/sampleXX.in` 或 `sample/sampleXX.ans` 文件读取内容
  - 将内容导入到对应的代码块中
  - 自动同步更新Markdown源码
  - 操作成功后有动画提示

- **写入按钮**：`写入 sampleXX.in/ans`
  - 将代码块内容写入到 `sample/sampleXX.in` 或 `sample/sampleXX.ans` 文件
  - 显示确认对话框，包含文件名和内容预览
  - 支持覆盖已存在的文件

- **取消按钮**：`取消`
  - 跳过当前代码块，不进行编号
  - 后续代码块编号自动顺延
  - 支持动态重新编号

#### 智能编号规则
- 自动检测第一个"样例"或"示例"标题后的所有代码块
- 奇数编号代码块（第1、3、5...个）作为输入文件（.in）
- 偶数编号代码块（第2、4、6...个）作为输出文件（.ans）
- 文件编号按 `Math.floor((index)/2)+1` 计算
- 支持多个样例，自动处理编号和文件类型

#### 界面设计
- 按钮位于代码块上方，右对齐显示
- 三个按钮紧密排列，中间有竖线分隔
- 外部容器有边框，按钮无背景色
- 所有按钮具有hover效果（背景色变化）
- 操作有动画提示和状态反馈

#### 使用示例
```
## 样例

1 2
3

5 7
12
```

预览时会自动添加按钮：
- 第一个代码块：`读入 sample01.in` | `写入 sample01.in` | `取消`
- 第二个代码块：`读入 sample01.ans` | `写入 sample01.ans` | `取消`

### 工作流按钮使用说明

Web IDE 底部的工作流按钮栏提供了完整的题目开发流程支持：

#### 🎯 独立操作区域（左侧）
- **题目状态**：查看题目的完成状态和进度，显示checklist各步骤状态
- **编辑题目元数据**：编辑题目的基本信息、标签、时间/内存限制等配置
- **修复**：自动修复题目中的常见问题，补全缺失的文件和目录
- **快照**：查看和管理题目的版本快照，支持回滚操作

#### 🔄 主工作流区域（右侧）
- **编辑题面**：直接打开 `problem_zh.md` 文件进行编辑
- **四个并列编辑按钮**：
  - **生成样例**：直接打开 `problem_zh.md` 文件进行编辑，在题面中定义样例输入输出
  - **编辑标程**：直接打开 `src/std.cpp` 文件进行编辑
  - **编辑数据生成器**：直接打开 `src/generator.cpp` 文件进行编辑
  - **编辑输入验证器**：直接打开 `src/validator.cpp` 文件进行编辑
- **测试样例**：执行 `oimp testsample` 命令，使用样例数据测试标程和验证器
- **检查+生成数据容器**：
  - **检查**：执行 `oimp check` 命令，检查题目的完整性和正确性
  - **生成数据**：执行 `oimp gendata` 命令，使用数据生成器创建测试数据
- **打包**：执行 `oimp package` 命令，将题目打包为可发布的格式

#### 🎨 界面特性
- **悬停展开**：工作流栏初始高度50px，悬停时展开到400px，平滑过渡动画
- **深色主题**：采用深色配色方案，与整体界面风格统一
- **箭头连接**：按钮间使用SVG箭头连接，清晰显示工作流程
- **Tooltip提示**：所有按钮都有详细的tooltip说明，便于理解功能
- **响应式布局**：独立操作区域垂直排列，主工作流区域水平排列

#### ⚡ 使用优势
- **一键执行**：点击按钮即可在终端执行对应命令，无需手动输入
- **智能识别**：自动获取当前题目ID，无需手动指定
- **快速编辑**：编辑类按钮直接打开对应文件，提高开发效率
- **流程清晰**：按钮布局反映实际开发流程，便于按步骤操作
- **状态反馈**：通过终端输出实时查看命令执行结果

### 自适应与动画说明

- **高度自适应**：工作流区展开/收起、终端区拖拽、最大化/最小化时，文件树、编辑器、预览区的高度会实时同步调整，无论是鼠标悬停、拖动终端分割条，还是点击终端最大化/最小化按钮，主内容区高度都会立即跟随变化。
- **平滑动画**：所有区域高度变化均采用0.1秒平滑动画，界面响应极快，视觉体验流畅。
- **实时同步**：拖动终端区高度时，主内容区（文件树/编辑器/预览）会跟随鼠标实时变化，无卡顿、无延迟。
- **无延迟收缩**：工作流区展开后鼠标移出时，所有主区高度同步收缩，无“延迟收缩”或“动画滞后”现象。
- **机制优化**：相关动画和自适应机制已在前端JS和CSS中优化，确保所有区域高度变化都能即时、平滑地反映到界面上。

> 体验提示：如遇到高度变化不同步、动画卡顿等问题，请刷新页面或清理浏览器缓存，确保加载到最新的前端代码。

### 常见问题
- 若 IDE 页面无法加载或补全无效，请检查 static 目录依赖是否完整、`clangd` 是否已安装
- 如需支持更多语言 LSP，可参考 Monaco 官方文档扩展
- 编译和diff功能需要终端WebSocket连接正常，如遇问题请检查网络连接
- 工作流按钮需要确保终端WebSocket连接正常，否则命令无法执行

## 📁 项目结构

```
oi-tools/
├── bin/
│   └── oimp.js              # 主入口文件
├── lib/
│   ├── commands/            # 命令模块
│   │   ├── init.js          # 初始化命令
│   │   ├── edit.js          # 编辑命令
│   │   ├── watch.js         # 预览命令
│   │   ├── generate.js      # 生成命令
│   │   ├── check.js         # 检查命令
│   │   ├── status.js        # 状态命令
│   │   ├── testsample.js    # 测试样例命令
│   │   └── package.js       # 打包命令
│   ├── templates/           # 模板文件
│   │   ├── problem_zh.md    # 题目模板
│   │   ├── std.cpp          # 标准解答模板
│   │   ├── validator.cpp    # 验证器模板
│   │   ├── generator.cpp    # 生成器模板
│   │   ├── checker.cpp      # 评测器模板
│   │   └── static/          # 静态资源
│   │       ├── katex.min.css # KaTeX样式
│   │       ├── katex.min.js  # KaTeX脚本
│   │       └── fonts/        # KaTeX字体文件
│   └── utils.js             # 工具函数
├── package.json
└── README.md
```

### 📂 题目目录结构

```
题目名称/
├── problem_zh.md          # 题目描述（支持图片、数学公式）
├── problem.yaml           # 题目配置信息
├── std.cpp               # 标准解答
├── validator.cpp         # 数据验证器
├── generator.cpp         # 数据生成器
├── checker.cpp           # 自定义评测器
├── solution/             # 题解目录
│   └── stdsol.md         # 标准题解（支持file://协议）
├── additional_file/      # 附加文件目录（必需）
│   ├── images/           # 图片文件目录
│   │   ├── diagram1.png  # 题目图解
│   │   ├── flowchart.svg # 流程图
│   │   └── example.jpg   # 示例图片
│   ├── docs/             # 文档目录
│   │   ├── solution.pdf  # 解题思路文档
│   │   └── reference.md  # 参考资料
│   └── data/             # 数据文件目录
│       ├── sample.in     # 样例输入
│       └── sample.out    # 样例输出
└── testdata/             # 测试数据目录
    └── config.yaml       # 评测配置
```

## 🔧 配置说明

### 题目配置文件 (problem.yaml)

```yaml
title: "斐波那契数列"
tag: ["入门", "动态规划"]
```

### 评测配置文件 (testdata/config.yaml)

```yaml
time: "1000ms"
memory: "256m"
```

## 🛠️ 开发

### 添加新命令

1. 在 `lib/commands/` 目录下创建新的命令文件
2. 在 `bin/oimp.js` 中注册新命令
3. 更新 `package.json` 中的依赖（如需要）

### 自定义模板

修改 `lib/templates/` 目录下的模板文件来自定义生成的题目结构。

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🌐 跨平台支持

### 命令兼容性

本工具全面支持跨平台操作，自动适配不同操作系统的命令差异：

#### 文件比较命令
- **Windows**: 使用 `fc` 命令进行文件比较
- **Unix/Linux/macOS**: 使用 `diff` 命令进行文件比较

#### 文件清理命令
- **Windows**: 使用 `del /f /q` 命令删除文件
- **Unix/Linux/macOS**: 使用 `rm -f` 命令删除文件

#### 文件存在检查
- **Windows**: 使用 `if exist` 语法检查文件存在
- **Unix/Linux/macOS**: 使用 `if [ -f ]` 语法检查文件存在

### 自动适配机制

工具通过后端API自动检测平台并提供对应的命令：

```javascript
// 后端自动检测平台
const platform = process.platform;
const isWindows = platform === 'win32';
const diffCommand = isWindows ? 'fc' : 'diff';
const rmCommand = isWindows ? 'del /f /q' : 'rm -f';
const fileCheckCommand = isWindows ? 'if exist' : 'if [ -f';
```

### 编译环境要求

- **Windows**: 需要安装MinGW或Visual Studio的C++编译器
- **Unix/Linux/macOS**: 需要安装g++编译器
- 所有平台都支持 `g++ -O2 -std=c++14` 编译选项

### 兼容性说明

- 工具会自动获取平台信息并使用正确的命令语法
- 如果平台检测失败，会使用Unix风格的默认命令
- 所有文件路径都使用相对路径，确保跨平台兼容性

### 替代方案

如果系统上没有 `diff` 或 `fc` 命令，可以考虑以下替代方案：

1. **安装Git Bash** (Windows): Git for Windows包含diff命令
2. **安装Cygwin** (Windows): 提供Unix工具集
3. **使用PowerShell**: 
   ```powershell
   Compare-Object (Get-Content file1) (Get-Content file2)
   ```
4. **使用Python**:
   ```bash
   python -c "import difflib; print('\n'.join(difflib.unified_diff(open('file1').readlines(), open('file2').readlines())))"
   ```

### 编译环境

- **Windows**: 需要安装MinGW或Visual Studio
- **macOS**: 需要安装Xcode Command Line Tools
- **Linux**: 需要安装gcc/g++

## 📞 联系方式

- GitHub: [@chjshen](https://github.com/chjshen)
- 项目地址: https://github.com/chjshen/oimp
- email: 19311565@qq.com
---

**享受OI编程的乐趣！** 🎉