# Node.js 命令行程序：OI 题目生成工具 oimp

创建 OI 题目所需的各个部分，并最终打包成 zip 文件。（oimp == oi make problem）
目前正在更新功能中，以下内容仅供参考
## 1. 项目结构

```
oi-tool/
├── bin/
│   └── oimp.js        # 命令行入口
├── lib/
│   ├── commands/         # 各个子命令
│   │   ├── init.js
│   │   ├── check.js
│   │   └── edit.js
│   ├── templates/       # 模板文件
│   │   ├── checker.cpp
│   │   ├── generator.cpp
│   │   ├── validator.cpp
│   │   ├── std.cpp
│   │   └── statement.md
│   └── utils.js         # 工具函数
├── package.json
└── README.md
```


## 2. 使用说明

1. 安装依赖：
```bash
npm install
```

2. 全局安装（可选）：
```bash
npm install -g .
```

3. 使用命令：

- 初始化一个新题目：
```bash
oi-tool init a+b
```

- 强制覆盖已存在的题目：
```bash
oi-tool init a+b -f
```

- 检查题目完整性：
```bash
oi-tool check a+b
```

- 编辑题目信息：
```bash
oi-tool edit a+b
```

## 4. 功能说明

1. **初始化题目**：创建完整的题目目录结构，包括：
   - 标准程序 (src/std.cpp)
   - checker/validator/generator (使用 testlib.h)
   - 题目元数据 (problem_zh.yaml)
   - 评测配置 (testdata/config.yaml)

2. **检查功能**：验证题目完整性，包括：
   - 必需文件是否存在
   - YAML 文件格式是否正确
   - 最终打包成 zip 文件

3. **编辑功能**(开发中）：交互式编辑题目信息，包括：
   - 题目标题
   - 标签（包括洛谷难度级别）
   - 来源
4. **status**：题目目前状态
5. **package**:打包压缩成zip文件，目前支持hydrooj的格式，后期需要的话开发支持其他格式
这个工具提供了完整的生成 OI 题目的工作流，可以帮助快速创建符合标准的题目包。

## contact
工具中更新了许多功能，未在此列出，可以 使用 oimp --help 查看
19311565@qq.com