# OI Tools (oimp)

一个强大的OI（信息学奥林匹克）题目生成和管理工具，支持题目创建、测试数据生成、打包导出以及实时预览功能。

## 📋 版本更新

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
- 📝 **实时预览**: 支持GitHub风格的markdown预览，包含代码高亮、数学公式和图片显示
- 🔧 **题目编辑**: 交互式编辑题目信息（标题、标签、时间/内存限制、checker类型、题目ID等），支持目录重命名和模板补全
- 🧪 **测试数据生成**: 自动生成测试数据
- 📦 **题目打包**: 将题目打包为zip文件
- ✅ **完整性检查**: 检查题目的完整性
- 📊 **状态管理**: 查看题目状态和测试样例
- 🔄 **文件监听**: 实时监听markdown文件变化并自动刷新预览
- 🖼️ **图片支持**: 支持本地和网络图片显示，多种格式兼容
- 📝 **题解支持**: 题解文件支持file://协议，可引用图片和文档

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

## 🚀 快速开始

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

```markdown
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
oimp generate fibonacci

# 生成指定数量的测试数据
oimp generate fibonacci -c 10
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

```markdown
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
oimp generate fibonacci -c 10
```

#### 9. 检查题目完整性

```bash
oimp check fibonacci
```

#### 10. 编写题解

编辑 `fibonacci/solution/stdsol.md`：

```markdown
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
```cpp
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

````markdown
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

```markdown
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

```markdown
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

```markdown
| 算法 | 时间复杂度 | 空间复杂度 |
|------|------------|------------|
| 快速排序 | $O(n \log n)$ | $O(\log n)$ |
| 归并排序 | $O(n \log n)$ | $O(n)$ |
| 冒泡排序 | $O(n^2)$ | $O(1)$ |
```

### 预览功能特点

- **实时更新**: 保存markdown文件后页面自动刷新
- **多文件支持**: 自动发现并支持多个 `problem*.md` 文件
- **智能预览**: 单个文件直接预览，多个文件显示选择列表
- **完全内联**: 所有CSS和JS都打包在HTML中，无需外部依赖
- **数学公式**: 支持LaTeX数学公式渲染，使用KaTeX引擎
- **图片显示**: 支持本地和网络图片，多种格式兼容
- **静态文件服务**: 提供完整的静态文件服务，支持Additional File目录

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

## 📞 联系方式

- GitHub: [@chjshen](https://github.com/chjshen)
- 项目地址: https://github.com/chjshen/oimp
- email: 19311565@qq.com
---

**享受OI编程的乐趣！** 🎉