#!/usr/bin/env node

const { program } = require("commander");
const { version } = require("../package.json");

// 导入子命令
const initCommand = require("../lib/commands/init");
const { checkCommand }  = require("../lib/commands/check");
const editCommand = require("../lib/commands/edit");
const generateCommand = require("../lib/commands/genrate");
const packageCommand = require("../lib/commands/package");
const statusCommand = require("../lib/commands/status");
const testsampleCommand  = require('../lib/commands/testsample')
const watchCommand = require("../lib/commands/watch");
program
  .name("oimp")
  .description("CLI tool for generating OI problem packages")
  .version(version);

// 初始化题目命令
program
  .command("init <problem-name>")
  .description("Initialize a new OI problem")
  .option("-f, --force", "Overwrite existing directory")
  .action(initCommand);

// 检查题目完整性命令
program
  .command("check <problem-name>")
  .description("Check if the problem is complete and valid")
  .action(checkCommand);

// 编辑题目信息命令
program
  .command("edit <problem-name>")
  .description("Edit problem information (title, tags, etc.)")
  .action(editCommand);

// 打包命令
program
  .command("package <problem-name>")
  .description("package problem to zip file")
  .action(packageCommand);

// 状态命令
program
  .command("status <problem-name>")
  .description("problem status")
  .action(statusCommand);

// 状态命令
program
.command("testsample <problem-name>")
.description("problem test samples")
.action(testsampleCommand);

// 生成测试数据命令
program
  .command("generate <problem-name>")
  .description("Generate test data using validator")
  .option("-c, --count <number>", "Number of test cases to generate", parseInt)
  .action(generateCommand);

// watch命令
program
  .command("watch <problem-name>")
  .description("Watch markdown file and auto-refresh HTML preview")
  .option("-p, --port <number>", "Port number for preview server", parseInt)
  .action(watchCommand);

program.parse(process.argv);
