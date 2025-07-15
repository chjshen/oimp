const path = require("path");
const fs = require("fs");
const inquirer = require("inquirer");
const yaml = require("js-yaml");
const chalk = require("chalk");
const { mkdirp } = require("mkdirp");

module.exports = async function editCommand(problemName) {
  const problemDir = path.join(process.cwd(), problemName);
  const problemYamlPath = path.join(problemDir, "problem.yaml");
  const testDataDir = path.join(problemDir, "testdata");
  const configYamlPath = path.join(testDataDir, "config.yaml");

  // 检查目录是否存在，不存在则创建
  if (!fs.existsSync(problemDir)) {
    console.error(chalk.red(`题目目录 ${problemName} 不存在`));
    process.exit(1);
  }

  // 确保testdata目录存在
  await mkdirp(testDataDir);

  // 默认配置
  const defaultConfig = {
    title: `「${problemName}」`,
    tag: ["入门"],
  };

  const defaultLimits = {
    time: "1000ms",
    memory: "256m",
  };

  // 读取现有配置（文件不存在则使用默认值）
  let currentConfig = { ...defaultConfig };
  let currentLimits = { ...defaultLimits };

  try {
    if (fs.existsSync(problemYamlPath)) {
      currentConfig = {
        ...defaultConfig,
        ...(yaml.load(fs.readFileSync(problemYamlPath, "utf-8")) || {}),
      };
    }

    if (fs.existsSync(configYamlPath)) {
      currentLimits = {
        ...defaultLimits,
        ...(yaml.load(fs.readFileSync(configYamlPath, "utf-8")) || {}),
      };
    }
  } catch (e) {
    console.error(chalk.yellow("配置文件读取错误，将使用默认值:"), e.message);
  }

  // 交互式编辑
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "title",
      message: "题目标题:",
      default: currentConfig.title,
    },
    {
      type: "checkbox",
      name: "tags",
      message: "题目标签:",
      choices: [
        { name: "入门", value: "入门" },
        { name: "普及-", value: "普及-" },
        { name: "普及/提高-", value: "普及/提高-" },
        { name: "普及+/提高", value: "普及+/提高" },
        { name: "提高+/省选-", value: "提高+/省选-" },
        { name: "省选/NOI-", value: "省选/NOI-" },
        { name: "NOI/NOI+/CTSC", value: "NOI/NOI+/CTSC" },
        new inquirer.Separator(),
        { name: "动态规划", value: "动态规划" },
        { name: "图论", value: "图论" },
        { name: "数据结构", value: "数据结构" },
        { name: "数学", value: "数学" },
        { name: "字符串", value: "字符串" },
      ],
      default: currentConfig.tag,
    },
    {
      type: "input",
      name: "time",
      message: "时间限制 (如1000ms):",
      default: currentLimits.time,
      validate: (input) =>
        /^\d+[sm]s?$/i.test(input) || "格式应为数字+ms/s (如1000ms或1s)",
    },
    {
      type: "input",
      name: "memory",
      message: "内存限制 (如256m):",
      default: currentLimits.memory,
      validate: (input) =>
        /^\d+[kmg]b?$/i.test(input) || "格式应为数字+k/m/g (如256m或1g)",
    },
  ]);

  // 准备写入的数据
  const updatedConfig = {
    title: answers.title,
    tag: answers.tags,
  };

  const updatedLimits = {
    time: answers.time.replace(/\s/g, "").toLowerCase(),
    memory: answers.memory.replace(/\s/g, "").toLowerCase(),
  };

  try {
    // 写入文件（不存在则创建）
    fs.writeFileSync(problemYamlPath, yaml.dump(updatedConfig));
    fs.writeFileSync(configYamlPath, yaml.dump(updatedLimits));

    console.log(chalk.green("\n题目信息已保存！"));
    console.log(chalk.blue("→ problem.yaml:"), updatedConfig);
    console.log(chalk.blue("→ testdata/config.yaml:"), updatedLimits);
  } catch (err) {
    console.error(chalk.red("文件保存失败:"), err.message);
    process.exit(1);
  }
};
