/**
 * 题目编辑命令：支持题目信息、标签、checker类型、时间/内存限制等交互式编辑，
 * 并允许修改题目ID（即目录名），如有变更则自动重命名目录。
 * 支持 checker 类型切换和模板文件补全，流程与 init.js 保持一致。
 */
const path = require("path");
const fs = require("fs");
const inquirer = require("inquirer");
const yaml = require("js-yaml");
const chalk = require("chalk");
const { mkdirp } = require("mkdirp");
const { getTemplate, writeFileWithDir, writeYaml, updateChecklistStatus } = require("../utils");

module.exports = async function editCommand(problemName) {
  // 1. 读取原始目录和配置
  const oldProblemDir = path.join(process.cwd(), problemName);
  const problemYamlPath = path.join(oldProblemDir, "problem.yaml");
  const testDataDir = path.join(oldProblemDir, "testdata");
  const configYamlPath = path.join(testDataDir, "config.yaml");

  // 检查目录是否存在
  if (!fs.existsSync(oldProblemDir)) {
    console.error(chalk.red(`题目目录 ${problemName} 不存在`));
    process.exit(1);
  }

  // 读取现有配置
  let currentConfig = { title: problemName, tag: ["入门"] };
  let currentLimits = { time: "1000ms", memory: "256m" };
  let currentChecker = "";
  try {
    if (fs.existsSync(problemYamlPath)) {
      const loaded = yaml.load(fs.readFileSync(problemYamlPath, "utf-8")) || {};
      currentConfig = { ...currentConfig, ...loaded };
    }
    if (fs.existsSync(configYamlPath)) {
      currentLimits = { ...currentLimits, ...(yaml.load(fs.readFileSync(configYamlPath, "utf-8")) || {}) };
    }
    // 检查 checker 类型
    const checkerPath = path.join(oldProblemDir, "src", "checker.cpp");
    if (fs.existsSync(checkerPath)) {
      // 简单猜测checker类型
      const checkerContent = fs.readFileSync(checkerPath, "utf-8");
      const checkerList = [
        "ncmp.cpp","wcmp.cpp","fcmp.cpp","rcmp.cpp","rcmp4.cpp","rcmp6.cpp","rcmp9.cpp","rncmp.cpp","uncmp.cpp","yesno.cpp","acmp.cpp","caseicmp.cpp","casencmp.cpp","casewcmp.cpp","dcmp.cpp","hcmp.cpp","icmp.cpp","lcmp.cpp","nyesno.cpp","pointscmp.cpp","pointsinfo.cpp"
      ];
      for (const c of checkerList) {
        if (checkerContent.includes(c.replace('.cpp',''))) {
          currentChecker = c;
          break;
        }
      }
    }
  } catch (e) {
    console.error(chalk.yellow("配置文件读取错误，将使用默认值:"), e.message);
  }

  // 2. 交互式编辑（题目ID、标题、标签、checker、限制等）
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "newProblemName",
      message: "题目ID（可修改，修改后将重命名目录）:",
      default: problemName,
      validate: (input) => input && input.trim() ? true : "题目ID不能为空"
    },
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
        { name: "基础算法", value: "基础算法" },
        { name: "字符串", value: "字符串" },
        { name: "其他", value: "其他" },
      ],
      default: currentConfig.tag,
    },
    {
      type: "input",
      name: "othertag",
      message: "其他分类标签(用空格或,分割多个)：",
      default: "",
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

  // 3. checker类型选择
  const checkerType = await inquirer.prompt([
    {
      type: "list",
      name: "selectedChecker",
      message: "请选择需要的Checker 类型：",
      choices: [
        { name: "ncmp (标准比较器：逐字节对比用户输出和标准答案，但会忽略行末空格和文件末尾的多余换行)", value: "ncmp.cpp" },
        { name: "wcmp (比较两个单词序列，按顺序逐个比较单词，若某对单词不同或序列长度不同，则判定为答案错误；否则判定为答案正确。)", value: "wcmp.cpp" },
        { name: "fcmp (将文件按行作为字符串序列进行比较，若某行内容不同，则判定为答案错误；否则判定为答案正确。)", value: "fcmp.cpp" },
        { name: "rcmp (比较两个双精度浮点数，允许最大绝对误差为 1.5E-6。若误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "rcmp.cpp" },
        { name: "rcmp4 (比较两个双精度浮点数序列，允许最大绝对或相对误差为 1E-4。若某对元素误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "rcmp4.cpp" },
        { name: "rcmp6 (比较两个双精度浮点数序列，允许最大绝对或相对误差为 1E-6。若某对元素误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "rcmp6.cpp" },
        { name: "rcmp9 (比较两个双精度浮点数序列，允许最大绝对或相对误差为 1E-9。若某对元素误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "rcmp9.cpp" },
        { name: "rncmp (比较两个双精度浮点数序列，允许最大绝对误差为 1.5E-5。若某对元素误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "rncmp.cpp" },
        { name: "uncmp (比较两个无序的有符号长整型序列，会先排序再比较，若序列长度或元素不同，则判定为错误。)", value: "uncmp.cpp" },
        { name: 'yesno (检查输入是否为 "YES" 或 "NO" （大小写不敏感），若输入不符合要求或与答案不一致，则判定为错误。)', value: "yesno.cpp" },
        { name: "acmp (比较两个双精度浮点数，允许最大绝对误差为 1.5E-6。若误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "acmp.cpp" },
        { name: "caseicmp (带有测试用例支持的单 int64 检查器，用于比较两个有序的 int64 序列，若序列长度不同或对应元素不同，则判定为错误。)", value: "caseicmp.cpp" },
        { name: 'casencmp (用于比较输出和答案的格式为 "Case X: <number> <number> ..." 的情况，按测试用例逐行比较长整型序列。)', value: "casencmp.cpp" },
        { name: 'casewcmp (用于比较输出和答案的格式为 "Case X: <token> <token> ..." 的情况，按测试用例逐行比较字符串序列。)', value: "casewcmp.cpp" },
        { name: "dcmp (比较两个双精度浮点数，允许最大绝对或相对误差为 1E-6。若误差超过该值，判定为答案错误；否则判定为答案正确。)", value: "dcmp.cpp" },
        { name: "hcmp (比较两个有符号的大整数，会先检查输入是否为有效的整数格式，若格式错误或数值不同，则判定为错误。)", value: "hcmp.cpp" },
        { name: "icmp (比较两个有符号的整数，若两个整数不相等，则判定为答案错误；否则判定为答案正确。)", value: "icmp.cpp" },
        { name: "lcmp (将文件按行拆分为单词序列进行比较，若某行的单词序列不同，则判定为答案错误；否则判定为答案正确。)", value: "lcmp.cpp" },
        { name: "ncmp (比较两个有序的有符号长整型序列，会检查序列长度和对应元素是否相同，若不同则判定为错误。)", value: "ncmp.cpp" },
        { name: 'nyesno (用于检查多个 "YES" 或 "NO" （大小写不敏感）的输入，会统计 "YES" 和 "NO" 的数量，若输入不符合要求或与答案不一致，则判定为错误。)', value: "nyesno.cpp" },
        { name: "pointscmp (示例得分检查器，通过比较两个双精度浮点数的差值来给出得分。)", value: "pointscmp.cpp" },
        { name: "pointsinfo (示例带有 points_info 的检查器，读取两个双精度浮点数，记录相关信息并退出。)", value: "pointsinfo.cpp" },
      ],
      default: currentChecker || "wcmp.cpp",
    },
  ]);

  // 4. 题目ID变更处理（如有变更则重命名目录）
  let newProblemDir = oldProblemDir;
  if (answers.newProblemName !== problemName) {
    newProblemDir = path.join(process.cwd(), answers.newProblemName);
    if (fs.existsSync(newProblemDir)) {
      console.error(chalk.red(`目标目录 ${answers.newProblemName} 已存在，无法重命名。`));
      process.exit(1);
    }
    fs.renameSync(oldProblemDir, newProblemDir);
    console.log(chalk.green(`题目目录已重命名为: ${answers.newProblemName}`));
  }

  // 5. 标签处理
  let tags = answers.tags.filter((item) => item !== "");
  if (answers.othertag) {
    answers.othertag.split(/[\s,，;]+/).forEach((el) => {
      if (el && !tags.includes(el)) tags.push(el);
    });
  }

  // 6. 写入/更新 problem.yaml
  const updatedConfig = {
    title: answers.title,
    tag: tags,
  };
  writeYaml(path.join(newProblemDir, "problem.yaml"), updatedConfig);

  // 7. 写入/更新 testdata/config.yaml
  const updatedLimits = {
    time: answers.time.replace(/\s/g, "").toLowerCase(),
    memory: answers.memory.replace(/\s/g, "").toLowerCase(),
  };
  writeYaml(path.join(newProblemDir, "testdata", "config.yaml"), updatedLimits);

  // 8. 生成/更新 status.json
const statusFileName = path.resolve(newProblemDir, "status.json");
let problemStatus = {};
if (fs.existsSync(statusFileName)) {
  problemStatus = JSON.parse(fs.readFileSync(statusFileName, 'utf-8'));
}
const standardKeys = [
  ['problem', '题面'],
  ['std', '标准程序'],
  ['generator', '数据生成器'],
  ['validator', '数据验证器'],
  ['data', '测评数据'],
  ['check', '完整性检查'],
  ['package', '打包']
];
for (const [k, desc] of standardKeys) {
  if (!problemStatus[k]) problemStatus[k] = { desc, status: 'pending' };
}
try {
  fs.writeFileSync(statusFileName, JSON.stringify(problemStatus), "utf-8");
} catch (e) {
  console.error(chalk.red("写入题目状态文件失败:"), e.message);
  process.exit(1);
}
  // 保存后统一推进 checklist 状态

  // 9. 检查并补全模板文件（如 generator、validator、checker、testlib.h、solution/stdsol.md 等）
  const templates = {
    "src/std.cpp": "std.cpp",
    "problem_zh.md": "problem_zh.md",
    "src/generator.cpp": "generator.cpp",
    "src/validator.cpp": "validator.cpp",
    "src/testlib.h": "testlib.h",
    "solution/stdsol.md": "solution/stdsol.md",
    // checker.cpp 总是覆盖为新模板
    "src/checker.cpp": `checkers/${checkerType.selectedChecker}`,
  };
  for (const [filePath, templateName] of Object.entries(templates)) {
    const absPath = path.join(newProblemDir, filePath);
    // checker.cpp 总是覆盖，其他文件只补全缺失
    if (filePath === "src/checker.cpp" || !fs.existsSync(absPath)) {
      writeFileWithDir(absPath, getTemplate(templateName));
      console.log(chalk.green(`已补全/覆盖模板文件: ${filePath}`));
    }
  }

  // 自动补全 sample 目录和样例文件
  const sampleDir = path.join(newProblemDir, 'sample');
  if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir);
  const sampleIn = path.join(sampleDir, 'sample01.in');
  const sampleAns = path.join(sampleDir, 'sample01.ans');
  if (!fs.existsSync(sampleIn)) fs.writeFileSync(sampleIn, '');
  if (!fs.existsSync(sampleAns)) fs.writeFileSync(sampleAns, '');
  console.log(chalk.green('已补全 sample 目录和样例文件'));

  // 10. 完成提示
  console.log(chalk.green(`\n题目 "${answers.newProblemName}" 信息已更新！`));
  console.log(chalk.blue(`目录结构: ${newProblemDir}`));
  console.log(chalk.yellow("接下来您可以:"));
  console.log("1. 编辑 problem_zh.md 编写题面");
  console.log("2. 编写 src/std.cpp 标准程序,可以在src中加入std开头的其他c++文件进行TLE、WA等的测评");
  console.log("3. 编写 src/checker.cpp Special Judge程序");
  console.log("4. 编写 src/generator.cpp 数据生成器");
  console.log("5. 编写 src/validator.cpp 输入验证器");
  console.log("6. 编写 solution/stdsol.md 题解");
  console.log("7. 使用 oimp check 检查题目");
  console.log("8. 使用 oimp package 打包题目，生成对应格式的zip压缩包");
  console.log(chalk.cyan(`如需生成测评数据：oimp gendata ${answers.newProblemName}，如需检查完整性：oimp check ${answers.newProblemName}，如需打包：oimp package ${answers.newProblemName}`));

  // 记录关键文件的 mtime
  const snapshotDir = path.join(newProblemDir, '.snapshots');
  const mtimePath = path.join(snapshotDir, 'file-mtime.json');
  const files = [
    'src/generator.cpp',
    'src/validator.cpp',
    'src/std.cpp',
    'src/checker.cpp'
  ].map(f => path.join(newProblemDir, f));
  let mtimeInfo = {};
  for (const file of files) {
    if (fs.existsSync(file)) {
      mtimeInfo[path.basename(file)] = fs.statSync(file).mtimeMs;
    }
  }
  fs.writeFileSync(mtimePath, JSON.stringify(mtimeInfo, null, 2));
  console.log(chalk.green('已更新 .snapshots/file-mtime.json'));
};
