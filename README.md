# oimp - OI 题目生成工具

## 简介
`oimp` 是一个基于 Node.js 开发的命令行工具，旨在帮助用户快速创建、管理和打包 OI（信息学奥林匹克）题目。它提供了一套完整的工作流，涵盖了从题目初始化、信息编辑、测试数据生成到最终打包的各个环节，大大提高了 OI 题目制作的效率。

## 项目结构
```
oimp/
├── bin/
│   └── oimp.js        # 命令行入口
├── lib/
│   ├── commands/         # 各个子命令
│   │   ├── init.js
│   │   ├── check.js
│   │   ├── edit.js
│   │   ├── generate.js
│   │   ├── status.js
│   │   └── package.js
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

## 安装
### 安装依赖
在项目根目录下运行以下命令安装所需的依赖：
```bash
npm install
```

### 全局安装（可选）
如果你希望在任何位置都能使用 `oimp` 命令，可以进行全局安装：
```bash
npm install -g .
```
不下载直接安装
```bash
npm install oimp -g
```

## 使用方法
### 初始化一个新题目
```bash
oimp init <problemName>
```
该命令会创建一个新的题目目录，包含标准程序、checker、validator、generator、题目元数据和评测配置等文件。如果目录已存在，可以使用 `-f` 选项强制覆盖：
```bash
oimp init <problemName> -f
```

### 检查题目完整性
```bash
oimp check <problemName>
```
此命令会验证题目所需的文件是否存在，YAML 文件格式是否正确，并尝试编译和运行测试用例，确保题目完整可用。

### 编辑题目信息
```bash
oimp edit <problemName>
```
通过交互式界面，你可以编辑题目标题、标签、时间限制和内存限制等信息。

### 生成测试用例
```bash
oimp generate <problemName> -c <count>
```
`-c` 选项指定要生成的测试用例数量，默认为 10。该命令会编译必要的组件，生成并验证测试数据。

### 查看题目状态
```bash
oimp status <problemName>
```
显示题目目前的状态，包括目录是否完整、输入数据是否验证、评测数据是否生成、是否检查完整等。

### 打包题目
```bash
oimp package <problemName>
```
将题目打包成 zip 文件，目前支持 hydrooj 格式。打包前会检查题目是否已完成检查。

## 功能详细说明
### 初始化题目
- 创建完整的题目目录结构，包括标准程序、checker、validator、generator 等文件。
- 交互式询问题目信息，如标题、标签、内存限制和时间限制等。
- 支持选择不同类型的 checker。
- 生成题目状态文件 `status.json`。

### 检查功能
- 验证题目所需的文件是否存在。
- 编译必要的组件，如 checker 和标准程序。
- 运行测试用例，检查程序的正确性。
- 更新题目状态文件，标记题目是否通过检查。

### 编辑功能
- 允许用户通过交互式界面编辑题目标题、标签、时间限制和内存限制等信息。
- 读取和写入 YAML 配置文件，确保信息的持久化。

### 生成测试用例
- 编译 generator、validator 和标准程序。
- 生成指定数量的测试用例，并进行验证。
- 确保生成的测试数据符合要求。

### 查看题目状态
- 读取题目状态文件 `status.json`，显示题目目前的状态。
- 提示用户是否可以进行打包操作。

### 打包功能
- 支持将题目打包成 hydrooj 格式的 zip 文件。
- 合并 solution 中的文件，生成 `solution.md`。
- 检查题目是否已完成检查，确保打包的题目可用。

## 联系信息
如果你在使用过程中遇到问题或有任何建议，请联系：19311565@qq.com

## 许可证
本项目采用 MIT 许可证，详细信息请查看 [LICENSE](LICENSE) 文件。